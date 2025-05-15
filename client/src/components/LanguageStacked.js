// Stacked Bar Chart Visualization for Language Distribution
import React, { useState } from 'react';
import { Card, Empty, Tooltip as AntTooltip, Space, Radio } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { GlobalOutlined, PercentageOutlined, NumberOutlined } from '@ant-design/icons';

// Function to prepare data for visualization
const prepareLanguageData = (languageData) => {
  if (!languageData || !Array.isArray(languageData) || languageData.length === 0) {
    return { topLanguages: [], otherLanguages: [], sortedData: [] };
  }

  // Calculate total for percentages
  const total = languageData.reduce((sum, item) => sum + (item.value || 0), 0);
  
  // Sort by value (descending)
  const sortedData = [...languageData]
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .map(item => ({
      ...item,
      percentage: total > 0 ? ((item.value || 0) / total * 100).toFixed(1) : '0.0'
    }));
  
  // Split into top 5 and others
  const topLanguages = sortedData.slice(0, 5);
  
  // Combine the rest as "Other"
  const otherLanguages = sortedData.slice(5);
  const otherValue = otherLanguages.reduce((sum, item) => sum + (item.value || 0), 0);
  
  // Only add "Other" category if there are actually other languages
  if (otherLanguages.length > 0) {
    topLanguages.push({
      name: 'Other',
      value: otherValue,
      color: '#bfbfbf',
      percentage: total > 0 ? (otherValue / total * 100).toFixed(1) : '0.0'
    });
  }
  
  return { topLanguages, otherLanguages, sortedData };
};

const LanguageDistributionChart = ({ languageData, loading }) => {
  const [displayMode, setDisplayMode] = useState('percentage');
  const { topLanguages, otherLanguages, sortedData } = prepareLanguageData(languageData);
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '10px', 
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}>
          <p style={{ margin: 0 }}><strong>{data.name}</strong></p>
          <p style={{ margin: 0 }}>Messages: {data.value}</p>
          <p style={{ margin: 0 }}>Percentage: {data.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  // Format the name for display
  const formatLanguageName = (name) => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  // Show a different chart based on the number of languages
  const renderAppropriateChart = () => {
    if (sortedData.length === 0) {
      return <Empty description="No language data available" style={{ marginTop: '100px' }} />;
    }

    // For percentage display mode
    if (displayMode === 'percentage') {
      return (
        <ResponsiveContainer width="100%" height={245}>
          <BarChart
            data={topLanguages}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis 
              type="number" 
              domain={[0, 100]} 
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              tick={{ fontSize: 12 }}
              width={80}
              tickFormatter={formatLanguageName}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="percentage">
              {topLanguages.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || `hsl(${index * 30}, 70%, 50%)`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
    
    // For count display mode
    return (
      <ResponsiveContainer width="100%" height={245}>
        <BarChart
          data={topLanguages}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis type="number" />
          <YAxis 
            dataKey="name" 
            type="category" 
            tick={{ fontSize: 12 }}
            width={80}
            tickFormatter={formatLanguageName}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value">
            {topLanguages.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || `hsl(${index * 30}, 70%, 50%)`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Details about other languages
  const renderOtherLanguagesDetails = () => {
    if (otherLanguages.length === 0) return null;
    
    return (
      <div style={{ fontSize: '12px', padding: '0 5px' }}>
        <span style={{ color: '#8c8c8c' }}>
          "Other" includes: {otherLanguages.slice(0, 3).map(lang => formatLanguageName(lang.name)).join(', ')}
          {otherLanguages.length > 3 ? ` and ${otherLanguages.length - 3} more` : ''}
        </span>
      </div>
    );
  };

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <GlobalOutlined style={{ marginRight: 8 }} />
            Language Distribution
          </span>
          <Radio.Group 
            value={displayMode} 
            onChange={(e) => setDisplayMode(e.target.value)}
            size="small"
            buttonStyle="solid"
          >
            <Radio.Button value="percentage"><PercentageOutlined /></Radio.Button>
            <Radio.Button value="count"><NumberOutlined /></Radio.Button>
          </Radio.Group>
        </div>
      } 
      style={{ height: 360 }} 
      loading={loading}
    >
      {renderAppropriateChart()}
      {renderOtherLanguagesDetails()}
    </Card>
  );
};

export default LanguageDistributionChart;