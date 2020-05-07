import vnode, { VNode } from './vnode';
import htmlDomApi, { DOMAPI } from './htmldomapi';

// 将真实 dom 转换成 vnode
export function toVNode (node: Node, domApi?: DOMAPI): VNode {
  // 定义 api, 如果为空，穿透赋值二次封装的 htmlDomApi
  const api: DOMAPI = domApi !== undefined ? domApi : htmlDomApi;
  let text: string;
  
  // 如果 node 是元素节点
  if (api.isElement(node)) {
    // 拿到 node 的 id class
    const id = node.id ? '#' + node.id : '';
    const cn = node.getAttribute('class');
    const c = cn ? '.' + cn.split(' ').join('.') : '';
    // 处理 sel 字符串，作为为 node 标识，tagName + id + class，etc: div#id#class
    const sel = api.tagName(node).toLowerCase() + id + c;
    // 定义 children 变量
    const children: VNode[] = [];
    let name: string;
    let i: number, n: number;
    // 定义 elmAttrs 变量，attributes 为类数组
    const elmAttrs = node.attributes;
    // 定义 elmChildren 变量，获取 childNodes NodeList 类数组
    const elmChildren = node.childNodes;
    // 将 elmAttrs 类数组转成 Object 对象 { [nodeName]: [nodeValue] }
    for (i = 0, n = elmAttrs.length; i < n; i++) {
      // 获取 node name，也就是 attr key
      name = elmAttrs[i].nodeName;
      // 排除为 id class 情况
      if (name !== 'id' && name !== 'class') {
        attrs[name] = elmAttrs[i].nodeValue;
      }
    }
    // 递归调用 toVNode，将 children 转成 vnode
    for (i = 0, n = elmChildren.length; i < n; i++) {
      children.push(toVNode(elmChildren[i], domApi));
    }
    // 返回处理后的 vnode
    return vnode(sel, { attrs }, children, undefined, node);
  } else if (api.isText(node)) {
    // 如果 node 是文本节点，获取 textContent 返回
    text = api.getTextContent(node) as string;
    return vnode(undefined, undefined, undefined, text, node);
  } else if (api.isComment(node)) {
    // 如果 node 是注释节点，返回类型 sel 为 '!' 的 vnode
    text = api.getTextContent(node) as string;
    return vnode('!', {}, [], text, node as any);
  } else {
    // 其他类型，返回空的 vnode
    return vnode('', {}, [], undefined, node as any);
  }
}

export default toVNode;
