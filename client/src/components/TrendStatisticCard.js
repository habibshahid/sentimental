// Fixed TrendStatisticCard.js - with proper fill color
import React, { useEffect, useState } from 'react';
import { Card, Statistic, Typography, Tooltip } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

const { Text } = Typography;

/**
 * TrendStatisticCard - Shows a statistic with trend percentage and mini chart
 * 
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {number} props.value - Current value
 * @param {number} props.previousValue - Previous period value (for comparison)
 * @param {Array} props.trendData - Array of data points for the mini chart
 * @param {React.ReactNode} props.prefix - Icon prefix for the statistic
 * @param {string} props.color - Color for positive trends (default: '#52c41a')
 * @param {string} props.negativeColor - Color for negative trends (default: '#f5222d')
 * @param {string} props.neutralColor - Color for neutral trends (default: '#1890ff')
 * @param {boolean} props.loading - Loading state for the card
 * @param {Function} props.formatter - Value formatter function
 * @param {string} props.valueStyle - Additional styles for the value
 */
const TrendStatisticCard = ({ 
  title, 
  value, 
  previousValue, 
  trendData = [], 
  prefix, 
  color = '#52c41a',
  negativeColor = '#f5222d',
  neutralColor = '#1890ff',
  loading = false,
  formatter,
  valueStyle = {}
}) => {
  const [trend, setTrend] = useState({
    percentage: 0,
    isPositive: false,
    isNeutral: true,
    color: neutralColor
  });

  // Calculate the trend percentage when values change
  useEffect(() => {
    if (previousValue !== undefined && previousValue !== null && previousValue !== 0) {
      const diff = value - previousValue;
      const percentage = (diff / previousValue) * 100;
      
      setTrend({
        percentage: Math.abs(percentage),
        isPositive: percentage > 0,
        isNeutral: percentage === 0,
        color: percentage > 0 ? color : percentage < 0 ? negativeColor : neutralColor
      });
    }
  }, [value, previousValue, color, negativeColor, neutralColor]);

  // Generate trend data if not provided
  const chartData = trendData.length > 0 ? trendData : [
    { value: previousValue || 0 },
    { value: (previousValue + value) / 2 || 0 },
    { value: value || 0 }
  ];

  // Generate a unique gradient ID for this card
  const gradientId = `colorTrend-${title.replace(/\s+/g, '')}`;

  return (
    <Card style={{ height: '100%' }} loading={loading}>
      <Statistic
        title={title}
        value={value}
        prefix={prefix}
        formatter={formatter}
        valueStyle={{ ...valueStyle }}
      />
      
      {previousValue !== undefined && previousValue !== null && (
        <div style={{ marginTop: '8px' }}>
          <Tooltip title={`Previous period: ${previousValue}`}>
            {trend.isNeutral ? (
              <Text type="secondary">
                <MinusOutlined style={{ color: trend.color }} /> No change from previous period
              </Text>
            ) : trend.isPositive ? (
              <Text type="success">
                <ArrowUpOutlined style={{ color: trend.color }} /> {trend.percentage.toFixed(2)}% more than previous period
              </Text>
            ) : (
              <Text type="danger">
                <ArrowDownOutlined style={{ color: trend.color }} /> {trend.percentage.toFixed(2)}% less than previous period
              </Text>
            )}
          </Tooltip>
          
          <div style={{ marginTop: '8px', height: '40px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={trend.color} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={trend.color} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={trend.color} 
                  fillOpacity={1} 
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Card>
  );
};

export default TrendStatisticCard;