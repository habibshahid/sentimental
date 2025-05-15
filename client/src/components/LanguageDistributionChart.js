// Language Distribution Horizontal Bar Chart
import React from 'react';
import { Card, Empty } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Function to prepare data for visualization
const prepareLanguageData = (languageData) => {
  if (!languageData || !Array.isArray(languageData) || languageData.length === 0) {
    return [];
  }

  // Calculate total for percentages
  const total = languageData.reduce((sum, item) => sum + (item.value || 0), 0);
  
  // Sort by value (descending)
  const sortedData = [...languageData].sort((a, b) => (b.value || 0) - (a.value || 0));
  
  // If there are more than 7 languages, combine the rest into "Other"
  if (sortedData.length > 7) {
    const topLanguages = sortedData.slice(0, 6);
    const otherLanguages = sortedData.slice(6);
    
    const otherValue = otherLanguages.reduce((sum, item) => sum + (item.value || 0), 0);
    
    return [
      ...topLanguages.map(item => ({
        ...item,
        percentage: total > 0 ? ((item.value || 0) / total * 100).toFixed(1) : '0.0'
      })),
      {
        name: 'Other',
        value: otherValue,
        color: '#bfbfbf',
        percentage: total > 0 ? (otherValue / total * 100).toFixed(1) : '0.0'
      }
    ];
  }
  
  // Add percentage to each item
  return sortedData.map(item => ({
    ...item,
    percentage: total > 0 ? ((item.value || 0) / total * 100).toFixed(1) : '0.0'
  }));
};

const LanguageDistributionChart = ({ languageData, loading }) => {
  const preparedData = prepareLanguageData(languageData);
  
  // Custom tooltip to show percentage
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

  return (
    <Card title="Language Distribution" style={{ height: 360 }} loading={loading}>
      {preparedData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={preparedData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" />
            <YAxis 
              dataKey="name" 
              type="category" 
              tick={{ fontSize: 12 }}
              width={70}
              tickFormatter={(value) => {
                // Capitalize first letter and limit length
                const formattedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                return formattedValue.length > 9 ? formattedValue.slice(0, 8) + '...' : formattedValue;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value">
              {preparedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || `hsl(${index * 30}, 70%, 50%)`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Empty description="No language data available" style={{ marginTop: '100px' }} />
      )}
    </Card>
  );
};

export default LanguageDistributionChart;