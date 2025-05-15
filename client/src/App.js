// src/App.js - Main application entry point
import React from 'react';
import SentimentDashboard from './components/SentimentDashboard';
import { ConfigProvider } from 'antd';
import enUS from 'antd/lib/locale/en_US';

function App() {
  return (
    <ConfigProvider locale={enUS}>
      <SentimentDashboard />
    </ConfigProvider>
  );
}

export default App;