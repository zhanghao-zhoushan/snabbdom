import { Hooks } from './hooks';
import { AttachData } from './helpers/attachto';
import { VNodeStyle } from './modules/style';
import { On } from './modules/eventlisteners';
import { Attrs } from './modules/attributes';
import { Classes } from './modules/class';
import { Props } from './modules/props';
import { Dataset } from './modules/dataset';
import { Hero } from './modules/hero';

export type Key = string | number;

// 定义 VNode 数据类型
export interface VNode {
  sel: string | undefined // vnode 选择器
  data: VNodeData | undefined // VNodeData 数据
  children: Array<VNode | string> | undefined // 子节点
  elm: Node | undefined // 储存真实 dom
  text: string | undefined // text 文本 etc: <div>text</div>
  key: Key | undefined // vnode key 在 diff 过程中使用
}

// 定义 VNodeData 数据类型
export interface VNodeData {
  props?: Props
  attrs?: Attrs
  class?: Classes
  style?: VNodeStyle
  dataset?: Dataset
  on?: On // 事件监听
  hero?: Hero // vcode 的动画处理
  attachData?: AttachData // 添加的属性
  hook?: Hooks // 钩子函数
  key?: Key
  ns?: string // for SVGs
  fn?: () => VNode // for thunks
  args?: any[] // for thunks
  [key: string]: any // for any other 3rd party module
}

// 对传入的参数进行处理，增加 key，包装成 vnode 对象返回
export function vnode (sel: string | undefined,
  data: any | undefined,
  children: Array<VNode | string> | undefined,
  text: string | undefined,
  elm: Element | Text | undefined): VNode {
  const key = data === undefined ? undefined : data.key;
  return { sel, data, children, text, elm, key };
}

export default vnode;
