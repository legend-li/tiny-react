// import React, { createElement } from '../../packages/react/lib/react.js';
// import React, { createElement } from '../../packages/react2/lib/react.js';
// import React, { createElement } from "../../packages/react2-1/lib/react.js";
import React, { createElement } from "../../packages/react3/lib/react.js";
// import React, { createElement } from '../../packages/react-fc/lib/react.js';

// const App = (props) => {
//   const [isShow, setIsShow] = React.useState(true);
//   return (
//     <div id="demo">
//         {
//           isShow ? <h1>title1:</h1> : <h2>title2:</h2>
//         }
//         <h1 onClick={ () => { setIsShow(d => !d) } }>React is so easy!</h1>
//         <p style={{ fontSize: 16, color: '#333' }}>Do you think so?</p>
//     </div>
//   )
// }

// React.render(<App />, document.getElementById('root'))

// const App = (props) => {
//   return (
//     <div id="demo">
//       <h1
//         onClick={() => {
//           alert(1);
//         }}
//       >
//         #: React is so easy!
//       </h1>
//       <p style={{ fontSize: 16, color: "#333" }}>Do you think so?</p>
//     </div>
//   )
// }

// React.render(<App />, document.getElementById("root"));

// const App = (
//   <div id="demo1">
//     <h1
//       onClick={() => {
//         reRender();
//       }}
//     >
//       #1: React is so easy!
//     </h1>
//     <p style={{ fontSize: 16, color: "#333" }}>Do you think so?</p>
//   </div>
// );

// const App2 = (
//   <div id="demo2">
//     <h2
//       onClick={() => {
//         firstRender();
//       }}
//     >
//       #2: React is so easy!
//     </h2>
//     <p style={{ fontSize: 16, color: "#333" }}>Do you think so?</p>
//   </div>
// );

// const firstRender = () => {
//   React.render(App, document.getElementById("root"));
// };

// const reRender = () => {
//   React.render(App2, document.getElementById("root"));
// };

// firstRender();

const App = props => {
  return (
    <div id="demo1">
      <h1
        onClick={() => {
          reRender();
        }}
      >
        #1: React is so easy!
      </h1>
      <p style={{ fontSize: 16, color: "#333" }}>Do you think so?</p>
    </div>
  );
};

const App2 = props => {
  return (
    <div id="demo2">
      <h2
        onClick={() => {
          firstRender();
        }}
      >
        #2: React is so easy!
      </h2>
      <p style={{ fontSize: 16, color: "#333" }}>Do you think so?</p>
    </div>
  );
};

const firstRender = () => {
  React.render(<App />, document.getElementById("root"));
};

const reRender = () => {
  React.render(<App2 />, document.getElementById("root"));
};

firstRender();
