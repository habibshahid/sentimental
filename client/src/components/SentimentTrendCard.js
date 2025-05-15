// SentimentTrendCard.js - Trend card for sentiment analysis
import React, { useEffect, useState } from 'react';
import { Card, Statistic, Typography, Tooltip, Progress } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined, SmileOutlined, MehOutlined, FrownOutlined } from '@ant-design/icons';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

const { Text } = Typography;

/**
 * SentimentTrendCard - Shows sentiment statistics with trend indicators
 * 
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {number} props.averageScore - Current sentiment score (-1 to 1)
 * @param {number} props.previousAverageScore - Previous period sentiment score
 * @param {Object} props.distribution - Current sentiment distribution {positive, neutral, negative}
 * @param {Object} props.previousDistribution - Previous period distribution
 * @param {Array} props.trendData - Array of sentiment data points for the mini chart
 * @param {boolean} props.loading - Loading state for the card
 */
const SentimentTrendCard = ({ 
  title = "Sentiment Analysis",
  averageScore = 0,
  previousAverageScore = 0,
  distribution = { positive: 0, neutral: 0, negative: 0 },
  previousDistribution = { positive: 0, neutral: 0, negative: 0 },
  trendData = [],
  loading = false
}) => {
  const [trend, setTrend] = useState({
    percentage: 0,
    isPositive: false,
    isNeutral: true,
    color: '#1890ff',
    label: 'unchanged'
  });

  // Calculate the total for percentages
  const total = distribution.positive + distribution.neutral + distribution.negative || 1;
  const previousTotal = previousDistribution.positive + previousDistribution.neutral + previousDistribution.negative || 1;
  
  // Calculate percentages
  const positivePercentage = (distribution.positive / total) * 100;
  const neutralPercentage = (distribution.neutral / total) * 100;
  const negativePercentage = (distribution.negative / total) * 100;
  
  const previousPositivePercentage = (previousDistribution.positive / previousTotal) * 100;

  // Calculate the sentiment trend when values change
  useEffect(() => {
    if (previousAverageScore !== undefined && previousAverageScore !== null) {
      const diff = averageScore - previousAverageScore;
      const change = diff !== 0 ? (Math.abs(diff) / (Math.abs(previousAverageScore) || 0.1)) * 100 : 0;
      
      let trendLabel = '';
      let trendColor = '';
      
      if (diff > 0.05) {
        trendLabel = 'more positive';
        trendColor = '#52c41a'; // Green
      } else if (diff < -0.05) {
        trendLabel = 'more negative';
        trendColor = '#f5222d'; // Red
      } else {
        trendLabel = 'similar';
        trendColor = '#1890ff'; // Blue
      }
      
      setTrend({
        percentage: Math.min(Math.abs(change), 999), // Cap at 999% to avoid huge numbers
        isPositive: diff > 0,
        isNeutral: Math.abs(diff) <= 0.05,
        color: trendColor,
        label: trendLabel
      });
    }
  }, [averageScore, previousAverageScore]);

  // Generate trend data if not provided
  const chartData = trendData.length > 0 ? trendData : [
    { value: (previousAverageScore + 1) / 2 * 100 || 50 }, // Normalize to 0-100
    { value: (previousAverageScore + averageScore + 2) / 4 * 100 || 50 },
    { value: (averageScore + 1) / 2 * 100 || 50 }
  ];

  // Generate a unique gradient ID for this card
  const gradientId = `sentimentTrend-${title.replace(/\s+/g, '')}`;
  
  // Get appropriate icon based on average score
  const getSentimentIcon = () => {
    if (averageScore > 0.3) return <SmileOutlined style={{ color: '#52c41a' }} />;
    if (averageScore < -0.3) return <FrownOutlined style={{ color: '#f5222d' }} />;
    return <MehOutlined style={{ color: '#1890ff' }} />;
  };
  
  // Format the score for display (-1 to 1 scale to percentage)
  const formatScore = (score) => {
    const normalized = ((score + 1) / 2 * 100).toFixed(1);
    return `${normalized}%`;
  };

  return (
    <Card style={{ height: '100%' }} loading={loading}>
      <Statistic
        title={title}
        value={formatScore(averageScore)}
        prefix={getSentimentIcon()}
        valueStyle={{ color: averageScore > 0.3 ? '#52c41a' : averageScore < -0.3 ? '#f5222d' : '#1890ff' }}
      />
      
      <div style={{ marginTop: '8px' }}>
        {previousAverageScore !== undefined && previousAverageScore !== null && (
          <Tooltip title={`Previous period: ${formatScore(previousAverageScore)}`}>
            {trend.isNeutral ? (
              <Text type="secondary">
                <MinusOutlined style={{ color: trend.color }} /> Sentiment remains {trend.label}
              </Text>
            ) : trend.isPositive ? (
              <Text type="success">
                <ArrowUpOutlined style={{ color: trend.color }} /> Sentiment is {trend.percentage.toFixed(1)}% {trend.label}
              </Text>
            ) : (
              <Text type="danger">
                <ArrowDownOutlined style={{ color: trend.color }} /> Sentiment is {trend.percentage.toFixed(1)}% {trend.label}
              </Text>
            )}
          </Tooltip>
        )}
        
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <SmileOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
            <Progress 
              percent={positivePercentage.toFixed(1)} 
              size="small" 
              status="success" 
              format={(percent) => `${percent}%`}
              style={{ flex: 1 }}
            />
            {previousDistribution.positive > 0 && (
              <Tooltip title={`Previous: ${previousPositivePercentage.toFixed(1)}%`}>
                <Text type="secondary" style={{ marginLeft: '8px', fontSize: '12px' }}>
                  {positivePercentage > previousPositivePercentage ? (
                    <ArrowUpOutlined style={{ color: '#52c41a' }} />
                  ) : positivePercentage < previousPositivePercentage ? (
                    <ArrowDownOutlined style={{ color: '#f5222d' }} />
                  ) : (
                    <MinusOutlined style={{ color: '#1890ff' }} />
                  )}
                </Text>
              </Tooltip>
            )}
          </div>
        </div>
        
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
    </Card>
  );
};

export default SentimentTrendCard;