import './hljs-setup';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';

// Get the root element
const rootElement = document.getElementById('root');

// If root element doesn't exist, create it
if (!rootElement) {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
  console.warn('Root element was created dynamically. Make sure public/index.html has <div id="root"></div>');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);