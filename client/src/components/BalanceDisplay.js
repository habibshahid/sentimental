// src/components/BalanceDisplay.js
import React, { useState, useEffect } from 'react';
import { Card, Statistic, Descriptions, Badge, Tooltip, Typography, Spin } from 'antd';
import { DollarCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import BalanceService from '../services/apiService';
import dayjs from 'dayjs';

const { Text } = Typography;

/**
 * Component to display current API balance
 * 
 * @param {Object} props
 * @param {Function} props.onRefresh - Optional callback when refresh is triggered
 */
const BalanceDisplay = ({ onRefresh }) => {
  const [balanceData, setBalanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch balance data
  const fetchBalance = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await BalanceService.getCurrentBalance();
      
      if (data.error) {
        setError(data.error);
      } else {
        setBalanceData(data);
      }
    } catch (err) {
      setError('Failed to fetch balance data');
      console.error('Balance fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchBalance();
  }, []);

  // Handle refresh click
  const handleRefresh = () => {
    fetchBalance();
    if (onRefresh) onRefresh();
  };

  // Format currency with fixed decimals
  const formatCurrency = (value) => {
    if (value === undefined || value === null || isNaN(value)) return '$0.00';
    return `$${value.toFixed(4)}`;
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="small" />
          <div style={{ marginTop: '10px' }}>Loading balance...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="API Balance">
        <Text type="danger">{error}</Text>
      </Card>
    );
  }

  if (!balanceData) {
    return (
      <Card title="API Balance">
        <Text type="warning">No balance data available</Text>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <DollarCircleOutlined style={{ marginRight: 8 }} /> 
            API Credits Balance
          </span>
          <Tooltip title="Refresh balance">
            <ReloadOutlined 
              onClick={handleRefresh} 
              style={{ cursor: 'pointer' }} 
            />
          </Tooltip>
        </div>
      }
    >
      <Statistic
        value={balanceData.balance}
        precision={6}
        valueStyle={{ color: balanceData.balance > 1 ? '#3f8600' : '#cf1322' }}
        prefix="$"
        suffix={
          <Badge 
            status={balanceData.active ? "success" : "error"} 
            text={balanceData.active ? "Active" : "Inactive"} 
            style={{ marginLeft: '10px' }}
          />
        }
      />
      
      <Descriptions column={1} size="small" style={{ marginTop: '10px' }}>
        <Descriptions.Item label="Total Credits Added">
          {formatCurrency(balanceData.totalCreditsAdded)}
        </Descriptions.Item>
        <Descriptions.Item label="Total Credits Used">
          {formatCurrency(balanceData.totalCreditsUsed)}
        </Descriptions.Item>
        <Descriptions.Item label="Last Updated">
          {balanceData.lastUpdated ? dayjs(balanceData.lastUpdated).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}
        </Descriptions.Item>
        <Descriptions.Item label="Host">
          {window.location.hostname}
          <Badge 
            status={balanceData.hostExists ? "success" : "warning"} 
            style={{ marginLeft: '10px' }}
          />
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

export default BalanceDisplay;