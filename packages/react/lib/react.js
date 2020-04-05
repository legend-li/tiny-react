const TEXT_ELEMENT = "TEXT_ELEMENT";

const createTextElement = text => {
  return {
    type: TEXT_ELEMENT,
    props: {
      nodeValue: text,
      children: []
    }
  };
};

export const createElement = (type, props = {}, ...children) => {
  let domTree = {
    type,
    props: {
      ...props,
      children:
        children.map(child =>
          typeof child === "object" ? child : createTextElement(child)
        ) || []
    }
  };
  return domTree;
};

const isListener = name => name.startsWith("on");

const isAttribute = name => !isListener(name) && name !== "children";

export const render = (domTree, container) => {
  // 解构dom节点的type类型和props属性
  const { type, props } = domTree;

  // 创建dom
  let dom =
    type === TEXT_ELEMENT
      ? document.createTextNode("")
      : document.createElement(type);

  // 获取dom节点props对象的属性
  let propsKeys = Object.keys(props);

  // 更新dom属性
  propsKeys
    .filter(key => isAttribute(key))
    .forEach(key => (dom[key] = props[key]));

  // 绑定dom事件
  propsKeys
    .filter(key => isListener(key))
    .forEach(key =>
      dom.addEventListener(key.toLowerCase().substr(2), props[key])
    );

  // 挂载dom子节点
  props.children.forEach(child => render(child, dom));

  // 渲染
  let containerDom =
    typeof container === "object" && container.appendChild
      ? container
      : document.getElementById(container);
  containerDom.appendChild(dom);
};

export default {
  createElement,
  render
};
