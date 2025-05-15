// Updated Message Table with Export Button
// This code shows how to modify your existing message table to add export functionality

import React from 'react';
import { Table, Button, Tooltip, Space } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { exportMessagesToExcel } from '../utils/ExportUtils';

/**
 * MessageTable component with export functionality
 * 
 * @param {Object} props
 * @param {Array} props.messages - Message data
 * @param {Array} props.columns - Column definitions
 * @param {Object} props.pagination - Pagination settings
 * @param {Function} props.onChange - Handler for table changes
 * @param {boolean} props.loading - Loading state
 * @param {Object} props.scroll - Table scroll settings
 */
const MessageTable = ({ 
  messages = [], 
  columns = [], 
  pagination, 
  onChange, 
  loading = false, 
  scroll = { x: 1300 } 
}) => {
  
  // Handler for exporting messages
  const handleExport = () => {
    exportMessagesToExcel(
      messages, 
      `sentiment-messages-${new Date().toISOString().split('T')[0]}`,
      columns
    );
  };
  
  // Define title component with export button
  const TableTitle = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>Message Details</span>
      <Tooltip title="Export Messages">
        <Button 
          type="primary" 
          icon={<DownloadOutlined />} 
          onClick={handleExport}
          disabled={!messages || messages.length === 0}
        >
          Export
        </Button>
      </Tooltip>
    </div>
  );
  
  return (
    <Table
      title={() => <TableTitle />}
      dataSource={messages}
      columns={columns}
      rowKey="_id"
      pagination={pagination}
      onChange={onChange}
      scroll={scroll}
      loading={loading}
    />
  );
};

export default MessageTable;