import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import BrowserCompatibilityCheck from './components/BrowserCompatibilityCheck.tsx';
import { ThemeToaster } from './components/ThemeToaster.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserCompatibilityCheck>
      <Router>
        <App />
      </Router>
      <ThemeToaster />
    </BrowserCompatibilityCheck>
  </StrictMode>
);
