import { isAttribute, isListener } from "./utils";

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

export const createElement = (type, props, ...children) => {
  props = props || {};
  let ref = props.ref || null;
  delete props.ref;
  return {
    type,
    props: {
      ...props,
      children:
        children.map(child =>
          typeof child === "object" ? child : createTextElement(child)
        ) || []
    },
    ref
  };
};

export const createDOM = fiber => {
  // 解构dom节点的type类型和props属性
  const { type, props } = fiber;

  // 创建dom
  let dom =
    type === TEXT_ELEMENT
      ? document.createTextNode("")
      : document.createElement(type);

  updateDOM(dom, {}, props);

  return dom;
};

export const updateDOM = (stateNode, oldProps, props) => {
  const isNewAttribute = key => oldProps[key] !== props[key];
  const isGone = key => !(key in props);

  // 移除之前的事件
  Object.keys(oldProps)
    .filter(isListener)
    .filter(key => {
      // 已经被删除
      // 或者监听事件已经替换掉了
      return isGone(key) || isNewAttribute(key);
    })
    .forEach(name => {
      const eventType = name.toLowerCase().substr(2);
      stateNode.removeEventListener(eventType, oldProps[name]);
    });

  // 新增的事件或者替换的事件
  Object.keys(props)
    .filter(isListener)
    .filter(isNewAttribute)
    .forEach(name => {
      const eventType = name.toLowerCase().substr(2);
      stateNode.addEventListener(eventType, props[name]);
    });

  // 移除之前的属性
  Object.keys(oldProps)
    .filter(isAttribute)
    .filter(isGone)
    .forEach(name => {
      stateNode[name] = "";
    });

  // 添加新属性
  Object.keys(props)
    .filter(isAttribute)
    .filter(isNewAttribute)
    .forEach(name => {
      if (name === "style") {
        let oldValue = oldProps[name] || {};
        let newValue = props[name] || {};
        for (const k in { ...oldValue, ...newValue }) {
          if (oldValue[k] !== newValue[k]) {
            stateNode[name][k] = (newValue && newValue[k]) || "";
          }
        }
      } else {
        stateNode[name] = props[name];
      }
    });
};
