"use strict";

const react = require("..");

function sum(a, b) {
  return a + b;
}

test("react", () => {
  expect(sum(1, 2)).toBe(3);
});
