import { Module } from './modules/module';
import vnode, { VNode } from './vnode';
import * as is from './is';
import htmlDomApi, { DOMAPI } from './htmldomapi';

type NonUndefined<T> = T extends undefined ? never : T;

function isUndef (s: any): boolean {
  return s === undefined;
}
function isDef<A> (s: A): s is NonUndefined<A> {
  return s !== undefined;
}

type VNodeQueue = VNode[];

const emptyNode = vnode('', {}, [], undefined, undefined);

// 通过 key && sel 判断是否为同一节点 (只比较同层节点)
function sameVnode (vnode1: VNode, vnode2: VNode): boolean {
  return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
}

// 通过 sel key 判断是否有为 vnode
function isVnode (vnode: any): vnode is VNode {
  return vnode.sel !== undefined;
}

type KeyToIndexMap = {[key: string]: number};

type ArraysOf<T> = {
  [K in keyof T]: Array<T[K]>;
};

type ModuleHooks = ArraysOf<Required<Module>>;

// 将 children 数组的 key 转成 map { [key]: [i] }
function createKeyToOldIdx (children: VNode[], beginIdx: number, endIdx: number): KeyToIndexMap {
  const map: KeyToIndexMap = {};
  for (let i = beginIdx; i <= endIdx; ++i) {
    const key = children[i]?.key;
    if (key !== undefined) {
      map[key] = i;
    }
  }
  return map;
}

// 生命周期钩子数组
const hooks: Array<keyof Module> = ['create', 'update', 'remove', 'destroy', 'pre', 'post'];

export { h } from './h';
export { thunk } from './thunk';

/**
  * var snabbdom = require('snabbdom');
  * var patch = snabbdom.init([ // Init patch function with chosen modules
  *   require('snabbdom/modules/class').default, // makes it easy to toggle classes
  *   require('snabbdom/modules/props').default, // for setting properties on DOM elements
  *   require('snabbdom/modules/style').default, // handles styling on elements with support for animations
  *   require('snabbdom/modules/eventlisteners').default, // attaches event listeners
  * ]);
  */

// 主逻辑，snabbdom.init 初始化函数
export function init (modules: Array<Partial<Module>>, domApi?: DOMAPI) {
  let i: number;
  let j: number;
  // 定义 cbs 钩子函数集合
  const cbs: ModuleHooks = {
    create: [],
    update: [],
    remove: [],
    destroy: [],
    pre: [],
    post: []
  };

  // 定义 api, 如果为空，穿透赋值二次封装的 htmlDomApi
  const api: DOMAPI = domApi !== undefined ? domApi : htmlDomApi;
  // 遍历钩子数组 [ { create, update } ]，将初始化传入的 modules 钩子函数 push 到对应的 钩子函数队列
  for (i = 0; i < hooks.length; ++i) {
    // cbs.create = []
    cbs[hooks[i]] = [];
    for (j = 0; j < modules.length; ++j) {
      // etc: class: { create: fn, update: fn }
      const hook = modules[j][hooks[i]];
      if (hook !== undefined) {
        // etc: cbs.create = [ class.create ]
        (cbs[hooks[i]] as any[]).push(hook);
      }
    }
  }

  // 将真实 dom 转成空的 vnode
  function emptyNodeAt (elm: Element) {
    const id = elm.id ? '#' + elm.id : '';
    const c = elm.className ? '.' + elm.className.split(' ').join('.') : '';
    return vnode(api.tagName(elm).toLowerCase() + id + c, {}, [], undefined, elm);
  }

  // 创建 remove 回调函数，createRmCb 返回一个函数，调用该函数可移除该 dom
  function createRmCb (childElm: Node, listeners: number) {
    return function rmCb () {
      if (--listeners === 0) {
        const parent = api.parentNode(childElm) as Node;
        api.removeChild(parent, childElm);
      }
    };
  }

  // 将 vnode 转换成 真实 dom
  function createElm (vnode: VNode, insertedVnodeQueue: VNodeQueue): Node {
    let i: any;
    let data = vnode.data;
    if (data !== undefined) {
      // 获取 data.hook.init 钩子，非空就调用，并更新 data
      const init = data.hook?.init;
      if (isDef(init)) {
        init(vnode);
        data = vnode.data;
      }
    }
    const children = vnode.children;
    const sel = vnode.sel;
    // 如果是注释节点，设置注释 elm 为注释 dom
    if (sel === '!') {
      if (isUndef(vnode.text)) {
        vnode.text = '';
      }
      vnode.elm = api.createComment(vnode.text!);
    } else if (sel !== undefined) {
      // Parse selector
      const hashIdx = sel.indexOf('#');
      const dotIdx = sel.indexOf('.', hashIdx);
      const hash = hashIdx > 0 ? hashIdx : sel.length;
      const dot = dotIdx > 0 ? dotIdx : sel.length;
      const tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
      // 创建 HTML 元素 (ns 用来处理 svg 函数）
      const elm = vnode.elm = isDef(data) && isDef(i = data.ns)
        ? api.createElementNS(i, tag)
        : api.createElement(tag);
      // 设置 id class
      if (hash < dot) elm.setAttribute('id', sel.slice(hash + 1, dot));
      if (dotIdx > 0) elm.setAttribute('class', sel.slice(dot + 1).replace(/\./g, ' '));
      for (i = 0; i < cbs.create.length; ++i) cbs.create[i](emptyNode, vnode);
      // 如果有子元素
      if (is.array(children)) {
        for (i = 0; i < children.length; ++i) {
          const ch = children[i];
          if (ch != null) {
            // 递归调用 createElm 插入子节点
            api.appendChild(elm, createElm(ch as VNode, insertedVnodeQueue));
          }
        }
      } else if (is.primitive(vnode.text)) {
        // 如果是文本节点，调用 createTextNode 插入
        api.appendChild(elm, api.createTextNode(vnode.text));
      }
      // 拿到 vnode 的 hook 钩子对象
      const hook = vnode.data!.hook;
      if (isDef(hook)) {
        // 如果存在 create 函数执行
        hook.create?.(emptyNode, vnode);
        // 如果存在 insert 钩子，推入 insertedVnodeQueue 队列
        if (hook.insert) {
          insertedVnodeQueue.push(vnode);
        }
      }
    } else {
      // 排除注释节点，vnode，为文本节点
      vnode.elm = api.createTextNode(vnode.text!);
    }
    // 返回真实 dom
    return vnode.elm;
  }

  // 将 vnode 转换成真实 dom，并通过 insertBefore 入父节点
  function addVnodes (
    parentElm: Node,
    before: Node | null,
    vnodes: VNode[],
    startIdx: number,
    endIdx: number,
    insertedVnodeQueue: VNodeQueue
  ) {
    for (; startIdx <= endIdx; ++startIdx) {
      // 循环，调用 insertBefore 插入父节点
      const ch = vnodes[startIdx];
      if (ch != null) {
        api.insertBefore(parentElm, createElm(ch, insertedVnodeQueue), before);
      }
    }
  }

  // remove 的时候调用销毁钩子函数
  function invokeDestroyHook (vnode: VNode) {
    const data = vnode.data;
    if (data !== undefined) {
      // 如果存在 data.hook.destroy.vnode 并调用 destroy 函数，也就是触发该节点的 destroy 回调
      data?.hook?.destroy?.(vnode);
      // 触发全局 destroy 钩子
      for (let i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode);
      if (vnode.children !== undefined) {
        for (let j = 0; j < vnode.children.length; ++j) {
          const child = vnode.children[j];
          if (child != null && typeof child !== 'string') {
            // 递归触发子节点 destroy 钩子
            invokeDestroyHook(child);
          }
        }
      }
    }
  }

  // 删除 vnode
  function removeVnodes (parentElm: Node,
    vnodes: VNode[],
    startIdx: number,
    endIdx: number): void {
    for (; startIdx <= endIdx; ++startIdx) {
      let listeners: number;
      let rm: () => void;
      const ch = vnodes[startIdx];
      if (ch != null) {
        if (isDef(ch.sel)) {
          // 删除前调用销毁钩子函数触发 destroy 回调
          invokeDestroyHook(ch);
          // 计算 listeners 钩子数量
          listeners = cbs.remove.length + 1;
          // 调用 createRmCb 函数，返回移除该 dom 的回调函数 rm
          rm = createRmCb(ch.elm!, listeners);
          // 循环调用全局 remove 钩子函数
          for (let i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm);
          const removeHook = ch?.data?.hook?.remove;
          // 从 ch.data.hook.remove 获取 remove 函数，有则调用，没有则调用 rm 直接移除 dom
          if (isDef(removeHook)) {
            removeHook(ch, rm);
          } else {
            rm();
          }
        } else { // Text node
          api.removeChild(parentElm, ch.elm!);
        }
      }
    }
  }

  // diff 算法，更新子节点
  function updateChildren (parentElm: Node,
    oldCh: VNode[],
    newCh: VNode[],
    insertedVnodeQueue: VNodeQueue) {
    let oldStartIdx = 0;
    let newStartIdx = 0;
    let oldEndIdx = oldCh.length - 1;
    let oldStartVnode = oldCh[0];
    let oldEndVnode = oldCh[oldEndIdx];
    let newEndIdx = newCh.length - 1;
    let newStartVnode = newCh[0];
    let newEndVnode = newCh[newEndIdx];
    let oldKeyToIdx: KeyToIndexMap | undefined;
    let idxInOld: number;
    let elmToMove: VNode;
    let before: any;

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (oldStartVnode == null) {
        oldStartVnode = oldCh[++oldStartIdx]; // Vnode might have been moved left
      } else if (oldEndVnode == null) {
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (newStartVnode == null) {
        newStartVnode = newCh[++newStartIdx];
      } else if (newEndVnode == null) {
        newEndVnode = newCh[--newEndIdx];
      // 以上是处理一些非空判断
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        // oldStartVnode newStartVnode 相似，进行 patchVnode，start 下标后移
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        // oldEndVnode newEndVnode 相似，进行 patchVnode，start 下标前移
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        // oldStartVnode newEndVnode 相似
        /**
         * | 🟩 | O | O | O | O |         | 🟩 | O | O | O | O |
         *   |_________________      =>    
         *                    |
         * | O | O | O | O | 🟥 |         | O | O | O | O | 🟥 | 🟩 |
         */
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
        // 将 oldStartVnode.elm 插入到 oldEndVnode.elm 下一个兄弟元素之前
        // oldStartVnode 后移，newEndVnode 前移
        api.insertBefore(parentElm, oldStartVnode.elm!, api.nextSibling(oldEndVnode.elm!));
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        // oldStartVnode newEndVnode 相似
         /**
         * | O | O | O | O | 🟩 |         | O | O | O | O | 🟩 |
         *    _______________|      =>    
         *   |                
         * | 🟥 | O | O | O | O |         | 🟩 | 🟥 | O | O | O | O |
         */
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
         // 将 oldEndVnode.elm 插入到 oldStartVnode.elm 之前
        // oldStartVnode 后移，newEndVnode 前移
        api.insertBefore(parentElm, oldEndVnode.elm!, oldStartVnode.elm!);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
        // 如果没有 oldKeyToIdx map 索引表，进行创建
        if (oldKeyToIdx === undefined) {
          oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
        }
        // { [key]: [i] } 也就是根据 key 找到 index，新节点在旧的 map 的下标
        idxInOld = oldKeyToIdx[newStartVnode.key as string];
        // 如果没有，则代表新建元素，插入旧节点之前
        if (isUndef(idxInOld)) { // New element
          api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm!);
        } else {
          // 如果有代表移动 dom，记录 elmToMove 旧的 dom
          elmToMove = oldCh[idxInOld];
          // 判断 sel node 标识，如果不同代表不同元素 (etc: div#id#class) ，进行向前插入操作
          if (elmToMove.sel !== newStartVnode.sel) {
            api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm!);
          } else {
            // 不同元素进行 patch，并将 oldCh[idxInOld] 置为 undefined，代表已遍历
            patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
            oldCh[idxInOld] = undefined as any;
            // 将旧元素插入到 oldStartVnode 之前
            api.insertBefore(parentElm, elmToMove.elm!, oldStartVnode.elm!);
          }
        }
        // newStartVnode 后移
        newStartVnode = newCh[++newStartIdx];
      }
    }
    // 新旧下标相交 ？
    if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
      // 旧开始下标大于旧结束下标，代表遍历完毕
      if (oldStartIdx > oldEndIdx) {
        before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm;
        addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
      } else {
        // 遍历完成后，删除剩余旧节点
        removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
      }
    }
  }

  // 补丁函数
  function patchVnode (oldVnode: VNode, vnode: VNode, insertedVnodeQueue: VNodeQueue) {
    const hook = vnode.data?.hook;
    hook?.prepatch?.(oldVnode, vnode);
    const elm = vnode.elm = oldVnode.elm!;
    const oldCh = oldVnode.children as VNode[];
    const ch = vnode.children as VNode[];
    /// 如果为同一节点，返回 （这里比较的是对象的指针）
    if (oldVnode === vnode) return;
    // vnode.data 不为空
    if (vnode.data !== undefined) {
      // 先循环调用全局 update 钩子，然后调用 vnode 的 update 钩子
      for (let i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode);
      vnode.data.hook?.update?.(oldVnode, vnode);
    }
    // 如果不是文本节点
    if (isUndef(vnode.text)) {
      // 如果新旧节点的字节点都存在，并不相等，调用 updateChildren diff 子节点
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue);
      // 只存在新节点的子节点
      } else if (isDef(ch)) {
        // 为文本节点，设置 elm 为空
        if (isDef(oldVnode.text)) api.setTextContent(elm, '');
        // 调用 addVnodes 插入 vnode
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
      // 只存在旧节点的子节点，移出 oldCh
      } else if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
      // 新旧节点都没有子节点，设置新节点的 elm 为空
      } else if (isDef(oldVnode.text)) {
        api.setTextContent(elm, '');
      }
    // 是文本节点并且 text 不同
    } else if (oldVnode.text !== vnode.text) {
      if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
      }
      // 更新 vnode 的 text
      api.setTextContent(elm, vnode.text!);
    }
    // 触发 vnode 的 postpatch 钩子
    hook?.postpatch?.(oldVnode, vnode);
  }

  // 初始化后返回的 patch 函数
  // 初始化为真实 dom，后为 patch 比较
  return function patch (oldVnode: VNode | Element, vnode: VNode): VNode {
    let i: number, elm: Node, parent: Node;
    const insertedVnodeQueue: VNodeQueue = [];
    // 调用全局 pre 钩子函数
    for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]();

    // 如果 oldVnode 不是 vnode，调用 emptyNodeAt 转换成 vnode
    if (!isVnode(oldVnode)) {
      oldVnode = emptyNodeAt(oldVnode);
    }

    // 如果新旧节点相似，进行 patch node
    if (sameVnode(oldVnode, vnode)) {
      patchVnode(oldVnode, vnode, insertedVnodeQueue);
    } else {
      elm = oldVnode.elm!;
      // 得到 oldVnode
      parent = api.parentNode(elm) as Node;

      // 设置 vnode.elm 真实 dom
      createElm(vnode, insertedVnodeQueue);

      if (parent !== null) {
        // 插入调用 createElm 后生成的真实 dom，并移除旧节点
        api.insertBefore(parent, vnode.elm!, api.nextSibling(elm));
        removeVnodes(parent, [oldVnode], 0, 0);
      }
    }

    // 循环调用被插入 vnode 的 insert 钩子
    for (i = 0; i < insertedVnodeQueue.length; ++i) {
      insertedVnodeQueue[i].data!.hook!.insert!(insertedVnodeQueue[i]);
    }
    // 调用全局 post 钩子
    for (i = 0; i < cbs.post.length; ++i) cbs.post[i]();
    return vnode;
  };
}
