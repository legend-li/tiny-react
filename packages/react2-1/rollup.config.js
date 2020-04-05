import babel from "rollup-plugin-babel";

export default {
  input: "lib/react.js",
  output: {
    file: "dist/react.js",
    format: "umd",
    name: "react"
  },
  plugins: [
    babel({
      exclude: "/node_modules/**"
    })
  ]
};
