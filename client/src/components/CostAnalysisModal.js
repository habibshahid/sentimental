// src/components/CostAnalysisModal.js
import React, { useState, useEffect } from 'react';
import { Modal, Table, Card, Statistic, Row, Col, Empty, Spin, Alert, Button, Space, Tabs } from 'antd';
import { DollarCircleOutlined, FileExcelOutlined, LineChartOutlined, TableOutlined, BarChartOutlined, PieChartOutlined, ApiOutlined } from '@ant-design/icons';
import { exportChartToExcel } from '../utils/ExportUtils';
import CostAnalysisChart from './CostAnalysisChart';
import ModelCostAnalysis from './ModelCostAnalysis';
import dayjs from 'dayjs';

/**
 * Modal component to display cost analysis data
 * 
 * @param {Object} props
 * @param {boolean} props.visible - Controls modal visibility
 * @param {Function} props.onClose - Handler for modal close
 * @param {Array} props.messages - Messages data containing usage information
 * @param {boolean} props.loading - Loading state
 */
const CostAnalysisModal = ({ visible, onClose, messages = [], loading = false }) => {
  const [costStats, setCostStats] = useState({
    totalPrice: 0,
    inputPrice: 0,
    outputPrice: 0,
    messagesWithCost: 0,
    averagePrice: 0,
    currency: 'USD',
    byModel: {},
    byDate: {},
  });
  const [activeTab, setActiveTab] = useState('summary');
  const [chartType, setChartType] = useState('line');
  const [modelViewType, setModelViewType] = useState('pie');

  // Calculate cost statistics when messages change
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    
    const stats = calculateCostStats(messages);
    setCostStats(stats);
  }, [messages]);

  // Calculate cost statistics from messages data
  const calculateCostStats = (messages) => {
    let totalPrice = 0;
    let inputPrice = 0;
    let outputPrice = 0;
    let messagesWithCost = 0;
    let currency = 'USD';
    const byModel = {};
    const byDate = {};

    messages.forEach(message => {
      // Safely access nested properties using optional chaining
      const priceData = message?.extraPayload?.sentimentAnalysis?.cost;
      
      if (priceData && typeof priceData === 'object') {
        // Only count messages with valid price data
        if (priceData.totalPrice && !isNaN(priceData.totalPrice)) {
          totalPrice += priceData.totalPrice;
          inputPrice += priceData.inputPrice || 0;
          outputPrice += priceData.outputPrice || 0;
          messagesWithCost++;
          currency = priceData.currency || 'USD';
          
          // Group by model
          const model = message?.extraPayload?.sentimentAnalysis?.requestDetails?.model || 'unknown';
          if (!byModel[model]) {
            byModel[model] = {
              count: 0,
              totalPrice: 0,
              inputPrice: 0,
              outputPrice: 0
            };
          }
          byModel[model].count++;
          byModel[model].totalPrice += priceData.totalPrice;
          byModel[model].inputPrice += priceData.inputPrice || 0;
          byModel[model].outputPrice += priceData.outputPrice || 0;
          
          // Group by date
          const date = dayjs(message.createdAt).format('YYYY-MM-DD');
          if (!byDate[date]) {
            byDate[date] = {
              count: 0,
              totalPrice: 0,
              inputPrice: 0,
              outputPrice: 0
            };
          }
          byDate[date].count++;
          byDate[date].totalPrice += priceData.totalPrice;
          byDate[date].inputPrice += priceData.inputPrice || 0;
          byDate[date].outputPrice += priceData.outputPrice || 0;
        }
      }
    });

    // Calculate average price
    const averagePrice = messagesWithCost > 0 ? totalPrice / messagesWithCost : 0;

    // Format date statistics for table
    const dateStats = Object.keys(byDate).map(date => ({
      date,
      ...byDate[date],
      averagePrice: byDate[date].count > 0 ? byDate[date].totalPrice / byDate[date].count : 0
    })).sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));

    // Format model statistics for table
    const modelStats = Object.keys(byModel).map(model => ({
      model,
      ...byModel[model],
      averagePrice: byModel[model].count > 0 ? byModel[model].totalPrice / byModel[model].count : 0
    })).sort((a, b) => b.count - a.count);

    return {
      totalPrice,
      inputPrice,
      outputPrice,
      messagesWithCost,
      averagePrice,
      currency,
      byModel: modelStats,
      byDate: dateStats
    };
  };

  // Format currency with fixed decimals
  const formatCurrency = (value) => {
    if (isNaN(value)) return `0.00 ${costStats.currency}`;
    return `${value.toFixed(6)} ${costStats.currency}`;
  };

  // Format percentage
  const formatPercentage = (value, total) => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  // Export cost data to Excel
  const exportCostData = () => {
    // Combine date and model statistics
    const exportData = [
      // Summary row
      {
        category: 'Total',
        messages: costStats.messagesWithCost,
        totalPrice: costStats.totalPrice,
        inputPrice: costStats.inputPrice,
        outputPrice: costStats.outputPrice,
        averagePrice: costStats.averagePrice
      },
      // Spacer row
      {},
      // Header row for dates
      { category: 'By Date' },
      // Date rows
      ...costStats.byDate.map(item => ({
        category: item.date,
        messages: item.count,
        totalPrice: item.totalPrice,
        inputPrice: item.inputPrice,
        outputPrice: item.outputPrice,
        averagePrice: item.averagePrice
      })),
      // Spacer row
      {},
      // Header row for models
      { category: 'By Model' },
      // Model rows
      ...costStats.byModel.map(item => ({
        category: item.model,
        messages: item.count,
        totalPrice: item.totalPrice,
        inputPrice: item.inputPrice,
        outputPrice: item.outputPrice,
        averagePrice: item.averagePrice
      }))
    ];

    const columns = [
      { title: 'Category', dataKey: 'category' },
      { title: 'Messages', dataKey: 'messages' },
      { title: 'Total Price', dataKey: 'totalPrice' },
      { title: 'Input Price', dataKey: 'inputPrice' },
      { title: 'Output Price', dataKey: 'outputPrice' },
      { title: 'Average Price', dataKey: 'averagePrice' }
    ];

    exportChartToExcel(exportData, `sentiment-cost-analysis-${dayjs().format('YYYY-MM-DD')}`, columns);
  };

  // Define columns for the cost by date table
  const dateColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
    },
    {
      title: 'Messages',
      dataIndex: 'count',
      key: 'count',
      width: 100,
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: 'Total Price',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      render: (text) => formatCurrency(text),
      sorter: (a, b) => a.totalPrice - b.totalPrice,
    },
    {
      title: 'Average Price',
      dataIndex: 'averagePrice',
      key: 'averagePrice',
      render: (text) => formatCurrency(text),
      sorter: (a, b) => a.averagePrice - b.averagePrice,
    },
    {
      title: 'Input/Output Split',
      key: 'split',
      render: (_, record) => (
        <>
          <div>Input: {formatCurrency(record.inputPrice)} ({formatPercentage(record.inputPrice, record.totalPrice)})</div>
          <div>Output: {formatCurrency(record.outputPrice)} ({formatPercentage(record.outputPrice, record.totalPrice)})</div>
        </>
      ),
    },
  ];

  // Define columns for the cost by model table
  const modelColumns = [
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      ellipsis: true,
    },
    {
      title: 'Messages',
      dataIndex: 'count',
      key: 'count',
      width: 100,
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: 'Total Price',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      render: (text) => formatCurrency(text),
      sorter: (a, b) => a.totalPrice - b.totalPrice,
    },
    {
      title: 'Average Price',
      dataIndex: 'averagePrice',
      key: 'averagePrice',
      render: (text) => formatCurrency(text),
      sorter: (a, b) => a.averagePrice - b.averagePrice,
    },
  ];

  return (
    <Modal
      title={<span><DollarCircleOutlined style={{ marginRight: 8 }} /> Sentiment Analysis Cost Report</span>}
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="export" icon={<FileExcelOutlined />} onClick={exportCostData} disabled={costStats.messagesWithCost === 0}>
          Export Cost Data
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          Close
        </Button>
      ]}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px' }}>
          <Spin size="large" tip="Loading cost data..." />
        </div>
      ) : costStats.messagesWithCost === 0 ? (
        <Alert
          message="No Cost Data Available"
          description="There is no price information available in the current message set. Cost information is only available for messages processed with AI models that provide price details."
          type="info"
          showIcon
        />
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Total Cost"
                  value={formatCurrency(costStats.totalPrice)}
                  precision={6}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<DollarCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Messages with Cost Data"
                  value={costStats.messagesWithCost}
                  suffix={`/ ${messages.length}`}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Average Cost per Message"
                  value={formatCurrency(costStats.averagePrice)}
                  precision={6}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12}>
              <Statistic
                title="Input Price Total"
                value={formatCurrency(costStats.inputPrice)}
                precision={6}
              />
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                ({formatPercentage(costStats.inputPrice, costStats.totalPrice)} of total cost)
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <Statistic
                title="Output Price Total"
                value={formatCurrency(costStats.outputPrice)}
                precision={6}
              />
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                ({formatPercentage(costStats.outputPrice, costStats.totalPrice)} of total cost)
              </div>
            </Col>
          </Row>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'summary',
                label: (
                  <span>
                    <TableOutlined />
                    Tabular Data
                  </span>
                ),
                children: (
                  <>
                    <h3>Cost by Date</h3>
                    <Table
                      dataSource={costStats.byDate}
                      columns={dateColumns}
                      rowKey="date"
                      pagination={{ pageSize: 5 }}
                      size="small"
                    />

                    
                  </>
                ),
              },
              {
                key: 'chart',
                label: (
                  <span>
                    <LineChartOutlined />
                    Cost Over Time
                  </span>
                ),
                children: (
                  <CostAnalysisChart 
                    messages={messages} 
                    loading={loading}
                    chartType={chartType}
                    onChartTypeChange={setChartType}
                  />
                ),
              },
              {
                key: 'models',
                label: (
                  <span>
                    <ApiOutlined />
                    Model Analysis
                  </span>
                ),
                children: (
                  <ModelCostAnalysis
                    modelData={costStats.byModel}
                    loading={loading}
                    viewType={modelViewType}
                    onViewTypeChange={setModelViewType}
                  />
                ),
              }
            ]}
          />
        </>
      )}
    </Modal>
  );
};

export default CostAnalysisModal;