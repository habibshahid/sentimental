// Fixed LanguageTreemap.js with proper null checks
import React from 'react';
import { Card, Empty, Tooltip as AntTooltip } from 'antd';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { GlobalOutlined } from '@ant-design/icons';

// Function to prepare data for the treemap
const prepareTreemapData = (languageData) => {
  if (!languageData || !Array.isArray(languageData) || languageData.length === 0) {
    return { name: 'language', children: [] };
  }

  // Calculate total for percentages
  const total = languageData.reduce((sum, item) => sum + (item.value || 0), 0);
  
  // Format data for treemap
  return {
    name: 'language',
    children: languageData.map(item => ({
      name: item.name || 'Unknown',  // Provide default for undefined names
      size: item.value || 0,         // Provide default for undefined values
      color: item.color || '#bfbfbf', // Provide default color
      percentage: total > 0 ? ((item.value || 0) / total * 100).toFixed(1) : '0.0'
    }))
  };
};

// Custom content for treemap cells
const CustomTreemapContent = ({ root, depth, x, y, width, height, index, name, size, color, percentage }) => {
  // Don't render if the cell is too small
  if (width < 30 || height < 30) {
    return null;
  }

  // Format name for display (capitalize first letter) with proper null check
  const formattedName = name && typeof name === 'string' 
    ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
    : 'Unknown';
  
  // Determine if text should be displayed
  const shouldDisplayText = width > 60 && height > 40;
  const shouldDisplayPercentage = width > 60 && height > 60;
  
  // Determine text color based on background brightness
  const getBrightness = (hexColor) => {
    // Default color if not provided
    if (!hexColor || hexColor === '') return 128;
    
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Handle non-hex colors or invalid values
    if (hex.length !== 6) return 128;
    
    try {
      // Parse RGB components
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      if (isNaN(r) || isNaN(g) || isNaN(b)) return 128;
      
      return (r * 299 + g * 587 + b * 114) / 1000;
    } catch (e) {
      return 128; // Default to mid-brightness on error
    }
  };
  
  const brightness = getBrightness(color);
  const textColor = brightness > 128 ? '#000000' : '#ffffff';

  return (
    <AntTooltip title={`${formattedName}: ${size} messages (${percentage}%)`}>
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: color || `hsl(${index * 30}, 70%, 50%)`,
            stroke: '#fff',
            strokeWidth: 2,
            strokeOpacity: 1,
            cursor: 'pointer',
          }}
        />
        {shouldDisplayText && (
          <text
            x={x + width / 2}
            y={y + height / 2 - (shouldDisplayPercentage ? 8 : 0)}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={textColor}
            fontSize={12}
            fontWeight="bold"
          >
            {formattedName}
          </text>
        )}
        {shouldDisplayPercentage && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 14}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={textColor}
            fontSize={12}
          >
            {`${percentage}%`}
          </text>
        )}
      </g>
    </AntTooltip>
  );
};

const LanguageTreemap = ({ languageData, loading }) => {
  const treemapData = prepareTreemapData(languageData);
  
  return (
    <Card 
      title={
        <span>
          <GlobalOutlined style={{ marginRight: 8 }} />
          Language Distribution
        </span>
      } 
      style={{ height: 360 }} 
      loading={loading}
    >
      {treemapData.children && treemapData.children.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <Treemap
            data={treemapData}
            dataKey="size"
            aspectRatio={4/3}
            stroke="#fff"
            fill="#8884d8"
            content={<CustomTreemapContent />}
            animationDuration={500}
          />
        </ResponsiveContainer>
      ) : (
        <Empty description="No language data available" style={{ marginTop: '100px' }} />
      )}
    </Card>
  );
};

export default LanguageTreemap;