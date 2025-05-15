// ExportableChart.js - Wrapper component for charts with export functionality
import React from 'react';
import { Card, Button, Dropdown, Menu, Tooltip } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons';
import { exportChartToCSV, exportChartToExcel } from '../utils/ExportUtils';

/**
 * Wrapper component for chart cards with export functionality
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Chart component to render
 * @param {string} props.title - Card title
 * @param {Array} props.data - Data for export
 * @param {Array} props.columns - Column definitions for export
 * @param {string} props.filename - Base filename for export (without extension)
 * @param {Object} props.cardProps - Additional props for Card component
 */
const ExportableChart = ({ 
  children, 
  title, 
  data = [], 
  columns = [], 
  filename = 'chart-export',
  cardProps = {}
}) => {
  // Generate column definitions if not provided
  const exportColumns = columns.length > 0 ? columns : 
    data.length > 0 ? Object.keys(data[0]).map(key => ({ title: key, dataKey: key })) : [];
  
  // Prepare export menu items
  const exportMenu = (
    <Menu>
      <Menu.Item 
        key="csv" 
        icon={<FileTextOutlined />}
        onClick={() => exportChartToCSV(data, `${filename}-${new Date().toISOString().split('T')[0]}`, exportColumns)}
      >
        Export as CSV
      </Menu.Item>
      <Menu.Item 
        key="excel" 
        icon={<FileExcelOutlined />}
        onClick={() => exportChartToExcel(data, `${filename}-${new Date().toISOString().split('T')[0]}`, exportColumns)}
      >
        Export as Excel
      </Menu.Item>
    </Menu>
  );

  // Extra content for card header
  const cardExtra = (
    <Tooltip title="Export Data">
      <Dropdown overlay={exportMenu} trigger={['click']}>
        <Button 
          type="text" 
          icon={<DownloadOutlined />} 
          disabled={!data || data.length === 0}
        />
      </Dropdown>
    </Tooltip>
  );

  return (
    <Card 
      title={title} 
      extra={cardExtra}
      {...cardProps}
    >
      {children}
    </Card>
  );
};

export default ExportableChart;