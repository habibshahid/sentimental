# Frontend Setup Instructions

This document provides step-by-step instructions for setting up the frontend of the Sentiment Analysis Dashboard.

## Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- The backend server should be set up and running

## Directory Structure

Create the following directory structure for your client application:

```
sentiment-analysis-dashboard/
├── client/
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── robots.txt
│   ├── src/
│   │   ├── components/
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── .env
│   └── package.json
└── server/
    └── ... (backend files)
```

## Step 1: Create React App

You can set up the React application from scratch or use Create React App:

```bash
npx create-react-app client
cd client
```

## Step 2: Install Dependencies

Replace the default package.json with the one provided and install the dependencies:

```bash
# Copy the provided package.json to your client directory
npm install
```

The main dependencies include:
- **antd**: Ant Design UI library
- **@ant-design/icons**: Icon components for Ant Design
- **recharts**: Chart library for data visualization
- **moment**: Date and time handling

## Step 3: Configure Environment Variables

Create a `.env` file in the client directory with the following content:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_DEFAULT_MODEL=gpt-3.5-turbo-0125
REACT_APP_NAME=Sentiment Analysis Dashboard
```

## Step 4: Create Main App Component

Create or replace your `src/App.js` file with the provided dashboard component:

```jsx
import React from 'react';
import SentimentDashboard from './components/SentimentDashboard';

function App() {
  return (
    <div className="App">
      <SentimentDashboard />
    </div>
  );
}

export default App;
```

## Step 5: Create Dashboard Component

Create a new file `src/components/SentimentDashboard.js` and copy the Sentiment Dashboard component code provided earlier.

## Step 6: Update CSS

You might want to add some global styles in `src/index.css`:

```css
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.ant-layout {
  min-height: 100vh;
}

.logo {
  height: 32px;
  margin: 16px;
  color: white;
  font-size: 18px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

## Step 7: Update index.html

Make sure your `public/index.html` file has the proper title and meta tags:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta
      name="description"
      content="Sentiment Analysis Dashboard for monitoring message sentiment"
    />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <title>Sentiment Analysis Dashboard</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
```

## Step 8: Start the Development Server

With the backend server running, start the frontend development server:

```bash
npm start
```

Your React application should open in a browser at `http://localhost:3000`.

## Alternative: Simplified Setup with Create React App

If you prefer a quicker setup, you can use Create React App and then replace key files:

```bash
# Create the basic React app
npx create-react-app client
cd client

# Install additional dependencies
npm install antd @ant-design/icons recharts moment

# Create .env file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
echo "REACT_APP_DEFAULT_MODEL=gpt-3.5-turbo-0125" >> .env
echo "REACT_APP_NAME=Sentiment Analysis Dashboard" >> .env

# Replace App.js and create dashboard component (manually)
# Then start the server
npm start
```

## Connecting to the Backend

The frontend expects the backend server to be running at `http://localhost:5000` and to expose API endpoints at `/api/*`. Make sure your backend server is properly configured and running before starting the frontend.

## Building for Production

When you're ready to deploy, build the frontend:

```bash
npm run build
```

This will create a `build` directory with optimized production files that can be served by a static file server or your backend.

## Troubleshooting

### API Connection Issues

If you're having trouble connecting to the backend API:

1. Ensure the backend server is running
2. Check that the REACT_APP_API_URL in .env is correct
3. Verify CORS is properly configured on the backend
4. Check the browser console for error messages

### UI Loading Issues

If the UI components don't load correctly:

1. Make sure all dependencies are installed
2. Check for import errors in the browser console
3. Verify that your component hierarchy is correct
4. Clear your browser cache and restart the development server

### Data Not Displaying

If charts or tables aren't showing data:

1. Use browser developer tools to check network requests
2. Verify the structure of the data returned from the API matches what the components expect
3. Add console.log statements to debug data flow through components