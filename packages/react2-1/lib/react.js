const TEXT_ELEMENT = "TEXT_ELEMENT";

// 下一个执行单位
let nextUnitOfWork = null;

// 在处理中的 fiber tree
let wipRoot = null;

// 存储当前 DOM 对于的 fiber tree
let currentRoot = null;

// 存储待删除的 fiber 节点
let commitQueueForDelete = [];

const UPDATE = "UPDATE";

const PLACEMENT = "PLACEMENT";

const DELETE = "DELETE";

// 判断是否为事件属性
const isListener = name => name.startsWith("on");

// 判断是否为正常属性
const isAttribute = name => !isListener(name) && name !== "children";

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

const createDOM = fiber => {
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

const updateDOM = (stateNode, oldProps, props) => {
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
      stateNode[name] = props[name];
    });
};

const createOldFibers = oldFiber => {
  if (!oldFiber) return [];
  let oldFibers = [];
  let prevSibling = oldFiber;
  while (prevSibling) {
    let fiber = prevSibling;
    oldFibers.push(fiber);
    prevSibling = fiber.sibling;
  }
  return oldFibers;
};

const reconcileChildren = (fiber, elements) => {
  let index = 0;

  const oldFibers = createOldFibers(fiber.alternate && fiber.alternate.child);

  let reused = {};

  // 过滤出需要删除的旧 fiber 节点
  for (const k in oldFibers) {
    let newFiber = elements[k];
    let oldFiber = oldFibers[k];

    if (newFiber && newFiber.type === oldFiber.type) {
      reused[k] = oldFiber;
    } else {
      oldFiber.effectTag = DELETE;
      commitQueueForDelete.push(oldFiber);
    }
  }

  // 用于保存上一个节点，将它的兄弟节点保存在 sibling 的属性上
  let prevSibling = null;
  // 可能存在元素被删除的情况，那么就存在没有 element，但是有这个 oldFiber
  while (elements.length > index) {
    let element = elements[index];
    let oldFiber = reused[index];
    let newFiber = null;

    // 如果有可以复用的旧 fiber 节点，则复用旧 fiber 节点
    if (oldFiber) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        stateNode: oldFiber.stateNode,
        return: fiber,
        alternate: oldFiber,
        effectTag: UPDATE
      };
      // 否则，就表示新增 fiber 节点
    } else {
      newFiber = {
        type: element.type,
        props: element.props,
        stateNode: null,
        return: fiber,
        alternate: null,
        effectTag: PLACEMENT
      };
    }

    // 第一个子节点存到 child 上
    if (index === 0) {
      fiber.child = newFiber;
      // 第二个及之后的子节点存到 sibling 上
    } else {
      prevSibling.sibling = newFiber;
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    prevSibling = newFiber;
    index++;
  }
};

const performanUnitOfWork = fiber => {
  // 如果 fiber 节点还没有对应的 stateNode
  // 表示该节点为新的节点，为它创建对应的 DOM
  if (!fiber.stateNode) {
    fiber.stateNode = createDOM(fiber);
  }

  // 拿到节点子元素，开始构建 fiber tree
  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);

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

const commitWork = fiber => {
  if (!fiber) return;
  const domParent = fiber.return.stateNode;
  if (fiber.effectTag === DELETE) {
    domParent.removeChild(fiber.stateNode);
    return;
  } else if (fiber.effectTag === PLACEMENT) {
    let after;
    let nextSibling = fiber.sibling;
    while (nextSibling) {
      if (nextSibling.effectTag === UPDATE) {
        after = nextSibling.stateNode;
        nextSibling = null;
      } else {
        nextSibling = nextSibling.sibling;
      }
    }
    if (after) {
      domParent.insertBefore(fiber.stateNode, after);
    } else {
      domParent.appendChild(fiber.stateNode);
    }
  } else if (fiber.effectTag === UPDATE) {
    updateDOM(fiber.stateNode, fiber.alternate.props, fiber.props);
  }
  commitWork(fiber.child);
  commitWork(fiber.sibling);
};

const commitRoot = () => {
  commitQueueForDelete.forEach(commitWork);
  commitWork(wipRoot.child);
  commitQueueForDelete = [];
  currentRoot = wipRoot;
  wipRoot = null;
};

const workLoop = deadline => {
  while (deadline.timeRemaining() > 1 && nextUnitOfWork) {
    nextUnitOfWork = performanUnitOfWork(nextUnitOfWork);
  }
  // 如果没有处理的 fiber 节点， 并且存在处理中的 fiber tree
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
};

requestIdleCallback(workLoop);

export const render = (element, container) => {
  wipRoot = nextUnitOfWork = {
    stateNode: container,
    props: {
      children: [element]
    },
    alternate: currentRoot
  };
};

export default {
  createElement,
  render
};
