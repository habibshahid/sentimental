// src/components/CostAnalysisWidget.js
import React from 'react';
import { Card, Statistic, Row, Col, Progress, Button, Tooltip, Empty } from 'antd';
import { DollarCircleOutlined, ArrowUpOutlined, ArrowDownOutlined, InfoCircleOutlined } from '@ant-design/icons';

/**
 * Dashboard widget to display cost analysis summary
 * 
 * @param {Object} props
 * @param {Array} props.messages - Messages data containing cost information
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onViewDetails - Handler for view details button click
 */
const CostAnalysisWidget = ({ messages = [], loading = false, onViewDetails }) => {
  // Calculate cost statistics from messages
  const calculateCostStats = () => {
    let totalPrice = 0;
    let inputPrice = 0;
    let outputPrice = 0;
    let messagesWithCost = 0;
    const modelCounts = {};
    
    messages.forEach(message => {
      const priceData = message?.extraPayload?.sentimentAnalysis?.cost;
      
      if (priceData && typeof priceData === 'object') {
        if (priceData.totalPrice && !isNaN(priceData.totalPrice)) {
          totalPrice += priceData.totalPrice;
          inputPrice += priceData.inputPrice || 0;
          outputPrice += priceData.outputPrice || 0;
          messagesWithCost++;
          
          // Track model usage
          const model = message?.extraPayload?.sentimentAnalysis?.requestDetails?.model || 'unknown';
          modelCounts[model] = (modelCounts[model] || 0) + 1;
        }
      }
    });
    
    // Calculate average price
    const averagePrice = messagesWithCost > 0 ? totalPrice / messagesWithCost : 0;
    
    // Get most used model
    let mostUsedModel = 'Unknown';
    let maxCount = 0;
    Object.entries(modelCounts).forEach(([model, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostUsedModel = model;
      }
    });
    
    return {
      totalPrice,
      inputPrice,
      outputPrice,
      averagePrice,
      messagesWithCost,
      totalMessages: messages.length,
      mostUsedModel,
      modelCount: maxCount
    };
  };
  
  const costStats = calculateCostStats();
  
  // Format currency with fixed decimals
  const formatCurrency = (value) => {
    if (isNaN(value)) return `$0.00`;
    return `$${value.toFixed(6)}`;
  };
  
  // Format model name
  const formatModelName = (name) => {
    if (!name) return 'Unknown';
    
    if (name.length > 15) {
      return name.substring(0, 12) + '...';
    }
    
    return name;
  };
  
  // Calculate stats for display
  const percentMessagesWithCost = costStats.totalMessages > 0 
    ? (costStats.messagesWithCost / costStats.totalMessages) * 100 
    : 0;
  
  const inputPercentage = costStats.totalPrice > 0 
    ? (costStats.inputPrice / costStats.totalPrice) * 100 
    : 0;
  
  // Handle no cost data scenario
  if (costStats.messagesWithCost === 0) {
    return (
      <Card 
        title={
          <span>
            <DollarCircleOutlined style={{ marginRight: 8 }} /> 
            Cost Analysis
            <Tooltip title="Shows the cost analysis for AI processing of messages">
              <InfoCircleOutlined style={{ marginLeft: 8, color: '#8c8c8c' }} />
            </Tooltip>
          </span>
        }
        loading={loading}
        extra={
          <Button 
            type="link" 
            onClick={onViewDetails}
            size="small"
          >
            View Details
          </Button>
        }
      >
        <Empty 
          description="No cost data available" 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
        />
      </Card>
    );
  }
  
  return (
    <Card 
      title={
        <span>
          <DollarCircleOutlined style={{ marginRight: 8 }} /> 
          Cost Analysis
          <Tooltip title="Shows the cost analysis for AI processing of messages">
            <InfoCircleOutlined style={{ marginLeft: 8, color: '#8c8c8c' }} />
          </Tooltip>
        </span>
      }
      loading={loading}
      extra={
        <Button 
          type="link" 
          onClick={onViewDetails}
          size="small"
        >
          View Details
        </Button>
      }
    >
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Statistic
            title="Total Cost"
            value={formatCurrency(costStats.totalPrice)}
            precision={6}
            valueStyle={{ color: '#3f8600', fontSize: '18px' }}
            prefix={<DollarCircleOutlined />}
          />
          <div style={{ marginTop: 8 }}>
            <Progress 
              percent={percentMessagesWithCost.toFixed(1)} 
              size="small" 
              format={() => `${costStats.messagesWithCost}/${costStats.totalMessages} messages`}
            />
          </div>
        </Col>
        <Col span={12}>
          <Statistic
            title="Avg Cost/Message"
            value={formatCurrency(costStats.averagePrice)}
            valueStyle={{ color: '#1890ff', fontSize: '18px' }}
          />
          <div style={{ marginTop: 8 }}>
            <Tooltip title={costStats.mostUsedModel}>
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                Most used model: {formatModelName(costStats.mostUsedModel)}
              </div>
            </Tooltip>
          </div>
        </Col>
      </Row>
      
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>Input/Output Split</div>
          <div>{inputPercentage.toFixed(1)}% / {(100 - inputPercentage).toFixed(1)}%</div>
        </div>
        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ 
            width: `${inputPercentage}%`, 
            backgroundColor: '#52c41a', 
            transition: 'width 0.3s ease' 
          }} />
          <div style={{ 
            width: `${100 - inputPercentage}%`, 
            backgroundColor: '#1890ff', 
            transition: 'width 0.3s ease' 
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '12px', color: '#8c8c8c' }}>
          <div>Input: {formatCurrency(costStats.inputPrice)}</div>
          <div>Output: {formatCurrency(costStats.outputPrice)}</div>
        </div>
      </div>
    </Card>
  );
};

export default CostAnalysisWidget;