// src/components/SentimentDashboard.js - Fixed version with proper null checking
import React, { useState, useEffect } from 'react';
import { Layout, Card, Row, Col, Typography, Select, DatePicker, Table, Tag, Statistic, Space, Button, Breadcrumb, Progress, List, Badge, Tooltip, Spin, Alert, Empty } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { MessageOutlined, UserOutlined, TeamOutlined, HomeOutlined, SmileOutlined, MehOutlined, FrownOutlined, AlertOutlined, GlobalOutlined, ReloadOutlined, DollarCircleOutlined } from '@ant-design/icons';
import apiService from '../services/apiService';
import ControlledDateRangePicker from './DatePicker'; 
import LanguageDistributionChart from './LanguageDonutChart'; 
import TrendStatisticCard from './TrendStatisticCard';
import SentimentTrendCard from './SentimentTrendCard';
import CostAnalysisModal from './CostAnalysisModal';
import ExportableChart from './ExportableChart';
import MessageTable from './MessageTable';
import { exportChartToCSV, exportChartToExcel, exportMessagesToExcel } from '../utils/ExportUtils';
import dayjs from 'dayjs';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;
const { RangePicker } = DatePicker;

// Function to generate word cloud for intents
const generateWordCloudData = (intents) => {
  if (!intents || !Array.isArray(intents) || intents.length === 0) return [];
  
  // Make sure we're working with valid data
  const validIntents = intents.filter(intent => 
    intent && typeof intent === 'object' && 
    intent.name && 
    typeof intent.value === 'number' && 
    !isNaN(intent.value)
  );

  if (validIntents.length === 0) return [];
  
  const maxFontSize = 42; // Reduced from 65
  const minFontSize = 14; // Reduced from 16
  
  // Find min and max count values
  const maxCount = Math.max(...validIntents.map(w => w.value));
  const minCount = Math.min(...validIntents.map(w => w.value));
  
  const range = maxCount - minCount || 1; // Avoid division by zero
  const fontSizeRange = maxFontSize - minFontSize;
  
  // Generate colors based on count
  const colors = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658'];
  
  return validIntents.map(intent => ({
    text: intent.name,
    value: intent.value,
    size: minFontSize + ((intent.value - minCount) / range) * fontSizeRange,
    color: colors[Math.floor(Math.random() * colors.length)]
  }));
};

// Helper function to safely access nested properties
const safelyGetNestedValue = (obj, path, defaultValue = null) => {
  try {
    return path.split('.').reduce((o, key) => (o && o[key] !== undefined) ? o[key] : null, obj) || defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const SentimentDashboard = () => {
  // State for data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [channels, setChannels] = useState([]);
  const [queues, setQueues] = useState([]);
  const [messages, setMessages] = useState([]);
  const [sentimentData, setSentimentData] = useState({ 
    distribution: [], 
    averageScore: 0, 
    radarData: [],
    total: 0
  });
  const [channelData, setChannelData] = useState([]);
  const [dayData, setDayData] = useState([]);
  const [languageData, setLanguageData] = useState([]);
  const [profanityData, setProfanityData] = useState({ 
    percentage: 0, 
    avgScore: 0, 
    topWords: [], 
    messagesWithProfanity: 0,
    totalMessages: 0
  });
  const [intentsData, setIntentsData] = useState([]);
  
  // State for UI
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'days'), dayjs()]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [breadcrumbItems, setBreadcrumbItems] = useState([{ title: 'Home' }]);
  const [costModalVisible, setCostModalVisible] = useState(false);
  // Load initial data
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  // Fetch data when filters change
  useEffect(() => {
    if (!loading && (channels.length > 0 || queues.length > 0)) {
      fetchFilteredData();
    }
  }, [selectedChannel, selectedQueue, dateRange]);
  
  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Prepare filters based on current selections
      const filters = {
        startDate: dateRange[0].toISOString(),
        endDate: dateRange[1].toISOString(),
        channel: selectedChannel,
        queue: selectedQueue
      };
      
      // Fetch all dashboard data in one call
      const dashboardData = await apiService.getDashboardData(filters);
      
      // Update state with received data
      setChannels(dashboardData.channels || []);
      setQueues(dashboardData.queues || []);
      setSentimentData(dashboardData.sentiment || { 
        distribution: [], 
        averageScore: 0, 
        radarData: [],
        total: 0
      });
      setChannelData(dashboardData.channelData || []);
      setDayData(dashboardData.dayData || []);
      setLanguageData(dashboardData.languageData || []);
      setProfanityData(dashboardData.profanityStats || { 
        percentage: 0, 
        avgScore: 0, 
        topWords: [], 
        messagesWithProfanity: 0,
        totalMessages: 0
      });
      setIntentsData(dashboardData.intentsData || []);
      
      // Fetch messages separately (with pagination)
      fetchMessages(1, filters);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch data with applied filters
  const fetchFilteredData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Prepare filters based on current selections
      const filters = {
        startDate: dateRange[0].toISOString(),
        endDate: dateRange[1].toISOString(),
        channel: selectedChannel,
        queue: selectedQueue
      };
      
      // Fetch all dashboard data in one call
      const dashboardData = await apiService.getDashboardData(filters);
      
      // Update state with received data (with safe defaults)
      setSentimentData(dashboardData.sentiment || { 
        distribution: [], 
        averageScore: 0, 
        radarData: [],
        total: 0
      });
      setChannelData(dashboardData.channelData || []);
      setDayData(dashboardData.dayData || []);
      setLanguageData(dashboardData.languageData || []);
      setProfanityData(dashboardData.profanityStats || { 
        percentage: 0, 
        avgScore: 0, 
        topWords: [], 
        messagesWithProfanity: 0,
        totalMessages: 0
      });
      setIntentsData(dashboardData.intentsData || []);
      
      // Fetch messages separately (with pagination)
      fetchMessages(1, filters);
      
    } catch (error) {
      console.error('Error fetching filtered data:', error);
      setError('Failed to load filtered data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch messages with pagination
  const fetchMessages = async (page = 1, customFilters = null) => {
    try {
      const filters = customFilters || {
        startDate: dateRange[0].toISOString(),
        endDate: dateRange[1].toISOString(),
        channel: selectedChannel,
        queue: selectedQueue
      };
      
      // Add filter to exclude system messages
      filters.excludeRole = 'system';
      
      const result = await apiService.getMessages(filters, page, pagination.pageSize);
      
      setMessages(result.messages || []);
      setPagination({
        ...pagination,
        current: page,
        total: result.pagination?.total || 0
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Don't set main error state here - just log it
    }
  };
  
  // Reset filters and reload data
  const resetFilters = () => {
    setSelectedChannel(null);
    setSelectedQueue(null);
    setDateRange([dayjs().subtract(30, 'days'), dayjs()]);
    setBreadcrumbItems([{ title: 'Home' }]);
    fetchDashboardData();
  };
  
  // Handle date range change
  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      console.log('Date range changed:', dates.map(date => date.format('YYYY-MM-DD')));
      setDateRange(dates);
    }
  };
  
  // Handle table pagination change
  const handleTableChange = (pagination, filters, sorter) => {
    fetchMessages(pagination.current);
  };
  
  // Show cost analysis modal
  const showCostModal = () => {
    setCostModalVisible(true);
  };

  // Hide cost analysis modal
  const hideCostModal = () => {
    setCostModalVisible(false);
  };

  // Define table columns with safe property access
  const columns = [
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
      sorter: (a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(a.createdAt) - new Date(b.createdAt);
      },
    },
    {
      title: 'Channel',
      dataIndex: 'channel',
      key: 'channel',
      filters: channels.map(channel => ({
        text: channel.name,
        value: channel.name,
      })),
      onFilter: (value, record) => record.channel === value,
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: 'Author',
      dataIndex: ['author', 'name'],
      key: 'author',
      render: (text, record) => safelyGetNestedValue(record, 'author.name', '-'),
    },
    {
      title: 'Role',
      dataIndex: ['author', 'role'],
      key: 'role',
      render: (text, record) => {
        const role = safelyGetNestedValue(record, 'author.role');
        return role ? <Tag color={role === 'agent' ? 'blue' : 'green'}>{role}</Tag> : '-';
      },
      filters: [
        { text: 'Agent', value: 'agent' },
        { text: 'Customer', value: 'customer' },
      ],
      onFilter: (value, record) => safelyGetNestedValue(record, 'author.role') === value,
    },
    {
      title: 'Direction',
      dataIndex: 'direction',
      key: 'direction',
      render: (text) => {
        if (text === undefined || text === null) return '-';
        return <Tag color={text === 0 ? 'purple' : 'orange'}>{text === 0 ? 'Inbound' : 'Outbound'}</Tag>;
      },
      filters: [
        { text: 'Inbound', value: 0 },
        { text: 'Outbound', value: 1 },
      ],
      onFilter: (value, record) => record.direction === value,
    },
    {
      title: 'Queue',
      dataIndex: 'queue',
      key: 'queue',
      filters: queues.map(queue => ({
        text: queue.name,
        value: queue.name,
      })),
      onFilter: (value, record) => record.queue === value,
    },
    {
      title: 'Sentiment',
      key: 'sentiment',
      render: (text, record) => {
        const sentiment = safelyGetNestedValue(record, 'extraPayload.sentimentAnalysis.sentiment.sentiment');
        const score = safelyGetNestedValue(record, 'extraPayload.sentimentAnalysis.sentiment.score', 0);
        
        if (!sentiment) return '-';
        
        let color = 'blue';
        let icon = <MehOutlined />;
        
        if (sentiment === 'positive') {
          color = 'success';
          icon = <SmileOutlined />;
        } else if (sentiment === 'negative') {
          color = 'error';
          icon = <FrownOutlined />;
        }
        
        return (
          <Tooltip title={`Score: ${score}`}>
            <Tag color={color} icon={icon}>
              {sentiment}
            </Tag>
          </Tooltip>
        );
      },
      filters: [
        { text: 'Positive', value: 'positive' },
        { text: 'Neutral', value: 'neutral' },
        { text: 'Negative', value: 'negative' },
      ],
      onFilter: (value, record) => safelyGetNestedValue(record, 'extraPayload.sentimentAnalysis.sentiment.sentiment') === value,
    },
    {
      title: 'Profanity',
      key: 'profanity',
      render: (text, record) => {
        const profanity = safelyGetNestedValue(record, 'extraPayload.sentimentAnalysis.profanity', {});
        const score = safelyGetNestedValue(profanity, 'score', 0);
        const words = safelyGetNestedValue(profanity, 'words', []);
        
        if (!profanity || score === 0) {
          return <Tag color="green">None</Tag>;
        }
        
        return (
          <Tooltip title={`Words: ${words.join(', ')}`}>
            <Tag color="volcano" icon={<AlertOutlined />}>
              {score.toFixed(2)}
            </Tag>
          </Tooltip>
        );
      },
      filters: [
        { text: 'Contains Profanity', value: 'hasProfanity' },
        { text: 'No Profanity', value: 'noProfanity' },
      ],
      onFilter: (value, record) => {
        const score = safelyGetNestedValue(record, 'extraPayload.sentimentAnalysis.profanity.score', 0);
        const hasProfanity = score > 0;
        return (value === 'hasProfanity' && hasProfanity) || (value === 'noProfanity' && !hasProfanity);
      },
    },
    {
      title: 'Intents',
      key: 'intents',
      render: (text, record) => {
        const intents = safelyGetNestedValue(record, 'extraPayload.sentimentAnalysis.intents', []);
        
        if (!intents || intents.length === 0) {
          return <Tag color="default">None</Tag>;
        }
        
        return (
          <>
            {intents.slice(0, 2).map(intent => (
              <Tag color="geekblue" key={intent}>
                {intent}
              </Tag>
            ))}
            {intents.length > 2 && <Tag>+{intents.length - 2}</Tag>}
          </>
        );
      },
      filters: Array.from(new Set(intentsData.map(item => item.name || ''))).filter(Boolean).map(intent => ({
        text: intent,
        value: intent,
      })),
      onFilter: (value, record) => {
        const intents = safelyGetNestedValue(record, 'extraPayload.sentimentAnalysis.intents', []);
        return intents && intents.includes(value);
      },
    },
    {
      title: 'Language',
      key: 'language',
      render: (text, record) => {
        const language = safelyGetNestedValue(record, 'extraPayload.sentimentAnalysis.language');
        return language ? <Tag icon={<GlobalOutlined />}>{language}</Tag> : '-';
      },
      filters: Array.from(new Set(languageData.map(item => item.name || ''))).filter(Boolean).map(language => ({
        text: language,
        value: language,
      })),
      onFilter: (value, record) => safelyGetNestedValue(record, 'extraPayload.sentimentAnalysis.language') === value,
    },
  ];
  
  
  // Get safe distribution values
  const getDistributionValue = (index, defaultValue = 0) => {
    if (!sentimentData.distribution || !Array.isArray(sentimentData.distribution) || !sentimentData.distribution[index]) {
      return defaultValue;
    }
    return sentimentData.distribution[index].value || defaultValue;
  };
  
  // Render full-page loading state
  if (loading && channels.length === 0 && queues.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Loading dashboard data..." />
      </div>
    );
  }
  
  // Render error state
  if (error && channels.length === 0 && queues.length === 0) {
    return (
      <div style={{ padding: '50px' }}>
        <Alert
          message="Error Loading Dashboard"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={fetchDashboardData}>
              Try Again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <MessageOutlined style={{ fontSize: '24px', marginRight: '12px', color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>Sentiment Analysis Dashboard</Title>
        </div>
        <Space>
          <Button 
            icon={<DollarCircleOutlined />} 
            onClick={showCostModal}
            disabled={loading}
          >
            Cost Analysis
          </Button>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchDashboardData}
            loading={loading}
          >
            Refresh Data
          </Button>
        </Space>
      </Header>
      <Content style={{ padding: '24px' }}>
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
            closable
          />
        )}
        <CostAnalysisModal 
          visible={costModalVisible} 
          onClose={hideCostModal} 
          messages={messages} 
          loading={loading}
        />
        <div style={{ marginBottom: '16px' }}>
          <Space>
            <ControlledDateRangePicker 
              value={dateRange} 
              onChange={handleDateRangeChange} 
              disabled={loading}
            />
            <Select 
              placeholder="Select Channel" 
              style={{ width: 200 }}
              allowClear
              value={selectedChannel}
              onChange={(value) => {
                setSelectedChannel(value);
                if (value && selectedQueue) {
                  setBreadcrumbItems([
                    { title: 'Home' },
                    { title: `Channel: ${value}` },
                    { title: `Queue: ${selectedQueue}` }
                  ]);
                } else if (value) {
                  setBreadcrumbItems([
                    { title: 'Home' },
                    { title: `Channel: ${value}` }
                  ]);
                } else if (selectedQueue) {
                  setBreadcrumbItems([
                    { title: 'Home' },
                    { title: `Queue: ${selectedQueue}` }
                  ]);
                } else {
                  setBreadcrumbItems([{ title: 'Home' }]);
                }
              }}
              loading={loading}
              disabled={loading}
              optionLabelProp="label"  // Use label for display in selection box
            >
              {channels.map(channel => (
                <Select.Option 
                  key={channel.channel} 
                  value={channel.channel}
                  label={channel.channel}  // This is what shows in the selection box
                >
                  {/* This is content shown in dropdown */}
                  <div>
                    <span>{channel.channel}</span>
                    {channel.description && (
                      <span style={{ color: '#999', fontSize: '0.9em', marginLeft: '5px' }}>
                        ({channel.description})
                      </span>
                    )}
                  </div>
                </Select.Option>
              ))}
            </Select>
            <Select 
              placeholder="Select Queue" 
              style={{ width: 200 }}
              allowClear
              value={selectedQueue}
              onChange={(value) => {
                setSelectedQueue(value);
                if (value && selectedChannel) {
                  setBreadcrumbItems([
                    { title: 'Home' },
                    { title: `Channel: ${selectedChannel}` },
                    { title: `Queue: ${value}` }
                  ]);
                } else if (value) {
                  setBreadcrumbItems([
                    { title: 'Home' },
                    { title: `Queue: ${value}` }
                  ]);
                } else if (selectedChannel) {
                  setBreadcrumbItems([
                    { title: 'Home' },
                    { title: `Channel: ${selectedChannel}` }
                  ]);
                } else {
                  setBreadcrumbItems([{ title: 'Home' }]);
                }
              }}
              loading={loading}
              disabled={loading}
            >
              {queues.map(queue => (
                <Select.Option key={queue.id} value={queue.name}>{queue.name}</Select.Option>
              ))}
            </Select>
            <Button type="primary" onClick={resetFilters} disabled={loading}>
              Reset Filters
            </Button>
          </Space>
        </div>
        
        {/* Statistics Row */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={8}>
            <TrendStatisticCard
              title="Total Messages"
              value={sentimentData.total || 0}
              previousValue={(sentimentData.total || 0) * 0.85} // Demo calculation
              trendData={[
                { value: (sentimentData.total || 0) * 0.75 },
                { value: (sentimentData.total || 0) * 0.85 },
                { value: (sentimentData.total || 0) * 0.9 },
                { value: (sentimentData.total || 0) * 0.95 },
                { value: sentimentData.total || 0 }
              ]}
              prefix={<MessageOutlined style={{ color: '#1890ff' }} />}
              loading={loading}
              color="#1890ff"
            />
          </Col>
          <Col xs={24} sm={8}>
            <SentimentTrendCard
              title="Overall Sentiment"
              averageScore={sentimentData.averageScore || 0}
              previousAverageScore={(sentimentData.averageScore || 0) * 0.9} // Demo value
              distribution={{
                positive: getDistributionValue(0, 0),
                neutral: getDistributionValue(1, 0),
                negative: getDistributionValue(2, 0)
              }}
              previousDistribution={{
                positive: getDistributionValue(0, 0) * 0.85, // Demo values
                neutral: getDistributionValue(1, 0) * 1.1,
                negative: getDistributionValue(2, 0) * 0.95
              }}
              trendData={[
                { value: ((sentimentData.averageScore || 0) * 0.9 + 1) / 2 * 100 },
                { value: ((sentimentData.averageScore || 0) * 0.95 + 1) / 2 * 100 },
                { value: ((sentimentData.averageScore || 0) + 1) / 2 * 100 }
              ]}
              loading={loading}
            />
          </Col>
          <Col xs={24} sm={8}>
            <SentimentTrendCard
              title="Channel Sentiment"
              averageScore={dayData.length > 0 ? dayData.reduce((sum, day) => sum + (day.positive - day.negative) / (day.total || 1), 0) / dayData.length : 0}
              previousAverageScore={dayData.length > 0 ? dayData.reduce((sum, day) => sum + (day.positive - day.negative) / (day.total || 1), 0) / dayData.length * 0.85 : 0}
              distribution={{
                positive: dayData.reduce((sum, day) => sum + day.positive, 0),
                neutral: dayData.reduce((sum, day) => sum + day.neutral, 0),
                negative: dayData.reduce((sum, day) => sum + day.negative, 0)
              }}
              previousDistribution={{
                positive: dayData.reduce((sum, day) => sum + day.positive, 0) * 0.9,
                neutral: dayData.reduce((sum, day) => sum + day.neutral, 0) * 1.05,
                negative: dayData.reduce((sum, day) => sum + day.negative, 0) * 0.95
              }}
              trendData={dayData.slice(-8).map(day => ({
                value: ((day.positive - day.negative) / (day.total || 1) + 1) / 2 * 100
              }))}
              loading={loading}
            />
          </Col>
        </Row>
        
        {/* Sentiment and Language Row */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} lg={8}>
            <Card title="Overall Sentiment Analysis" style={{ height: 400 }} loading={loading}>
              {sentimentData.radarData && Array.isArray(sentimentData.radarData) && sentimentData.radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart outerRadius={90} data={sentimentData.radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                    <Radar name="Sentiment Metrics" dataKey="A" stroke="#1890ff" fill="#1890ff" fillOpacity={0.6} />
                    <RechartsTooltip />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="No sentiment data available" style={{ marginTop: '100px' }} />
              )}
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <Tag color={sentimentData.averageScore > 0.3 ? 'success' : sentimentData.averageScore < -0.3 ? 'error' : 'blue'}>
                  Average Score: {sentimentData.averageScore ? sentimentData.averageScore.toFixed(2) : '0.00'}
                </Tag>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Sentiment Distribution" style={{ height: 400 }} loading={loading}>
              {sentimentData.distribution && Array.isArray(sentimentData.distribution) && sentimentData.distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={sentimentData.distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {sentimentData.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="No sentiment data available" style={{ marginTop: '100px' }} />
              )}
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <Space>
                  <Tag icon={<SmileOutlined />} color="success">Positive: {getDistributionValue(0)}</Tag>
                  <Tag icon={<MehOutlined />} color="blue">Neutral: {getDistributionValue(1)}</Tag>
                  <Tag icon={<FrownOutlined />} color="error">Negative: {getDistributionValue(2)}</Tag>
                </Space>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <LanguageDistributionChart languageData={languageData} loading={loading} />
          </Col>
        </Row>
        
        {/* Time and Channel Analysis Row */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} lg={12}>
            <Card  title="Daily Sentiment Breakdown" style={{ height: 460 }} loading={loading}>
              {dayData && Array.isArray(dayData) && dayData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={dayData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="positive" stackId="a" fill="#52c41a" name="Positive" />
                    <Bar dataKey="neutral" stackId="a" fill="#1890ff" name="Neutral" />
                    <Bar dataKey="negative" stackId="a" fill="#f5222d" name="Negative" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="No daily data available" style={{ marginTop: '100px' }} />
              )}
            </Card >
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Channel Sentiment Breakdown" style={{ height: 460 }} loading={loading}>
              {channelData && Array.isArray(channelData) && channelData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={channelData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="positive" stackId="a" fill="#52c41a" name="Positive" />
                    <Bar dataKey="neutral" stackId="a" fill="#1890ff" name="Neutral" />
                    <Bar dataKey="negative" stackId="a" fill="#f5222d" name="Negative" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="No channel data available" style={{ marginTop: '100px' }} />
              )}
            </Card>
          </Col>
        </Row>
        
        {/* Intent Analysis Row */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} lg={12}>
            <Card title="Intent Analysis Word Cloud" style={{ height: 360 }} loading={loading}>
              {intentsData && Array.isArray(intentsData) && intentsData.length > 0 ? (
                <div style={{ 
                  width: '100%', 
                  height: 300, 
                  position: 'relative', 
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px'
                }}>
                  {generateWordCloudData(intentsData).map((word, index) => (
                    <div 
                      key={index}
                      style={{
                        margin: '5px 8px',
                        fontSize: `${word.size}px`,
                        color: word.color,
                        fontWeight: Math.random() > 0.7 ? 'bold' : 'normal',
                        textShadow: '1px 1px 1px rgba(0,0,0,0.1)',
                        whiteSpace: 'nowrap',
                        transform: `rotate(${Math.random() * 20 - 10}deg)`,
                        display: 'inline-block',
                        cursor: 'default'
                      }}
                    >
                      {word.text}
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description="No intent data available" style={{ marginTop: '100px' }} />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Top User Intents" style={{ height: 360 }} loading={loading}>
              {intentsData && Array.isArray(intentsData) && intentsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={intentsData.slice(0, 8)} // Show top 8 intents
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#8884d8" name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="No intent data available" style={{ marginTop: '100px' }} />
              )}
            </Card>
          </Col>
        </Row>
        
        {/* Profanity Analysis Row */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} lg={8}>
            <Card title="Profanity Overview" style={{ height: 460 }} loading={loading}>
              <div style={{ marginBottom: '20px' }}>
                <h4>Messages with Profanity</h4>
                <Progress 
                  percent={profanityData.percentage ? profanityData.percentage.toFixed(1) : 0}
                  status={profanityData.percentage > 10 ? "exception" : "active"}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <h4>Average Profanity Score</h4>
                <Progress 
                  percent={profanityData.avgScore ? (profanityData.avgScore * 100).toFixed(1) : 0}
                  status={profanityData.avgScore > 0.3 ? "exception" : "active"}
                />
              </div>
              {profanityData.messagesWithProfanity > 0 ? (
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Clean', value: sentimentData.total - profanityData.messagesWithProfanity, color: '#52c41a' },
                        { name: 'Profane', value: profanityData.messagesWithProfanity, color: '#f5222d' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      <Cell fill="#52c41a" />
                      <Cell fill="#f5222d" />
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', marginTop: '30px' }}>
                  <Empty description="No profanity detected" />
                </div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={16}>
            <Card title="Top Profane Words" style={{ height: 460, overflow: 'auto' }} loading={loading}>
              {profanityData.topWords && Array.isArray(profanityData.topWords) && profanityData.topWords.length > 0 ? (
                <div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={profanityData.topWords.slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="word" type="category" />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="#ff4d4f" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: '20px' }}>
                    <List
                      grid={{ gutter: 16, column: 4 }}
                      dataSource={profanityData.topWords.slice(0, 8)}
                      renderItem={item => (
                        <List.Item>
                          <Tag color="volcano" style={{ margin: '5px' }}>
                            {item.word} <Badge count={item.count} style={{ backgroundColor: '#ff4d4f' }} />
                          </Tag>
                        </List.Item>
                      )}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', paddingTop: '100px' }}>
                  <Empty description="No profanity detected in the current data set" />
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Message Details Table */}
        <Card 
          title="Message Details" 
          style={{ marginBottom: '24px' }}
          extra={
            <div>
              <span style={{ marginRight: '10px' }}>Total: {pagination.total} messages</span>
            </div>
          }
        >
          <Table 
            dataSource={messages} 
            columns={columns}
            rowKey="_id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
            }}
            onChange={handleTableChange}
            scroll={{ x: 1300 }}
            loading={loading}
          />
        </Card>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        Sentiment Analysis Dashboard ©2025
      </Footer>
    </Layout>
  );
};

export default SentimentDashboard;