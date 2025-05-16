// src/components/CostAnalysisChart.js
import React from 'react';
import { Card, Empty, Radio, Space } from 'antd';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarCircleOutlined, LineChartOutlined, BarChartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

/**
 * Component to visualize cost data over time
 * 
 * @param {Object} props
 * @param {Array} props.messages - Messages data containing cost information
 * @param {boolean} props.loading - Loading state
 * @param {string} props.chartType - 'line' or 'bar'
 * @param {Function} props.onChartTypeChange - Handler for chart type change
 */
const CostAnalysisChart = ({ 
  messages = [], 
  loading = false, 
  chartType = 'line',
  onChartTypeChange
}) => {
  // Prepare data for chart
  const prepareCostData = () => {
    if (!messages || messages.length === 0) return [];
    
    // Group messages by date
    const costByDate = {};
    
    messages.forEach(message => {
      if (!message.createdAt) return;
      
      const date = dayjs(message.createdAt).format('YYYY-MM-DD');
      const priceData = message?.extraPayload?.sentimentAnalysis?.cost;
      
      if (!costByDate[date]) {
        costByDate[date] = {
          date,
          count: 0,
          totalPrice: 0,
          inputPrice: 0,
          outputPrice: 0
        };
      }
      
      costByDate[date].count++;
      
      if (priceData && typeof priceData === 'object') {
        if (priceData.totalPrice && !isNaN(priceData.totalPrice)) {
          costByDate[date].totalPrice += priceData.totalPrice;
          costByDate[date].inputPrice += priceData.inputPrice || 0;
          costByDate[date].outputPrice += priceData.outputPrice || 0;
        }
      }
    });
    
    // Convert to array and sort by date
    return Object.values(costByDate)
      .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  };
  
  const chartData = prepareCostData();
  
  // Format tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '10px', 
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #eee', marginBottom: '8px', paddingBottom: '4px' }}>
            {data.date}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>Messages: <strong>{data.count}</strong></div>
            <div>Total Price: <strong>{data.totalPrice.toFixed(6)} USD</strong></div>
            <div>Input Price: <strong>{data.inputPrice.toFixed(6)} USD</strong> ({((data.inputPrice / data.totalPrice) * 100).toFixed(1)}%)</div>
            <div>Output Price: <strong>{data.outputPrice.toFixed(6)} USD</strong> ({((data.outputPrice / data.totalPrice) * 100).toFixed(1)}%)</div>
            {data.count > 0 && (
              <div>Cost per Message: <strong>{(data.totalPrice / data.count).toFixed(8)} USD</strong></div>
            )}
            {data.movingAverage && (
              <div>5-day Avg: <strong>{data.movingAverage.toFixed(6)} USD</strong></div>
            )}
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  // Render appropriate chart type
  const renderChart = () => {
    if (chartData.length === 0) {
      return <Empty description="No cost data available" style={{ marginTop: '100px' }} />;
    }
    
    // Calculate moving average for trend line (5-day average)
    const dataWithMovingAverage = chartData.map((item, index, array) => {
      // Calculate 5-day moving average if we have enough data points
      let movingAvg = item.totalPrice;
      if (array.length >= 5) {
        // Get window of 5 elements with current item in center if possible
        const startIdx = Math.max(0, index - 2);
        const endIdx = Math.min(array.length - 1, index + 2);
        const window = array.slice(startIdx, endIdx + 1);
        
        // Calculate average
        const sum = window.reduce((acc, curr) => acc + curr.totalPrice, 0);
        movingAvg = sum / window.length;
      }
      
      return {
        ...item,
        movingAverage: movingAvg
      };
    });
    
    // Calculate cost per message
    const dataWithAvg = dataWithMovingAverage.map(item => ({
      ...item,
      averageCostPerMessage: item.count > 0 ? item.totalPrice / item.count : 0
    }));
    
    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dataWithAvg} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis 
              yAxisId="left"
              orientation="left"
              label={{ value: 'Price (USD)', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              label={{ value: 'Messages', angle: 90, position: 'insideRight' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="totalPrice" 
              name="Total Price" 
              stroke="#8884d8" 
              activeDot={{ r: 8 }} 
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="inputPrice" 
              name="Input Price" 
              stroke="#82ca9d" 
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="outputPrice" 
              name="Output Price" 
              stroke="#ffc658" 
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="movingAverage" 
              name="5-day Avg" 
              stroke="#ff7300" 
              strokeDasharray="5 5"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="count" 
              name="Message Count" 
              stroke="#ff0000"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={dataWithAvg} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis 
            yAxisId="left"
            orientation="left"
            label={{ value: 'Price (USD)', angle: -90, position: 'insideLeft' }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            label={{ value: 'Messages', angle: 90, position: 'insideRight' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar yAxisId="left" dataKey="inputPrice" name="Input Price" stackId="a" fill="#82ca9d" />
          <Bar yAxisId="left" dataKey="outputPrice" name="Output Price" stackId="a" fill="#ffc658" />
          <Bar yAxisId="right" dataKey="count" name="Message Count" fill="#ff0000" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <DollarCircleOutlined style={{ marginRight: 8 }} />
            Cost Analysis Over Time
          </span>
          {onChartTypeChange && (
            <Radio.Group 
              value={chartType} 
              onChange={(e) => onChartTypeChange(e.target.value)}
              size="small"
              buttonStyle="solid"
            >
              <Radio.Button value="line"><LineChartOutlined /></Radio.Button>
              <Radio.Button value="bar"><BarChartOutlined /></Radio.Button>
            </Radio.Group>
          )}
        </div>
      }
      loading={loading}
    >
      {renderChart()}
    </Card>
  );
};

export default CostAnalysisChart;