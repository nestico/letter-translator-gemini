console.log("Index Module Starting...");
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
console.log("React Root found, rendering app...");
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
