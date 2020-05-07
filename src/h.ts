import { vnode, VNode, VNodeData } from './vnode';
import * as is from './is';

export type VNodes = VNode[];
export type VNodeChildElement = VNode | string | number | undefined | null;
export type ArrayOrElement<T> = T | T[];
export type VNodeChildren = ArrayOrElement<VNodeChildElement>;

// 处理 svg 函数
function addNS (data: any, children: VNodes | undefined, sel: string | undefined): void {
  data.ns = 'http://www.w3.org/2000/svg';
  if (sel !== 'foreignObject' && children !== undefined) {
    for (let i = 0; i < children.length; ++i) {
      const childData = children[i].data;
      if (childData !== undefined) {
        addNS(childData, (children[i] as VNode).children as VNodes, children[i].sel);
      }
    }
  }
}

// 函数重载
export function h(sel: string): VNode;
export function h(sel: string, data: VNodeData | null): VNode;
export function h(sel: string, children: VNodeChildren): VNode;
export function h(sel: string, data: VNodeData | null, children: VNodeChildren): VNode;
export function h (sel: any, b?: any, c?: any): VNode {
  var data: VNodeData = {};
  var children: any;
  var text: any;
  var i: number;
  // 对传入的 b c 进行判断
  if (c !== undefined) {
    if (b !== null) {
      // b && c 设置 data 为 b
      data = b;
    }
    // c 是 array，设置 children 为 c
    if (is.array(c)) {
      children = c;
    } else if (is.primitive(c)) {
      // number or string 设置 text 为 c
      text = c;
    } else if (c && c.sel) {
      // 有 sel key 值，设置成 children
      children = [c];
    }
  } else if (b !== undefined && b !== null) {
    // c 为 undefined，处理 b 的一些边界情况，同上
    if (is.array(b)) {
      children = b;
    } else if (is.primitive(b)) {
      text = b;
    } else if (b && b.sel) {
      children = [b];
    } else { data = b; }
  }
  // children 不为空
  if (children !== undefined) {
    // 遍历 children 将 children 类型为 number or string 的子节点转换成 vnode
    for (i = 0; i < children.length; ++i) {
      if (is.primitive(children[i])) children[i] = vnode(undefined, undefined, undefined, children[i], undefined);
    }
  }
  // 对于 svg 的特殊处理
  if (
    sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g' &&
    (sel.length === 3 || sel[3] === '.' || sel[3] === '#')
  ) {
    addNS(data, children, sel);
  }
  // 返回 vnode 对象
  return vnode(sel, data, children, text, undefined);
};
export default h;
