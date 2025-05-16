// src/components/ModelCostAnalysis.js
import React from 'react';
import { Card, Empty, Tooltip } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ApiOutlined } from '@ant-design/icons';

/**
 * Component to visualize cost data distribution by AI model
 * 
 * @param {Object} props
 * @param {Array} props.modelData - Cost data grouped by model
 * @param {string} props.viewType - 'pie' or 'bar'
 * @param {Function} props.onViewTypeChange - Handler for view type change
 * @param {boolean} props.loading - Loading state
 */
const ModelCostAnalysis = ({ 
  modelData = [], 
  viewType = 'pie',
  onViewTypeChange,
  loading = false 
}) => {
  // Prepare colors for models
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#83a6ed', '#8dd1e1'];
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.totalPrice / modelData.reduce((sum, item) => sum + item.totalPrice, 0)) * 100).toFixed(1);
      
      return (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '10px', 
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #eee', marginBottom: '8px', paddingBottom: '4px' }}>
            {data.model}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>Messages: <strong>{data.count}</strong></div>
            <div>Total Price: <strong>{data.totalPrice.toFixed(6)} USD</strong> ({percentage}%)</div>
            <div>Average Cost: <strong>{data.averagePrice.toFixed(8)} USD</strong> per message</div>
            <div>Input Price: <strong>{data.inputPrice.toFixed(6)} USD</strong></div>
            <div>Output Price: <strong>{data.outputPrice.toFixed(6)} USD</strong></div>
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  // Format model name for display
  const formatModelName = (name) => {
    if (!name) return 'Unknown Model';
    
    // Trim excessively long model names for display
    if (name.length > 20) {
      return name.substring(0, 17) + '...';
    }
    
    return name;
  };
  
  // Render pie chart view
  const renderPieChart = () => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={modelData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="totalPrice"
            nameKey="model"
            label={({ name, percent }) => `${formatModelName(name)}: ${(percent * 100).toFixed(1)}%`}
          >
            {modelData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <RechartsTooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  };
  
  // Render bar chart view
  const renderBarChart = () => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={modelData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis 
            dataKey="model" 
            type="category" 
            width={120}
            tick={props => {
              const { x, y, payload } = props;
              const displayName = formatModelName(payload.value);
              
              return (
                <Tooltip title={payload.value} placement="left">
                  <text x={x} y={y} dy={4} textAnchor="end" fill="#666" fontSize={12}>
                    {displayName}
                  </text>
                </Tooltip>
              );
            }}
          />
          <RechartsTooltip content={<CustomTooltip />} />
          <Bar dataKey="totalPrice" name="Cost" fill="#1890ff" />
        </BarChart>
      </ResponsiveContainer>
    );
  };
  
  // Render the appropriate view
  const renderView = () => {
    if (!modelData || modelData.length === 0) {
      return <Empty description="No model cost data available" style={{ marginTop: '100px' }} />;
    }
    
    return viewType === 'pie' ? renderPieChart() : renderBarChart();
  };
  
  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <ApiOutlined style={{ marginRight: 8 }} />
            Cost by Model
          </span>
          {onViewTypeChange && (
            <div className="chart-view-controls">
              <div
                className={`view-control ${viewType === 'pie' ? 'active' : ''}`}
                onClick={() => onViewTypeChange('pie')}
                style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '2px', display: 'inline-block' }}
              >
                Pie
              </div>
              <div
                className={`view-control ${viewType === 'bar' ? 'active' : ''}`}
                onClick={() => onViewTypeChange('bar')}
                style={{ 
                  cursor: 'pointer', 
                  padding: '4px 8px', 
                  borderRadius: '2px', 
                  display: 'inline-block',
                  marginLeft: '8px',
                  background: viewType === 'bar' ? '#e6f7ff' : 'transparent',
                  color: viewType === 'bar' ? '#1890ff' : 'inherit',
                  border: viewType === 'bar' ? '1px solid #1890ff' : '1px solid transparent'
                }}
              >
                Bar
              </div>
            </div>
          )}
        </div>
      }
      loading={loading}
    >
      {renderView()}
    </Card>
  );
};

export default ModelCostAnalysis;