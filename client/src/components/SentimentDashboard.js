import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Card, 
  Row, 
  Col, 
  Table, 
  Typography, 
  Statistic, 
  Select, 
  DatePicker, 
  Tag, 
  Space,
  Divider,
  Alert,
  Empty,
  Button,
  Modal,
  Descriptions,
  Badge,
  Spin,
  message,
  Tooltip,
  Input,
  Progress,
  List
} from 'antd';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { 
  SmileOutlined, 
  FrownOutlined, 
  MehOutlined, 
  MessageOutlined, 
  UserOutlined, 
  FilterOutlined,
  LineChartOutlined,
  ReloadOutlined,
  DollarOutlined,
  CloudOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  SendOutlined,
  WarningOutlined,
  FileWordOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// API configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper functions
const getSentimentColor = (sentiment) => {
  switch(sentiment) {
    case 'positive': return '#52c41a';
    case 'negative': return '#f5222d';
    case 'neutral': return '#faad14';
    default: return '#1890ff';
  }
};

const getSentimentIcon = (sentiment) => {
  switch(sentiment) {
    case 'positive': return <SmileOutlined />;
    case 'negative': return <FrownOutlined />;
    case 'neutral': return <MehOutlined />;
    default: return <MessageOutlined />;
  }
};

// Word Cloud component for intents
const WordCloud = ({ data, maxSize = 80, minSize = 14 }) => {
  if (!data || data.length === 0) {
    return <Empty description="No data available" />;
  }

  // Find max count to scale font sizes
  const maxCount = Math.max(...data.map(item => item.value));
  
  // Generate random positions that don't overlap too much
  const positions = [];
  const words = data.map((item, index) => {
    const size = Math.max(minSize, Math.min(maxSize, (item.value / maxCount) * maxSize));
    
    // Assign random positions
    let left, top;
    let attempts = 0;
    let overlap = true;
    
    // Try to find a position that doesn't overlap too much with existing words
    while (overlap && attempts < 50) {
      left = Math.random() * 80; // % of container width
      top = Math.random() * 80;  // % of container height
      
      // Check for overlap with existing positions
      overlap = positions.some(pos => 
        Math.abs(pos.left - left) < 15 && Math.abs(pos.top - top) < 15
      );
      
      attempts++;
    }
    
    positions.push({ left, top });
    
    return {
      text: item.name,
      value: item.value,
      size,
      left,
      top,
      color: getRandomColor(index)
    };
  });
  
  return (
    <div style={{ position: 'relative', width: '100%', height: 300, overflow: 'hidden' }}>
      {words.map((word, index) => (
        <div 
          key={index}
          style={{
            position: 'absolute',
            left: `${word.left}%`,
            top: `${word.top}%`,
            fontSize: `${word.size}px`,
            fontWeight: 'bold',
            color: word.color,
            transform: 'translate(-50%, -50%)',
            whiteSpace: 'nowrap',
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
            cursor: 'default',
            transition: 'all 0.3s ease'
          }}
          title={`${word.text}: ${word.value} occurrences`}
        >
          {word.text}
        </div>
      ))}
    </div>
  );
};

// Get a color from our palette for the word cloud
const getRandomColor = (index) => {
  const colors = [
    '#1890ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2', 
    '#f5222d', '#fa541c', '#faad14', '#a0d911', '#2f54eb', '#fadb14'
  ];
  return colors[index % colors.length];
};

// Main component
const SentimentDashboard = () => {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [stats, setStats] = useState({
    totalMessages: 0,
    sentiment: [],
    channels: [],
    languages: [],
    intents: [],
    profanity: { averageScore: 0, totalProfaneMessages: 0, words: [] },
    tokens: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
    estimatedCost: 0
  });
  // Initialize dates with proper Moment objects
  const defaultStartDate = moment().subtract(30, 'days');
  const defaultEndDate = moment();

  const [filters, setFilters] = useState({
    channel: 'all',
    sentiment: 'all',
    timeRange: [defaultStartDate, defaultEndDate],
    language: 'all'
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [drilldown, setDrilldown] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [cacheModalVisible, setCacheModalVisible] = useState(false);
  const [costBreakdownVisible, setCostBreakdownVisible] = useState(false);
  const [analyzeModalVisible, setAnalyzeModalVisible] = useState(false);
  const [profanityModalVisible, setProfanityModalVisible] = useState(false);
  const [textToAnalyze, setTextToAnalyze] = useState('');
  const [analyzingText, setAnalyzingText] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [apiModel, setApiModel] = useState('gpt-3.5-turbo-0125');

  // Fetch messages from API
  const fetchMessages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.current);
      params.append('limit', pagination.pageSize);
      
      if (filters.channel !== 'all') {
        params.append('channel', filters.channel);
      }
      
      if (filters.sentiment !== 'all') {
        params.append('sentiment', filters.sentiment);
      }
      
      if (filters.language !== 'all') {
        params.append('language', filters.language);
      }
      
      if (filters.timeRange && Array.isArray(filters.timeRange) && 
          filters.timeRange[0] && filters.timeRange[1] &&
          moment.isMoment(filters.timeRange[0]) && moment.isMoment(filters.timeRange[1])) {
        
        const startDate = filters.timeRange[0].format('YYYY-MM-DD');
        const endDate = filters.timeRange[1].format('YYYY-MM-DD');
        
        console.log('Using date range:', startDate, 'to', endDate);
        
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      } else {
        console.log('Date range not valid:', filters.timeRange);
      }
      
      const response = await fetch(`${API_URL}/messages?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      
      if (!data.messages || !Array.isArray(data.messages)) {
        console.warn('Invalid messages data format:', data);
        setMessages([]);
        setFilteredMessages([]);
        setPagination({
          ...pagination,
          total: 0
        });
        return;
      }
      
      // Normalize data structure to ensure consistency
      const normalizedMessages = data.messages.map(msg => {
        try {
          // Ensure essential structure exists
          if (!msg) return createEmptyMessage();
          
          // Create a deep copy to avoid mutation issues
          const normalizedMsg = { ...msg };
          
          // Ensure extraPayload exists
          if (!normalizedMsg.extraPayload) {
            normalizedMsg.extraPayload = {};
          }
          
          // Ensure sentimentAnalysis exists
          if (!normalizedMsg.extraPayload.sentimentAnalysis) {
            normalizedMsg.extraPayload.sentimentAnalysis = {
              sentiment: { score: 0, sentiment: 'neutral' },
              profanity: { score: 0, words: [] },
              intents: [],
              language: 'unknown',
              usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
            };
          } else {
            // Ensure sentiment object exists
            if (!normalizedMsg.extraPayload.sentimentAnalysis.sentiment) {
              normalizedMsg.extraPayload.sentimentAnalysis.sentiment = { score: 0, sentiment: 'neutral' };
            }
            
            // Ensure profanity object exists
            if (!normalizedMsg.extraPayload.sentimentAnalysis.profanity) {
              normalizedMsg.extraPayload.sentimentAnalysis.profanity = { score: 0, words: [] };
            } else if (!normalizedMsg.extraPayload.sentimentAnalysis.profanity.words) {
              normalizedMsg.extraPayload.sentimentAnalysis.profanity.words = [];
            }
            
            // Ensure intents array exists
            if (!normalizedMsg.extraPayload.sentimentAnalysis.intents) {
              normalizedMsg.extraPayload.sentimentAnalysis.intents = [];
            }
            
            // Ensure usage object exists
            if (!normalizedMsg.extraPayload.sentimentAnalysis.usage) {
              normalizedMsg.extraPayload.sentimentAnalysis.usage = { 
                prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 
              };
            }
          }
          
          return normalizedMsg;
        } catch (error) {
          console.error('Error normalizing message:', error, msg);
          return createEmptyMessage();
        }
      });
      
      setMessages(normalizedMessages);
      setFilteredMessages(normalizedMessages);
      setPagination({
        ...pagination,
        total: data.pagination?.total || normalizedMessages.length
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      message.error('Failed to fetch messages');
      setMessages([]);
      setFilteredMessages([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to create an empty message object with the required structure
  const createEmptyMessage = () => ({
    _id: `empty-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    author: { name: 'Unknown', role: 'unknown' },
    message: 'No message content',
    channel: 'unknown',
    direction: 0,
    extraPayload: {
      sentimentAnalysis: {
        sentiment: { score: 0, sentiment: 'neutral' },
        profanity: { score: 0, words: [] },
        intents: [],
        language: 'unknown',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      }
    },
    createdAt: new Date().toISOString()
  });

  // Fetch dashboard stats
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (filters.timeRange && filters.timeRange.length === 2 && filters.timeRange[0] && filters.timeRange[1]) {
        params.append('startDate', filters.timeRange[0].toISOString());
        params.append('endDate', filters.timeRange[1].toISOString());
      }
      
      const response = await fetch(`${API_URL}/dashboard/stats?${params.toString()}`);
      
      // If the API endpoint is not implemented or fails, calculate stats from fetched messages
      if (!response.ok) {
        console.warn('Stats API not available, calculating from messages');
        calculateStatsFromMessages();
        return;
      }
      
      const data = await response.json();
      
      // Calculate profanity stats if not provided by the API
      if (!data.profanity) {
        const profanityStats = calculateProfanityStats(messages);
        data.profanity = profanityStats;
      }
      
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      message.error('Failed to fetch dashboard statistics');
      
      // Fallback: calculate stats from messages
      calculateStatsFromMessages();
    } finally {
      setStatsLoading(false);
    }
  };
  
  // Calculate stats from messages when API fails
  const calculateStatsFromMessages = () => {
    // Count total messages
    const totalMessages = messages.length;
    
    // Calculate sentiment distribution
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    messages.forEach(msg => {
      const sentiment = msg.extraPayload?.sentimentAnalysis?.sentiment?.sentiment || 'neutral';
      sentimentCounts[sentiment] = (sentimentCounts[sentiment] || 0) + 1;
    });
    
    const sentimentData = Object.entries(sentimentCounts).map(([name, value]) => ({ name, value }));
    
    // Calculate channel distribution
    const channelCounts = {};
    messages.forEach(msg => {
      const channel = msg.channel;
      channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    });
    
    const channelData = Object.entries(channelCounts).map(([name, value]) => ({ name, value }));
    
    // Calculate language distribution
    const languageCounts = {};
    messages.forEach(msg => {
      const language = msg.extraPayload?.sentimentAnalysis?.language || 'unknown';
      languageCounts[language] = (languageCounts[language] || 0) + 1;
    });
    
    const languageData = Object.entries(languageCounts).map(([name, value]) => ({ name, value }));
    
    // Calculate intent distribution
    const intentCounts = {};
    messages.forEach(msg => {
      const intents = msg.extraPayload?.sentimentAnalysis?.intents || [];
      intents.forEach(intent => {
        intentCounts[intent] = (intentCounts[intent] || 0) + 1;
      });
    });
    
    const intentData = Object.entries(intentCounts).map(([name, value]) => ({ name, value }));
    
    // Calculate token usage
    const totalTokens = messages.reduce((sum, msg) => 
      sum + (msg.extraPayload?.sentimentAnalysis?.usage?.total_tokens || 0), 0);
    
    const promptTokens = messages.reduce((sum, msg) => 
      sum + (msg.extraPayload?.sentimentAnalysis?.usage?.prompt_tokens || 0), 0);
    
    const completionTokens = messages.reduce((sum, msg) => 
      sum + (msg.extraPayload?.sentimentAnalysis?.usage?.completion_tokens || 0), 0);
    
    // Calculate estimated cost (using GPT-3.5 pricing)
    const promptCost = (promptTokens / 1000) * 0.0005;
    const completionCost = (completionTokens / 1000) * 0.0015;
    const estimatedCost = promptCost + completionCost;
    
    // Calculate profanity stats
    const profanityStats = calculateProfanityStats(messages);
    
    // Set the calculated stats
    setStats({
      totalMessages,
      sentiment: sentimentData,
      channels: channelData,
      languages: languageData,
      intents: intentData,
      profanity: profanityStats,
      tokens: { totalTokens, promptTokens, completionTokens },
      estimatedCost
    });
  };
  
  // Helper function to calculate profanity stats
  const calculateProfanityStats = (messages) => {
    // Find messages with profanity
    const profaneMessages = messages.filter(msg => 
      (msg.extraPayload?.sentimentAnalysis?.profanity?.score || 0) > 0
    );
    
    // Calculate average profanity score
    const averageScore = profaneMessages.length > 0 
      ? profaneMessages.reduce((sum, msg) => 
          sum + (msg.extraPayload?.sentimentAnalysis?.profanity?.score || 0), 0) / profaneMessages.length
      : 0;
    
    // Count profane words
    const profaneWords = {};
    messages.forEach(msg => {
      const words = msg.extraPayload?.sentimentAnalysis?.profanity?.words || [];
      words.forEach(word => {
        profaneWords[word] = (profaneWords[word] || 0) + 1;
      });
    });
    
    // Convert to array format for charts
    const profanityWordArray = Object.entries(profaneWords).map(([name, value]) => ({
      name, value
    })).sort((a, b) => b.value - a.value);
    
    return {
      averageScore,
      totalProfaneMessages: profaneMessages.length,
      words: profanityWordArray
    };
  };

  // Fetch cache stats
  const fetchCacheStats = async () => {
    try {
      const response = await fetch(`${API_URL}/cache/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch cache stats');
      }
      
      const data = await response.json();
      setCacheStats(data);
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      message.warning('Cache statistics not available');
      
      // Set default cache stats in case the endpoint is not implemented
      setCacheStats({
        stats: { hits: 0, misses: 0 },
        keysCount: 0,
        sampleKeys: []
      });
    }
  };

  // Clear cache
  const clearCache = async () => {
    try {
      const response = await fetch(`${API_URL}/cache/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear cache');
      }
      
      const data = await response.json();
      message.success(data.message);
      fetchCacheStats();
    } catch (error) {
      console.error('Error clearing cache:', error);
      message.error('Failed to clear cache');
    }
  };

  // Analyze text
  const analyzeText = async () => {
    if (!textToAnalyze.trim()) {
      message.warning('Please enter text to analyze');
      return;
    }
    
    setAnalyzingText(true);
    try {
      const response = await fetch(`${API_URL}/analyze-sentiment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: textToAnalyze,
          host: window.location.hostname,
          model: apiModel
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze text');
      }
      
      const data = await response.json();
      setAnalyzeResult(data);
      
      // If not from cache, update cache stats
      if (!data.cached) {
        fetchCacheStats();
      }
    } catch (error) {
      console.error('Error analyzing text:', error);
      message.error('Failed to analyze text');
    } finally {
      setAnalyzingText(false);
    }
  };

  // Handle table pagination change
  const handleTableChange = (pagination) => {
    setPagination({
      ...pagination
    });
  };

  // Apply filters on load and when they change
  useEffect(() => {
    fetchMessages();
    fetchStats();
  }, [filters, pagination.current, pagination.pageSize]);

  // Fetch cache stats on initial load
  useEffect(() => {
    fetchCacheStats();
  }, []);

  // Handle drilldown
  const handleDrilldown = (category, value) => {
    let newFilters = { ...filters };
    
    switch(category) {
      case 'channel':
        newFilters.channel = value;
        break;
      case 'sentiment':
        newFilters.sentiment = value;
        break;
      case 'language':
        newFilters.language = value;
        break;
      default:
        break;
    }
    
    setFilters(newFilters);
    setDrilldown({ category, value });
    // Reset pagination when filters change
    setPagination({
      ...pagination,
      current: 1
    });
  };

  // Reset drilldown
  const resetDrilldown = () => {
    setFilters({
      channel: 'all',
      sentiment: 'all',
      timeRange: filters.timeRange,
      language: 'all'
    });
    setDrilldown(null);
    // Reset pagination when filters change
    setPagination({
      ...pagination,
      current: 1
    });
  };

  // Table columns
  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => new Date(text).toLocaleString(),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    },
    {
      title: 'Channel',
      dataIndex: 'channel',
      key: 'channel',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Direction',
      dataIndex: 'direction',
      key: 'direction',
      render: (dir) => dir === 0 ? 
        <Tag color="green">Inbound</Tag> : 
        <Tag color="orange">Outbound</Tag>
    },
    {
      title: 'Author',
      dataIndex: ['author', 'name'],
      key: 'author',
      render: (name, record) => (
        <Space>
          <UserOutlined />
          <span>{name}</span>
          {record.author.role && (
            <Tag color={record.author.role === 'agent' ? 'purple' : 'cyan'}>
              {record.author.role}
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      width: 250
    },
    {
      title: 'Sentiment',
      dataIndex: ['extraPayload', 'sentimentAnalysis', 'sentiment', 'sentiment'],
      key: 'sentiment',
      render: (text, record) => {
        // Add null checks to avoid errors
        const sentimentScore = record?.extraPayload?.sentimentAnalysis?.sentiment?.score;
        const sentimentValue = record?.extraPayload?.sentimentAnalysis?.sentiment?.sentiment || 'neutral';
        
        // Use a default score if undefined
        const score = typeof sentimentScore === 'number' ? sentimentScore : 0;
        
        return (
          <Space>
            {getSentimentIcon(sentimentValue)}
            <Tag color={getSentimentColor(sentimentValue)}>
              {sentimentValue} ({score.toFixed(2)})
            </Tag>
          </Space>
        );
      }
    },
    {
      title: 'Profanity',
      dataIndex: ['extraPayload', 'sentimentAnalysis', 'profanity', 'score'],
      key: 'profanity',
      render: (score, record) => {
        // Add null checks to avoid errors
        const profanityScore = record?.extraPayload?.sentimentAnalysis?.profanity?.score;
        const profaneWords = record?.extraPayload?.sentimentAnalysis?.profanity?.words || [];
        
        // Use a default score if undefined
        const safeScore = typeof profanityScore === 'number' ? profanityScore : 0;
        
        return (
          <Space>
            <Tag color={safeScore > 0 ? 'red' : 'green'}>
              {safeScore > 0 ? 
                <><WarningOutlined /> {safeScore.toFixed(2)}</> : 
                'None'
              }
            </Tag>
            {profaneWords.length > 0 && (
              <Tooltip title={profaneWords.join(', ')}>
                <Badge count={profaneWords.length} style={{ backgroundColor: '#f5222d' }} />
              </Tooltip>
            )}
          </Space>
        );
      },
      sorter: (a, b) => {
        const scoreA = a?.extraPayload?.sentimentAnalysis?.profanity?.score || 0;
        const scoreB = b?.extraPayload?.sentimentAnalysis?.profanity?.score || 0;
        return scoreA - scoreB;
      }
    },
    {
      title: 'Language',
      dataIndex: ['extraPayload', 'sentimentAnalysis', 'language'],
      key: 'language',
      render: (text) => <Tag>{text || 'unknown'}</Tag>
    },
    {
      title: 'Intents',
      dataIndex: ['extraPayload', 'sentimentAnalysis', 'intents'],
      key: 'intents',
      render: (intents) => {
        // Ensure intents is an array
        const safeIntents = Array.isArray(intents) ? intents : [];
        return (
          <Space wrap>
            {safeIntents.length > 0 ? 
              safeIntents.map(intent => (
                <Tag key={intent} color="geekblue">{intent}</Tag>
              )) : 
              <Text type="secondary">-</Text>
            }
          </Space>
        );
      }
    },
    {
      title: 'API Cost',
      key: 'cost',
      render: (text, record) => {
        // Safely get tokens or default to 0
        const tokens = record?.extraPayload?.sentimentAnalysis?.usage?.total_tokens || 0;
        // Assuming GPT-3.5-turbo pricing of $0.0015 per 1K tokens
        const cost = (tokens / 1000) * 0.0015;
        return `${cost.toFixed(5)}`;
      }
    }
  ];

  // Get percentages
  const positivePct = stats.totalMessages > 0 ? 
    (stats.sentiment.find(d => d.name === 'positive')?.value || 0) / stats.totalMessages * 100 : 0;
  const neutralPct = stats.totalMessages > 0 ? 
    (stats.sentiment.find(d => d.name === 'neutral')?.value || 0) / stats.totalMessages * 100 : 0;
  const negativePct = stats.totalMessages > 0 ? 
    (stats.sentiment.find(d => d.name === 'negative')?.value || 0) / stats.totalMessages * 100 : 0;
  
  // Calculate profanity percentage
  const profanityPct = stats.totalMessages > 0 ?
    (stats.profanity?.totalProfaneMessages || 0) / stats.totalMessages * 100 : 0;

  const COLORS = ['#52c41a', '#faad14', '#f5222d', '#1890ff', '#722ed1', '#eb2f96'];

  // Cache hit rate calculation
  const cacheHitRate = cacheStats ? 
    (cacheStats.stats.hits / (cacheStats.stats.hits + cacheStats.stats.misses) * 100).toFixed(2) : 0;

  // Prepare profanity word data for visualization
  const profanityWordData = stats.profanity?.words || [];

  return (
    <Layout className="min-h-screen">
      <Header className="bg-white shadow-md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64, padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0, marginRight: 16, color: '#1890ff' }}>
            <LineChartOutlined style={{ marginRight: 8 }} />
            Sentiment Analysis Dashboard
          </Title>
          {drilldown && (
            <Tag color="blue" className="cursor-pointer" onClick={resetDrilldown}>
              {drilldown.category}: {drilldown.value} ×
            </Tag>
          )}
        </div>
        <Space>
          <Tooltip title="Profanity Analysis">
            <Button 
              icon={<WarningOutlined />} 
              onClick={() => setProfanityModalVisible(true)}
            />
          </Tooltip>
          <Tooltip title="Cache Statistics">
            <Button 
              icon={<CloudOutlined />} 
              onClick={() => setCacheModalVisible(true)}
            />
          </Tooltip>
          <Tooltip title="Analyze New Text">
            <Button 
              type="primary" 
              onClick={() => setAnalyzeModalVisible(true)}
            >
              Analyze Text
            </Button>
          </Tooltip>
        </Space>
      </Header>
      
      <Content className="p-6">
        {/* Filters */}
        <Card 
          className="mb-6 shadow-sm" 
          title={<><FilterOutlined /> Filters</>}
          extra={
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => {
                fetchMessages();
                fetchStats();
              }}
              loading={loading || statsLoading}
            >
              Refresh Data
            </Button>
          }
        >
          <Row gutter={16}>
            <Col span={6}>
              <div className="mb-2">Channel</div>
              <Select
                value={filters.channel}
                onChange={(value) => setFilters({...filters, channel: value})}
                style={{ width: '100%' }}
                options={[
                  { value: 'all', label: 'All Channels' },
                  ...stats.channels.map(channel => ({ 
                    value: channel.name, 
                    label: channel.name 
                  }))
                ]}
              />
            </Col>
            <Col span={6}>
              <div className="mb-2">Sentiment</div>
              <Select
                value={filters.sentiment}
                onChange={(value) => setFilters({...filters, sentiment: value})}
                style={{ width: '100%' }}
                options={[
                  { value: 'all', label: 'All Sentiments' },
                  { value: 'positive', label: 'Positive' },
                  { value: 'neutral', label: 'Neutral' },
                  { value: 'negative', label: 'Negative' }
                ]}
              />
            </Col>
            <Col span={6}>
              <div className="mb-2">Language</div>
              <Select
                value={filters.language}
                onChange={(value) => setFilters({...filters, language: value})}
                style={{ width: '100%' }}
                options={[
                  { value: 'all', label: 'All Languages' },
                  ...stats.languages.map(lang => ({ 
                    value: lang.name, 
                    label: lang.name 
                  }))
                ]}
              />
            </Col>
            <Col span={6}>
              <div className="mb-2">Date Range</div>
              <Space style={{ width: '100%' }}>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={() => {
                    const newStartDate = moment().subtract(30, 'days');
                    const newEndDate = moment();
                    setFilters({
                      ...filters,
                      timeRange: [newStartDate, newEndDate]
                    });
                  }}
                >
                  Last 30 days
                </Button>
                <Button 
                  onClick={() => {
                    const newStartDate = moment().startOf('year');
                    const newEndDate = moment();
                    setFilters({
                      ...filters,
                      timeRange: [newStartDate, newEndDate]
                    });
                  }}
                >
                  Year to date
                </Button>
                <Button 
                  onClick={() => {
                    setFilters({
                      ...filters,
                      timeRange: [null, null]
                    });
                  }}
                >
                  Clear dates
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Overview Stats */}
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card className="shadow-sm">
              <Statistic
                title="Total Messages"
                value={stats.totalMessages}
                prefix={<MessageOutlined />}
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="shadow-sm">
              <Statistic
                title="Positive Sentiment"
                value={positivePct.toFixed(1)}
                precision={1}
                valueStyle={{ color: '#52c41a' }}
                prefix={<SmileOutlined />}
                suffix="%"
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="shadow-sm">
              <Statistic
                title="Negative Sentiment"
                value={negativePct.toFixed(1)}
                precision={1}
                valueStyle={{ color: '#f5222d' }}
                prefix={<FrownOutlined />}
                suffix="%"
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="shadow-sm">
              <Statistic
                title={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    Total API Cost
                    <Tooltip title="View Cost Breakdown">
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<DollarOutlined />} 
                        onClick={() => setCostBreakdownVisible(true)}
                        style={{ marginLeft: 4 }}
                      />
                    </Tooltip>
                  </div>
                }
                value={stats.estimatedCost}
                precision={5}
                prefix="$"
                suffix={
                  <Tooltip title={`${stats.tokens?.totalTokens?.toLocaleString()} total tokens`}>
                    <Text type="secondary" style={{ marginLeft: 4 }}>
                      ({stats.tokens?.totalTokens?.toLocaleString()})
                    </Text>
                  </Tooltip>
                }
                loading={statsLoading}
              />
            </Card>
          </Col>
        </Row>

        {/* Profanity Stats */}
        <Row gutter={16} className="mb-6">
          <Col span={24}>
            <Card 
              title={
                <Space>
                  <WarningOutlined style={{ color: '#f5222d' }} />
                  <span>Profanity Analysis</span>
                </Space>
              }
              extra={
                <Button type="link" onClick={() => setProfanityModalVisible(true)}>
                  View Details
                </Button>
              }
              className="shadow-sm"
              loading={statsLoading}
            >
              <Row gutter={16} align="middle">
                <Col span={6}>
                  <Statistic
                    title="Messages with Profanity"
                    value={profanityPct.toFixed(1)}
                    suffix="%"
                    valueStyle={{ color: profanityPct > 5 ? '#f5222d' : '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Average Profanity Score"
                    value={stats.profanity?.averageScore || 0}
                    precision={2}
                    valueStyle={{ color: (stats.profanity?.averageScore || 0) > 0.5 ? '#f5222d' : '#52c41a' }}
                  />
                </Col>
                <Col span={12}>
                  <div style={{ padding: '0 20px' }}>
                    <div style={{ marginBottom: 8 }}>Top Profane Words</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {profanityWordData.length > 0 ? (
                        profanityWordData.slice(0, 10).map((word, index) => (
                          <Tag key={index} color="red">
                            {word.name} ({word.value})
                          </Tag>
                        ))
                      ) : (
                        <Text type="secondary">No profanity detected</Text>
                      )}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* Charts */}
        <Row gutter={16} className="mb-6">
          <Col span={12}>
            <Card 
              title="Sentiment Distribution" 
              className="shadow-sm"
              extra={
                <Text type="secondary">
                  Click segments to filter
                </Text>
              }
              loading={statsLoading}
            >
              {stats.sentiment.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.sentiment}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      onClick={(data) => handleDrilldown('sentiment', data.name)}
                    >
                      {stats.sentiment.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getSentimentColor(entry.name)} 
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value, name) => [`${value} messages (${((value / stats.totalMessages) * 100).toFixed(1)}%)`, name]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="No data available" />
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card 
              title="Channel Distribution" 
              className="shadow-sm"
              extra={
                <Text type="secondary">
                  Click bars to filter
                </Text>
              }
              loading={statsLoading}
            >
              {stats.channels.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={stats.channels}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value) => [`${value} messages`, 'Count']}
                    />
                    <Legend />
                    <Bar 
                      dataKey="value" 
                      name="Messages" 
                      fill="#1890ff" 
                      onClick={(data) => handleDrilldown('channel', data.name)}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="No data available" />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={16} className="mb-6">
          <Col span={12}>
            <Card 
              title={
                <Space>
                  <FileWordOutlined />
                  <span>Intent Word Cloud</span>
                </Space>
              }
              className="shadow-sm"
              loading={statsLoading}
            >
              <WordCloud data={stats.intents} />
            </Card>
          </Col>
          <Col span={12}>
            <Card 
              title="Language Distribution" 
              className="shadow-sm"
              extra={
                <Text type="secondary">
                  Click segments to filter
                </Text>
              }
              loading={statsLoading}
            >
              {stats.languages.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.languages}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      onClick={(data) => handleDrilldown('language', data.name)}
                    >
                      {stats.languages.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value, name) => [`${value} messages (${((value / stats.totalMessages) * 100).toFixed(1)}%)`, name]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="No data available" />
              )}
            </Card>
          </Col>
        </Row>

        {/* Messages Table */}
        <Card 
          title={
            <Space>
              <MessageOutlined />
              <span>Message Details</span>
              <Tag color="blue">{filteredMessages.length} messages</Tag>
            </Space>
          } 
          className="shadow-sm"
        >
          <Table 
            dataSource={filteredMessages} 
            columns={columns} 
            rowKey="_id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: (page, pageSize) => setPagination({ current: page, pageSize })
            }}
            onChange={handleTableChange}
            scroll={{ x: 1200 }}
          />
        </Card>
      </Content>

      {/* Profanity Analysis Modal */}
      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: '#f5222d' }} />
            <span>Profanity Analysis</span>
          </Space>
        }
        open={profanityModalVisible}
        onCancel={() => setProfanityModalVisible(false)}
        footer={[
          <Button 
            key="close" 
            type="primary" 
            onClick={() => setProfanityModalVisible(false)}
          >
            Close
          </Button>
        ]}
        width={800}
      >
        <Row gutter={16} className="mb-4">
          <Col span={8}>
            <Card>
              <Statistic
                title="Messages with Profanity"
                value={stats.profanity?.totalProfaneMessages || 0}
                suffix={`/${stats.totalMessages}`}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Profanity Percentage"
                value={profanityPct}
                precision={1}
                suffix="%"
                valueStyle={{ color: profanityPct > 5 ? '#f5222d' : '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Average Profanity Score"
                value={stats.profanity?.averageScore || 0}
                precision={2}
                valueStyle={{ color: (stats.profanity?.averageScore || 0) > 0.5 ? '#f5222d' : '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Profanity Word List */}
        <Card title="Profane Words Detected" className="mb-4">
          {profanityWordData.length > 0 ? (
            <List
              grid={{ gutter: 16, column: 3 }}
              dataSource={profanityWordData}
              renderItem={(item) => (
                <List.Item>
                  <Tag color="red" style={{ fontSize: 14, padding: '4px 8px' }}>
                    {item.name} <Badge count={item.value} style={{ backgroundColor: '#ff4d4f' }} />
                  </Tag>
                </List.Item>
              )}
            />
          ) : (
            <Empty description="No profanity detected in the analyzed messages" />
          )}
        </Card>

        {/* Channels with most profanity */}
        <Card title="Profanity by Channel">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={stats.channels
                .filter(channel => channel.value > 0)
                .map(channel => ({
                  name: channel.name,
                  profanityCount: Math.floor(Math.random() * channel.value * 0.2), // Mock data - replace with actual
                  totalCount: channel.value
                }))
                .sort((a, b) => (b.profanityCount / b.totalCount) - (a.profanityCount / a.totalCount))
              }
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip formatter={(value, name) => [value, name === 'profanityRate' ? 'Profanity Rate' : name]} />
              <Legend />
              <Bar dataKey="profanityCount" name="Messages with Profanity" stackId="a" fill="#f5222d" />
              <Bar dataKey="totalCount" name="Total Messages" stackId="a" fill="#1890ff" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Modal>

      {/* Cache Statistics Modal */}
      <Modal
        title={
          <Space>
            <CloudOutlined />
            <span>Cache Statistics</span>
          </Space>
        }
        open={cacheModalVisible}
        onCancel={() => setCacheModalVisible(false)}
        footer={[
          <Button 
            key="refresh" 
            icon={<ReloadOutlined />} 
            onClick={fetchCacheStats}
          >
            Refresh
          </Button>,
          <Button 
            key="clear" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={clearCache}
          >
            Clear Cache
          </Button>,
          <Button 
            key="close" 
            type="primary" 
            onClick={() => setCacheModalVisible(false)}
          >
            Close
          </Button>
        ]}
        width={800}
      >
        {cacheStats ? (
          <>
            <Row gutter={16} className="mb-4">
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Cache Items"
                    value={cacheStats.keysCount}
                    prefix={<CloudOutlined />}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Cache Hit Rate"
                    value={cacheHitRate}
                    precision={2}
                    suffix="%"
                    valueStyle={{ color: Number(cacheHitRate) > 50 ? '#52c41a' : '#f5222d' }}
                    prefix={<ClockCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Estimated Savings"
                    value={cacheStats.stats.hits * 0.00001}
                    precision={5}
                    prefix="$"
                    valueStyle={{ color: '#1890ff' }}
                    suffix={<Text type="secondary">({cacheStats.stats.hits} hits)</Text>}
                  />
                </Card>
              </Col>
            </Row>
            
            <Descriptions title="Cache Details" bordered>
              <Descriptions.Item label="Hits" span={1}>{cacheStats.stats.hits}</Descriptions.Item>
              <Descriptions.Item label="Misses" span={1}>{cacheStats.stats.misses}</Descriptions.Item>
              <Descriptions.Item label="Keys Count" span={1}>{cacheStats.keysCount}</Descriptions.Item>
              <Descriptions.Item label="Average TTL" span={3}>24 hours</Descriptions.Item>
            </Descriptions>
            
            <Divider />
            
            <div className="mb-4">
              <Title level={5}>Sample Cached Keys</Title>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {cacheStats.sampleKeys.map((key, index) => (
                  <Tag key={index} className="mb-2">{key}</Tag>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <Spin />
            <div className="mt-4">Loading cache statistics...</div>
          </div>
        )}
      </Modal>

      {/* Cost Breakdown Modal */}
      <Modal
        title={
          <Space>
            <DollarOutlined />
            <span>Cost Breakdown</span>
          </Space>
        }
        open={costBreakdownVisible}
        onCancel={() => setCostBreakdownVisible(false)}
        footer={[
          <Button 
            key="close" 
            type="primary" 
            onClick={() => setCostBreakdownVisible(false)}
          >
            Close
          </Button>
        ]}
        width={600}
      >
        <Descriptions title="OpenAI API Cost Details" bordered>
          <Descriptions.Item label="Prompt Tokens" span={3}>
            {stats.tokens?.promptTokens?.toLocaleString() || 0}
          </Descriptions.Item>
          <Descriptions.Item label="Completion Tokens" span={3}>
            {stats.tokens?.completionTokens?.toLocaleString() || 0}
          </Descriptions.Item>
          <Descriptions.Item label="Total Tokens" span={3}>
            {stats.tokens?.totalTokens?.toLocaleString() || 0}
          </Descriptions.Item>
          <Descriptions.Item label="Prompt Cost" span={3}>
            ${((stats.tokens?.promptTokens || 0) / 1000 * 0.0005).toFixed(5)}
          </Descriptions.Item>
          <Descriptions.Item label="Completion Cost" span={3}>
            ${((stats.tokens?.completionTokens || 0) / 1000 * 0.0015).toFixed(5)}
          </Descriptions.Item>
          <Descriptions.Item label="Total Cost" span={3}>
            <Text strong>${stats.estimatedCost?.toFixed(5) || 0}</Text>
          </Descriptions.Item>
        </Descriptions>
        
        <Divider />
        
        <Title level={5}>Cost Reduction with Caching</Title>
        {cacheStats ? (
          <>
            <Paragraph>
              Your cache has saved approximately <Text strong>${(cacheStats.stats.hits * 0.00001).toFixed(5)}</Text> with {cacheStats.stats.hits} cache hits.
            </Paragraph>
            <Progress 
              percent={Number(cacheHitRate)} 
              status="active" 
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
              format={percent => `${percent.toFixed(2)}% Hit Rate`}
            />
          </>
        ) : (
          <Spin />
        )}
      </Modal>

      {/* Analyze Text Modal */}
      <Modal
        title={
          <Space>
            <LineChartOutlined />
            <span>Analyze New Text</span>
          </Space>
        }
        open={analyzeModalVisible}
        onCancel={() => {
          setAnalyzeModalVisible(false);
          setAnalyzeResult(null);
          setTextToAnalyze('');
        }}
        footer={[
          <Button 
            key="model" 
            onClick={() => {
              Modal.info({
                title: 'Select AI Model',
                content: (
                  <div>
                    <p className="mb-4">Choose an OpenAI model for sentiment analysis:</p>
                    <Select
                      value={apiModel}
                      onChange={(value) => setApiModel(value)}
                      style={{ width: '100%' }}
                      options={[
                        { value: 'gpt-3.5-turbo-0125', label: 'GPT-3.5 Turbo (0.0005 / 0.0015 per 1K tokens)' },
                        { value: 'gpt-4-turbo-0125', label: 'GPT-4 Turbo (0.01 / 0.03 per 1K tokens)' },
                        { value: 'gpt-4-0125', label: 'GPT-4 (0.03 / 0.06 per 1K tokens)' }
                      ]}
                    />
                  </div>
                ),
                onOk() {},
              });
            }}
          >
            Model: {apiModel.split('-').slice(0, 2).join('-')}
          </Button>,
          <Button 
            key="analyze" 
            type="primary" 
            icon={<SendOutlined />} 
            onClick={analyzeText}
            loading={analyzingText}
            disabled={!textToAnalyze.trim()}
          >
            Analyze
          </Button>
        ]}
        width={800}
      >
        <div className="mb-4">
          <div className="mb-2">Enter text to analyze:</div>
          <TextArea 
            rows={6} 
            value={textToAnalyze}
            onChange={(e) => setTextToAnalyze(e.target.value)}
            placeholder="Type or paste text here for sentiment analysis..."
          />
        </div>

        {analyzingText && (
          <div className="text-center py-4">
            <Spin />
            <div className="mt-2">Analyzing text...</div>
          </div>
        )}

        {analyzeResult && !analyzingText && (
          <div>
            <Alert
              message={analyzeResult.cached ? "Result from cache" : "Fresh Analysis"}
              type={analyzeResult.cached ? "success" : "info"}
              showIcon
              className="mb-4"
            />

            <Card className="mb-4">
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Sentiment"
                    value={analyzeResult.sentiment.sentiment}
                    valueStyle={{ 
                      color: getSentimentColor(analyzeResult.sentiment.sentiment)
                    }}
                    prefix={getSentimentIcon(analyzeResult.sentiment.sentiment)}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Score"
                    value={analyzeResult.sentiment.score}
                    precision={2}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Language"
                    value={analyzeResult.language}
                  />
                </Col>
              </Row>
            </Card>

            <Divider orientation="left">Details</Divider>
            
            <Descriptions bordered>
              <Descriptions.Item label="Profanity Score" span={3}>
                {analyzeResult.profanity.score}
              </Descriptions.Item>
              <Descriptions.Item label="Profane Words" span={3}>
                {analyzeResult.profanity.words.length > 0 ? 
                  analyzeResult.profanity.words.map(word => (
                    <Tag key={word} color="red">{word}</Tag>
                  )) : 
                  <Text type="secondary">None detected</Text>
                }
              </Descriptions.Item>
              <Descriptions.Item label="Intents" span={3}>
                {analyzeResult.intents.map(intent => (
                  <Tag key={intent} color="blue">{intent}</Tag>
                ))}
              </Descriptions.Item>
              <Descriptions.Item label="API Tokens" span={3}>
                <Space>
                  <Badge status="processing" text={`${analyzeResult.usage.total_tokens} total`} />
                  <Badge status="default" text={`${analyzeResult.usage.prompt_tokens} prompt`} />
                  <Badge status="default" text={`${analyzeResult.usage.completion_tokens} completion`} />
                </Space>
              </Descriptions.Item>
              {analyzeResult.cost && (
                <Descriptions.Item label="Cost" span={3}>
                  <Space>
                    <Badge status="success" text={`$${analyzeResult.cost.totalCost.toFixed(6)} total`} />
                    <Badge status="default" text={`$${analyzeResult.cost.inputCost.toFixed(6)} input`} />
                    <Badge status="default" text={`$${analyzeResult.cost.outputCost.toFixed(6)} output`} />
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default SentimentDashboard;