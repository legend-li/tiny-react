import { isFn, isChanged } from "./utils";
import { publicVariable } from "./reconciler";

let hookIndex = null;

export const resetHookIndex = () => {
  hookIndex = 0;
};

export const useState = initState => {
  return useReducer(null, initState);
};

export const useReducer = (reducer, initState) => {
  let [hook, newHook] = getHook(hookIndex++);

  if (newHook) {
    const setState = val => {
      let newState = reducer
        ? reducer(hook.state, val)
        : isFn(val)
        ? val(hook.state)
        : val;

      if (newState !== hook.state) {
        hook.state = newState;
        publicVariable.nextUnitOfWork = publicVariable.wipRoot = {
          stateNode: publicVariable.currentRoot.stateNode,
          props: publicVariable.currentRoot.props,
          alternate: publicVariable.currentRoot
        };
      }
    };
    hook.state = initState;
    hook.dispatch = setState;
  }

  return [hook.state, hook.dispatch];
};

export const useMemo = (cb, deps) => {
  let [hook] = getHook(hookIndex++);
  if (isChanged(hook.deps, deps)) {
    hook.deps = deps;
    return (hook.cb = cb());
  }
  return hook.cb;
};

export const useCallback = (cb, deps) => {
  return useMemo(() => cb, deps);
};

export const useRef = current => {
  let [hook, newHook] = getHook(hookIndex++);
  if (newHook) {
    hook.ref = { current };
  }
  return hook.ref;
};

export const useEffect = (effect, deps) => {
  let [hook] = getHook(hookIndex++);
  if (isChanged(hook.deps, deps)) {
    hook.deps = deps;
    hook.effect = effect;
    hook.effectDepChanged = true;
  }
};

const getHook = hookIndex => {
  let newHook = false;
  if (hookIndex >= publicVariable.wipFiber.hooks.length) {
    newHook = true;
    publicVariable.wipFiber.hooks.push({
      state: null,
      dispatch: null,
      deps: null,
      cb: null,
      effect: null,
      effectCleanup: null,
      effectDepChanged: false,
      ref: null
    });
  }
  return [publicVariable.wipFiber.hooks[hookIndex], newHook];
};
