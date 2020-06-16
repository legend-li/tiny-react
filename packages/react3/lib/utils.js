export const isFn = fn => typeof fn === "function";

export const isChanged = (a, b) => {
  return !a || b.some((arg, index) => arg !== a[index]);
};

// 判断是否为事件属性
export const isListener = name => name.startsWith("on");

// 判断是否为正常属性
export const isAttribute = name => !isListener(name) && name !== "children";
