
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Add robust global error handlers to prevent AI Studio container logging from circular structure crash on 3rd-party scripts
window.addEventListener('error', (event) => {
  // Prevent default platform serialization crash
  console.warn('Caught global error safely:', event.message || event);
  event.preventDefault();
}, true);

window.addEventListener('unhandledrejection', (event) => {
  console.warn('Caught global unhandled rejection safely:', event.reason);
  event.preventDefault();
}, true);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
