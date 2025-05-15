import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Import dayjs for locale configuration
import dayjs from 'dayjs';
import 'dayjs/locale/en';

// Set default locale to English
dayjs.locale('en');

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);