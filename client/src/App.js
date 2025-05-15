// src/App.js - Updated to configure dayjs with Ant Design
import React from 'react';
import SentimentDashboard from './components/SentimentDashboard';
import { ConfigProvider } from 'antd';
import enUS from 'antd/lib/locale/en_US';

// Import dayjs for Ant Design date functions
import dayjs from 'dayjs';
import updateLocale from 'dayjs/plugin/updateLocale';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

// Initialize dayjs plugins
dayjs.extend(updateLocale);
dayjs.extend(weekday);
dayjs.extend(localeData);

function App() {
  return (
    <ConfigProvider locale={enUS}>
      <SentimentDashboard />
    </ConfigProvider>
  );
}

export default App;