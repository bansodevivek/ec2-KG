import React from 'react';
import ReactDOM from 'react-dom/client';
import ConnectedAutoDashboard from './connected_auto_dashboard_refactored.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConnectedAutoDashboard />
  </React.StrictMode>,
);
