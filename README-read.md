## 目录结构

```bash
src
├── h.ts # 定义 h 函数，用于生成 vnode
├── helpers
│   └── attachto.ts # 定义 AttachData VNodeDataWithAttach VNodeWithAttachData 类型，post destroy create attachTo 函数
├── hooks.ts # 定义 hooks 钩子函数模型
├── htmldomapi.ts # 基于原生 dom api 的二次封装
├── is.ts # 类型判断函数 array primitive
├── jsx-global.ts # add global JSX namespace
├── jsx.ts # 定义 jsx 兼容函数，flattenAndFilter 函数
├── modules
│   ├── attributes.ts # create or update attrs
│   ├── class.ts # create or update class
│   ├── dataset.ts ## create or update data 
│   ├── eventlisteners.ts # 定义 create update destroy 函数，用于 dom 的 eventListener
│   ├── hero.ts # vcode 的动画处理
│   ├── module.ts # 定义 Module 结构
│   ├── props.ts # create or update props
│   └── style.ts # create or update style
├── snabbdom.ts # 主逻辑，向外暴露了 init 函数
├── test  # karma 测试用例
├── thunk.ts # 在src/test/thunk.ts 测试用例中调用，用于测试 patch 函数
├── tovnode.ts # 定义 toVNode 函数，将真实 dom 转换成 vnode
└── vnode.ts # 定义 VNode VNodeData 类型，定义 vnode 函数，处理 node key
```