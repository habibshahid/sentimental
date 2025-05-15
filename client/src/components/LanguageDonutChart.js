// LanguageDistributionDonut with consistent label design
import React from 'react';
import { Card, Tag, Empty, Tooltip, Space } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { GlobalOutlined } from '@ant-design/icons';

// Format language name to capitalize first letter
const formatLanguageName = (name) => {
  if (!name || typeof name !== 'string') return 'Unknown';
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

const LanguageDistributionDonut = ({ languageData, loading }) => {
  // Prepare data for the chart
  const prepareLanguageData = () => {
    if (!languageData || !Array.isArray(languageData) || languageData.length === 0) {
      return [];
    }
  
    // Calculate total for percentages
    const total = languageData.reduce((sum, item) => sum + (item.value || 0), 0);
    
    // Sort by value (descending)
    const sortedData = [...languageData].sort((a, b) => (b.value || 0) - (a.value || 0));
    
    // If there are more than 5 languages, combine the rest into "Other"
    if (sortedData.length > 5) {
      const topLanguages = sortedData.slice(0, 4);
      const otherLanguages = sortedData.slice(4);
      
      const otherValue = otherLanguages.reduce((sum, item) => sum + (item.value || 0), 0);
      
      return [
        ...topLanguages.map(item => ({
          name: item.name || 'Unknown',
          value: item.value || 0,
          color: item.color || '#bfbfbf',
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
      name: item.name || 'Unknown',
      value: item.value || 0,
      color: item.color || '#bfbfbf',
      percentage: total > 0 ? ((item.value || 0) / total * 100).toFixed(1) : '0.0'
    }));
  };

  const preparedData = prepareLanguageData();
  
  // Get the top 3 languages to display in tags
  const getTopLanguages = (data, count = 3) => {
    if (!data || !Array.isArray(data)) return [];
    return data.slice(0, Math.min(count, data.length));
  };
  
  const topLanguages = getTopLanguages(preparedData);
  
  // Get total for "Other" category if applicable
  const getOtherTotal = () => {
    if (!preparedData || preparedData.length <= 3) return 0;
    return preparedData.slice(3).reduce((sum, item) => sum + (item.value || 0), 0);
  };

  return (
    <Card title="Language Distribution" style={{ height: 400 }} loading={loading}>
      {preparedData && Array.isArray(preparedData) && preparedData.length > 0 ? (
        <>
          {/* Chart container with fixed height */}
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={preparedData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${formatLanguageName(name)}: ${(percent * 100).toFixed(0)}%`}
                >
                  {preparedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || `hsl(${index * 30}, 70%, 50%)`} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Bottom tags - matching sentiment distribution style */}
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <Space>
              {topLanguages.map((lang, index) => (
                <Tag 
                  key={index} 
                  icon={<GlobalOutlined />} 
                  color={lang.color}
                >
                  {formatLanguageName(lang.name)}: {lang.value}
                </Tag>
              ))}
              
              {preparedData.length > 3 && (
                <Tag icon={<GlobalOutlined />} color="#bfbfbf">
                  Other: {getOtherTotal()}
                </Tag>
              )}
            </Space>
          </div>
        </>
      ) : (
        <Empty description="No language data available" style={{ marginTop: '100px' }} />
      )}
    </Card>
  );
};

export default LanguageDistributionDonut;