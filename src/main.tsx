import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/sora/latin-600.css';
import '@fontsource/sora/latin-700.css';
import '@fontsource/sora/latin-800.css';
import './ui/styles/theme.css';
import './ui/styles/table.css';
import './ui/styles/grid.css';
import './ui/styles/pages.css';
import { initCloud } from './net/cloud';
import { App } from './ui/App';
import { registerOffline } from './pwa';

initCloud();
registerOffline();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
