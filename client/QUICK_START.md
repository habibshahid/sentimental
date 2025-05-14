# Quick Start Guide for the Frontend

This guide will help you quickly set up and run the frontend for the Sentiment Analysis Dashboard.

## Setup Steps

### 1. Install Dependencies

```bash
# Navigate to the client directory
cd client

# Install dependencies
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the client directory:

```bash
# Create .env file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
echo "REACT_APP_DEFAULT_MODEL=gpt-3.5-turbo-0125" >> .env
```

### 3. Run the Application

```bash
# Start the development server
npm start
```

The application will open in your browser at http://localhost:3000.

## Project Structure

- `src/App.js` - Main application component
- `src/components/SentimentDashboard.js` - Main dashboard component
- `src/index.js` - Entry point
- `src/index.css` - Global styles

## Available Scripts

- `npm start` - Starts the development server
- `npm build` - Builds the app for production
- `npm test` - Runs tests
- `npm eject` - Ejects from Create React App

## Features

- Interactive sentiment analysis dashboard
- Real-time sentiment analysis
- Visualization with charts and graphs
- Filtering and drill-down capabilities
- Cache monitoring

## Requirements

- Node.js 16+
- npm 8+
- Backend server running at http://localhost:5000

## Troubleshooting

If you encounter issues:

1. Make sure the backend server is running
2. Check browser console for errors
3. Verify all dependencies are installed
4. Ensure environment variables are set correctly

## Next Steps

Once the dashboard is running, you can:

1. Analyze existing messages
2. Test the real-time sentiment analysis feature
3. Monitor API costs and cache effectiveness