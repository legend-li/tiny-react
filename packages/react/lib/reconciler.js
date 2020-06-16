import { isFn } from "./utils";
import { resetHookIndex } from "./hooks";
import { createDOM, updateDOM } from "./dom";

export const publicVariable = {
  // 下一个执行单位
  nextUnitOfWork: null,

  // 在处理中的 fiber tree
  wipRoot: null,

  // 存储当前 DOM 对应的 fiber tree
  currentRoot: null,

  // 执行中的函数类型的 fiber 节点
  wipFiber: null
};

// 存储待删除的 fiber 节点
let commitQueueForDelete = [];

const UPDATE = "UPDATE";

const PLACEMENT = "PLACEMENT";

const DELETE = "DELETE";

const cleanup = e => e.effectCleanup && e.effectCleanup();

const effect = e => {
  const res = e.effect();
  if (isFn(res)) e.effectCleanup = res;
};

const planWork = cb => {
  if (!cb) return;
  if (requestAnimationFrame) {
    return requestAnimationFrame(cb);
  } else {
    return setTimeout(cb);
  }
};

function refer(ref, dom) {
  if (ref) isFn(ref) ? ref(dom) : (ref.current = dom);
}

const cleanupRef = fiber => {
  if (fiber) {
    refer(fiber.ref, null);
    let fiberSibling = fiber.sibling;
    while (fiberSibling) {
      refer(fiberSibling.ref, null);
      fiberSibling = fiberSibling.sibling;
    }
    cleanupRef(fiber.child);
  }
};

const createOldFibers = oldFiber => {
  if (!oldFiber) return [];
  let oldFibers = [];
  let prevSibling = oldFiber;
  while (prevSibling) {
    oldFibers.push(prevSibling);
    prevSibling = prevSibling.sibling;
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
        ref: element.ref,
        return: fiber,
        alternate: oldFiber,
        effectTag: UPDATE,
        hooks: oldFiber.hooks
      };
      // 否则，就表示新增 fiber 节点
    } else {
      newFiber = {
        type: element.type,
        props: element.props,
        stateNode: null,
        ref: element.ref,
        return: fiber,
        alternate: null,
        effectTag: PLACEMENT,
        hooks: []
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

const updateFunctionComponent = fiber => {
  publicVariable.wipFiber = fiber;
  resetHookIndex();

  const children = [fiber.type(fiber.props)];

  // 拿到节点子元素，开始构建 fiber tree
  reconcileChildren(fiber, children);
};

const updateHostComponent = fiber => {
  // 如果 fiber 节点还没有对应的 stateNode
  // 表示该节点为新的节点，为它创建对应的 DOM
  if (!fiber.stateNode) {
    fiber.stateNode = createDOM(fiber);
  }

  // 拿到节点子元素，开始构建 fiber tree
  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);
};

const performanUnitOfWork = fiber => {
  // 是否是函数组件
  if (isFn(fiber.type)) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
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

const commitDeletion = (fiber, domParent) => {
  if (!fiber) return;
  if (fiber.stateNode) {
    domParent.removeChild(fiber.stateNode);
  } else {
    commitDeletion(fiber.child, domParent);
  }
};

const commitWork = fiber => {
  if (!fiber) return;
  const {
    stateNode,
    effectTag,
    hooks,
    type,
    props,
    child,
    sibling,
    alternate,
    ref
  } = fiber;
  let domParentFiber = fiber.return;
  while (!domParentFiber.stateNode) {
    domParentFiber = domParentFiber.return;
  }
  const domParent = domParentFiber.stateNode;
  if (effectTag === DELETE) {
    hooks && hooks.filter(h => h.effectCleanup).forEach(cleanup);
    cleanupRef(fiber);
    commitDeletion(fiber, domParent);
    refer(ref, null);
    return;
  } else if (effectTag === PLACEMENT && stateNode) {
    let after;
    let nextSibling = sibling;
    while (nextSibling) {
      if (nextSibling.effectTag === UPDATE) {
        after = nextSibling.stateNode;
        nextSibling = null;
      } else {
        nextSibling = nextSibling.sibling;
      }
    }
    if (after) {
      domParent.insertBefore(stateNode, after);
    } else {
      domParent.appendChild(stateNode);
    }
  } else if (effectTag === UPDATE && stateNode) {
    updateDOM(stateNode, alternate.props, props);
  }
  if (isFn(type)) {
    if (hooks) {
      planWork(() => {
        let activeEffectHooks = hooks.filter(h => h.effectDepChanged);
        activeEffectHooks.forEach(cleanup);
        activeEffectHooks.forEach(effect);
      });
    }
  }
  commitWork(child);
  commitWork(sibling);
  refer(ref, stateNode);
};

const commitRoot = () => {
  commitQueueForDelete.forEach(commitWork);
  commitWork(publicVariable.wipRoot.child);
  commitQueueForDelete = [];
  publicVariable.currentRoot = publicVariable.wipRoot;
  publicVariable.wipRoot = null;
};

const workLoop = deadline => {
  while (deadline.timeRemaining() > 1 && publicVariable.nextUnitOfWork) {
    publicVariable.nextUnitOfWork = performanUnitOfWork(
      publicVariable.nextUnitOfWork
    );
  }
  // 如果没有处理的 fiber 节点， 并且存在处理中的 fiber tree
  if (!publicVariable.nextUnitOfWork && publicVariable.wipRoot) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
};

export const getCurrentRoot = () => publicVariable.currentRoot;

export const getWipFiber = () => publicVariable.wipFiber;

export const setNextUnitOfWork = work =>
  (publicVariable.nextUnitOfWork = publicVariable.wipRoot = work);

export const render = (element, container) => {
  publicVariable.wipRoot = publicVariable.nextUnitOfWork = {
    stateNode: container,
    props: {
      children: [element]
    },
    alternate: publicVariable.currentRoot
  };
  requestIdleCallback(workLoop);
};
