// ExportUtils.js - Utility functions for exporting dashboard data
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { message } from 'antd';

/**
 * Export chart data as CSV
 * @param {Array} data - Chart data to export
 * @param {string} filename - Name of the exported file
 * @param {Array} columns - Column definitions with title and dataKey
 */
export const exportChartToCSV = (data, filename, columns) => {
  try {
    if (!data || !Array.isArray(data) || data.length === 0) {
      message.error('No data available to export');
      return;
    }

    // Convert the data into CSV format
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add header row
    const headers = columns.map(col => col.title || col.dataKey).join(',');
    csvContent += headers + "\r\n";
    
    // Add data rows
    data.forEach(item => {
      const row = columns.map(col => {
        // Handle nested properties or missing values
        let value = item[col.dataKey];
        if (value === undefined || value === null) {
          if (col.dataKey.includes('.')) {
            // Handle nested properties
            const props = col.dataKey.split('.');
            let nestedValue = item;
            for (const prop of props) {
              nestedValue = nestedValue && nestedValue[prop];
            }
            value = nestedValue;
          }
        }
        
        // Format the value for CSV
        if (value === undefined || value === null) return '';
        if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
        return value;
      }).join(',');
      
      csvContent += row + "\r\n";
    });
    
    // Create and download the file
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success(`${filename} exported successfully`);
  } catch (error) {
    console.error('Error exporting chart data:', error);
    message.error('Failed to export chart data');
  }
};

/**
 * Export chart data as Excel
 * @param {Array} data - Chart data to export
 * @param {string} filename - Name of the exported file
 * @param {Array} columns - Column definitions with title and dataKey
 */
export const exportChartToExcel = (data, filename, columns) => {
  try {
    if (!data || !Array.isArray(data) || data.length === 0) {
      message.error('No data available to export');
      return;
    }
    
    // Format data for Excel
    const excelData = data.map(item => {
      const row = {};
      columns.forEach(col => {
        // Handle nested properties or missing values
        let value = item[col.dataKey];
        if (value === undefined || value === null) {
          if (col.dataKey.includes('.')) {
            // Handle nested properties
            const props = col.dataKey.split('.');
            let nestedValue = item;
            for (const prop of props) {
              nestedValue = nestedValue && nestedValue[prop];
            }
            value = nestedValue;
          }
        }
        
        // Use column title or dataKey as property name
        const columnName = col.title || col.dataKey;
        row[columnName] = value !== undefined && value !== null ? value : '';
      });
      return row;
    });
    
    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    // Generate and save the file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}.xlsx`);
    
    message.success(`${filename} exported successfully`);
  } catch (error) {
    console.error('Error exporting chart data to Excel:', error);
    message.error('Failed to export chart data to Excel');
  }
};

/**
 * Export message data as Excel
 * @param {Array} messages - Message data to export
 * @param {string} filename - Name of the exported file
 * @param {Array} columns - Table column definitions
 */
export const exportMessagesToExcel = (messages, filename, columns) => {
  try {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      message.error('No messages available to export');
      return;
    }
    
    // Format message data for Excel by extracting properties from the columns
    const excelData = messages.map(msg => {
      const row = {};
      columns.forEach(col => {
        // Skip action columns
        if (col.key === 'action') return;
        
        let value;
        
        // Handle render functions
        if (col.render && col.dataIndex) {
          // If there's a render function, try to extract the raw value
          value = msg[col.dataIndex];
        } 
        // Handle nested dataIndex like ['author', 'name']
        else if (Array.isArray(col.dataIndex)) {
          value = col.dataIndex.reduce((obj, key) => obj && obj[key], msg);
        } 
        // Handle dot notation dataIndex like 'author.name'
        else if (col.dataIndex && col.dataIndex.includes('.')) {
          const props = col.dataIndex.split('.');
          value = props.reduce((obj, key) => obj && obj[key], msg);
        }
        // Handle simple dataIndex
        else if (col.dataIndex) {
          value = msg[col.dataIndex];
        }
        // Handle no dataIndex but has key (use key as dataIndex)
        else if (col.key && col.key !== 'action') {
          value = msg[col.key];
        }
        
        // Format special values
        if (col.key === 'createdAt' && value) {
          try {
            // Try to format date
            const date = new Date(value);
            value = date.toISOString();
          } catch (e) {
            // Keep original value if date formatting fails
          }
        }
        
        // For sentiment, direction, role, etc. that have tag renderers
        // Just use the raw value - Excel users can format if needed
        
        // Use column title as property name
        const columnName = col.title || col.key || col.dataIndex || 'Column';
        row[columnName] = value !== undefined && value !== null ? value : '';
      });
      return row;
    });
    
    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Messages');
    
    // Generate and save the file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}.xlsx`);
    
    message.success(`${filename} exported successfully`);
  } catch (error) {
    console.error('Error exporting messages to Excel:', error);
    message.error('Failed to export messages to Excel');
  }
};

export default {
  exportChartToCSV,
  exportChartToExcel,
  exportMessagesToExcel
};