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

const createDOM = fiber => {
  // 解构dom节点的type类型和props属性
  const { type, props } = fiber;

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

  return dom;
};

const performanUnitOfWork = fiber => {
  // 如果 fiber 节点还没有对应的 stateNode
  // 表示该节点为新的节点，为它创建对应的 DOM
  if (!fiber.stateNode) {
    fiber.stateNode = createDOM(fiber);
  }

  // 暂时处理 DOM 的渲染
  if (fiber.return) {
    fiber.return.stateNode.append(fiber.stateNode);
  }

  // 拿到节点子元素，开始构建 fiber tree
  const elements = fiber.props.children;
  let index = 0;
  // 用于保存上一个节点，将它的兄弟节点保存在 sibling 的属性上
  let prevSibling = null;
  while (elements.length > index) {
    const element = elements[index];
    const newFiber = {
      type: element.type,
      props: element.props,
      return: fiber,
      stateNode: null
    };
    // 第一个子节点存到 child 上
    if (index === 0) {
      fiber.child = newFiber;
      // 第二个及之后的子节点存到 sibling 上
    } else {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
  }

  // 处理子元素
  if (fiber.child) {
    return fiber.child;
  }

  // 处理兄弟元素
  // DFS 深度优先遍历
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    } else {
      nextFiber = nextFiber.return;
    }
  }
};

let nextUnitOfWork = null;

const workLoop = deadline => {
  while (deadline.timeRemaining() > 1 && nextUnitOfWork) {
    nextUnitOfWork = performanUnitOfWork(nextUnitOfWork);
  }
  requestIdleCallback(workLoop);
};

requestIdleCallback(workLoop);

export const render = (element, container) => {
  nextUnitOfWork = {
    stateNode: container,
    props: {
      children: [element]
    }
  };
};

export default {
  createElement,
  render
};
