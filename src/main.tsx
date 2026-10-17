import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './index.css'
// Global Google Maps authentication & quota event handler
if (typeof window !== 'undefined') {
  (window as any).gm_authFailure = () => {
    window.dispatchEvent(new CustomEvent('gmp-auth-failed'));
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
