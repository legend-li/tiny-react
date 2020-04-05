import { TEXT_ELEMENT } from "./createElement.js";

// 最小的空余时间
const ENOUGH_TIME = 1;

// 处理中的 fiber 节点
let nextUnitOfWork = null;

// work in progress ，在处理中的 fiber tree
let wipRoot = null;

// 存储当前 DOM 对应的 fiber tree
let currentRoot = null;

// 存储所有需要删除的 fiber 节点
let deletions = [];

// 存储当前正在处理的 fiber 节点，主要用于 hook 处理
let wipFiber = null;

// 存储某个函数组件中 hook 的索引
let hookIndex = null;

/**
 * fiber 节点处理函数
 * @param {object} fiber
 */
function performUnitOfWork(fiber) {
  // 如果 fiber 节点的 type 是函数则表明是函数组件
  // 否则就认为其为 DOM 组件
  const isFunctionComponent = fiber.type instanceof Function;

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  // 如果 fiber 有子节点则返回
  // 回到 wookLoop 继续处理
  if (fiber.child) {
    return fiber.child;
  }

  // DFS 深度优先
  // 最后回到顶点
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.return;
  }
}

/**
 * 函数组件调和入口
 * @param {object} fiber
 */
function updateFunctionComponent(fiber) {
  // 存储当前处理的 fiber 给 wipFiber，便于后面的 hook(useState) 使用
  wipFiber = fiber;

  // 初始 hookIndex，每次调用函数组件中的 hook ，期望 hook 的位置是固定的，在
  // 函数中是最顶部的，不能使用将 hook 包裹在判断语句中，如果 hook 包裹在判断语句中
  // 使用索引定位 hook 的方式就乱了
  hookIndex = 0;

  // 初始化当前 fiber 节点的 hooks
  wipFiber.hooks = [];

  // 函数组件直接调用该函数获取返回值就是该函数组件的子元素
  // 所以函数组件的返回值必须是单根子元素(PS: react 目前已支持返回数组形式的元素)
  // 为了 reconcileChildren 中方便处理，以数组的形式传入
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

/**
 * DOM 组件调和入口
 * @param {object} fiber
 */
function updateHostComponent(fiber) {
  // 如果 fiber 节点还没有对应的 stateNode
  // 表示该节点为新的节点，为它创建对应的 DOM
  if (!fiber.stateNode) {
    fiber.stateNode = createDOM(fiber);
  }

  // 暂时处理 DOM 的渲染
  // if (fiber.return) {
  //     fiber.return.stateNode.append(fiber.stateNode);
  // }

  // 拿到节点子元素，开始构建 fiber tree
  const elements = fiber.props.children;

  reconcileChildren(fiber, elements);
}

/**
 * 调和函数
 * @param {object} fiber 待调和的 fiber 节点
 * @param {array} elements 待调和的子元素
 */
function reconcileChildren(fiber, elements) {
  let index = 0;

  let oldFiber = fiber.alternate && fiber.alternate.child;
  let newFiber = null;

  // 可能存在元素被删除的情况，那么就存在没有 element,但是有这个 oldFiber
  while (index < elements.length || oldFiber != null) {
    const element = elements[index];

    // 用于保存上一个节点，将它的兄弟节点保存在 sibling 的属性上
    const prevSibling = newFiber;

    const sameType = oldFiber && element && element.type === oldFiber.type;

    // 如果相同表示更新
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        stateNode: oldFiber.stateNode,
        return: fiber,
        alternate: oldFiber,
        effectTag: "UPDATE"
      };
    }

    // 如果有元素，类型不同，标记为新增
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        stateNode: null,
        return: fiber,
        alternate: null,
        effectTag: "PLACEMENT"
      };
    }

    // 如果有原 fiber 节点，且类型不一致，则表示为删除
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    // 第一个子节点存到 child 上
    if (index === 0) {
      fiber.child = newFiber;
      // 第二个及之后的子节点存到这个 sibling
    } else if (element) {
      prevSibling.sibling = newFiber;
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    index++;
  }
}

/**
 * 异步渲染回调函数
 * @param {object}} deadline requestIdleCallback 回调过来的参数
 */
function workLoop(deadline) {
  while (nextUnitOfWork && deadline.timeRemaining() > ENOUGH_TIME) {
    // debugger;
    // 进入当前的 fiber 节点处理逻辑
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }

  // 如果没有处理的 fiber 节点，并且存在处理中的 fiber tree
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}

/**
 * 提交 fiber 的变化
 */
function commitRoot() {
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

/**
 * 根据 fiber 的不同的变化类型进行不同的处理
 * @param {object} fiber
 */
function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  let domParentFiber = fiber.return;
  while (!domParentFiber.stateNode) {
    domParentFiber = domParentFiber.return;
  }

  const domParent = domParentFiber.stateNode;

  if (fiber.effectTag === "PLACEMENT" && fiber.stateNode !== null) {
    domParent.appendChild(fiber.stateNode);
  } else if (fiber.effectTag === "UPDATE" && fiber.stateNode !== null) {
    updateDOM(fiber.stateNode, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent);
    // domParent.removeChild(fiber.stateNode);
    return;
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

/**
 * 处理 fiber 节点删除的情况
 * @param {object} fiber 待删除 fiber 节点
 * @param {object} domParent 待删除 fiber 的父节点的 DOM
 */
function commitDeletion(fiber, domParent) {
  if (fiber.stateNode) {
    domParent.removeChild(fiber.stateNode);
  } else {
    commitDeletion(fiber.child, domParent);
  }
}

/**
 * 更新 DOM 的属性和事件
 * 根据前后的 props 的不同，对 DOM 的属性和事件进行新增删除操作
 * @param {object} dom 待更新的 DOM
 * @param {object} prevProps 旧的 props
 * @param {object} nextProps 新的 props
 */
function updateDOM(dom, prevProps, nextProps) {
  const isEvent = key => key.startsWith("on");
  const isProperty = key => !isEvent(key) && key !== "children";
  const isNew = key => prevProps[key] !== nextProps[key];
  const isGone = key => !(key in nextProps);

  // 移除之前的事件
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(key => {
      // 已经被删除
      // 或者监听事件已经替换掉了
      return isGone(key) || isNew(key);
    })
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // 新增的事件或者替换的事件
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew)
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });

  // 移除之前的属性
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone)
    .forEach(name => {
      dom[name] = "";
    });

  // 添加新属性
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew)
    .forEach(name => {
      dom[name] = nextProps[name];
    });
}

requestIdleCallback(workLoop);

/**
 * 创建 DOM 类型的 fiber 节点的对应的 DOM
 * @param {object} fiber
 */
function createDOM(fiber) {
  const { type, props } = fiber;

  const dom =
    type === TEXT_ELEMENT
      ? document.createTextNode("")
      : document.createElement(type);

  updateDOM(dom, {}, props);

  return dom;
}

/**
 * 函数组件状态 hook
 * @param {*} initial 初始状态
 */
export function useState(initial) {
  // 如果函数组件不是初次渲染
  // 那么其对应的 fiber 节点就会有 alternate
  // 取出当前 hook 在 alternate 中存储的值
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex];

  const hook = {
    // 如果有旧的 state 则取旧的 state 否则取初始值
    state: oldHook ? oldHook.state : initial,
    queue: []
  };

  // 取到上一次 setState 存储的处理函数
  // 遍历应用到 state 上，得到新的 state
  const actions = oldHook ? oldHook.queue : [];
  actions.forEach(action => {
    hook.state = action(hook.state);
  });

  // 触发局部状态更新函数
  // 接收一个回调函数
  const setState = action => {
    // 存储回调，等待调和时去调用
    hook.queue.push(action);

    // 初始化 wipRoot 和 nextUnitOfWork
    // 当有浏览器有空闲时间就会进入下一次调和过程
    wipRoot = {
      stateNode: currentRoot.stateNode,
      props: currentRoot.props,
      alternate: currentRoot
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

  // 记录 hook 到当前处理的 fiber 节点上
  // 以便下次调和复用当前状态
  wipFiber.hooks.push(hook);

  // 对 hook 索引进行加 1 操作
  // 如果函数中有其它的 hook ，使其索引位置对上
  hookIndex++;

  return [hook.state, setState];
}

/**
 * 渲染函数
 * @param {object} element 待渲染的 fc-element tree
 * @param {object} container 渲染的容器 DOM
 */
export function render(element, container) {
  wipRoot = nextUnitOfWork = {
    stateNode: container,
    props: {
      children: [element]
    },
    alternate: currentRoot
  };
}
