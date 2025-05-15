// DatePickerFix.js - Custom controlled DatePicker implementation

import React, { useState } from 'react';
import { DatePicker, Space } from 'antd';
import moment from 'moment';

const { RangePicker } = DatePicker;

/**
 * Custom DateRangePicker component that enforces date mode and prevents 
 * switching to decade/year/month views which cause the jumping years issue
 */
const ControlledDateRangePicker = ({ value, onChange, disabled }) => {
  // Track open state to reset mode when reopening
  const [open, setOpen] = useState(false);
  
  // Prevent event propagation for panel clicks that would switch mode
  const handlePanelClick = (e) => {
    // Find if the click was on a decade/year/month button
    const target = e.target;
    if (target && (
      target.classList.contains('ant-picker-header-super-prev-btn') ||
      target.classList.contains('ant-picker-header-prev-btn') ||
      target.classList.contains('ant-picker-header-next-btn') ||
      target.classList.contains('ant-picker-header-super-next-btn') ||
      // Check parent node too
      (target.parentNode && (
        target.parentNode.classList.contains('ant-picker-header-super-prev-btn') ||
        target.parentNode.classList.contains('ant-picker-header-prev-btn') ||
        target.parentNode.classList.contains('ant-picker-header-next-btn') ||
        target.parentNode.classList.contains('ant-picker-header-super-next-btn')
      )) ||
      // Check for decade/year selection
      target.classList.contains('ant-picker-year-btn') ||
      target.classList.contains('ant-picker-month-btn') ||
      target.classList.contains('ant-picker-decade-btn')
    )) {
      e.stopPropagation();
      e.preventDefault();
      return false;
    }
  };

  // Handle date range change
  const handleDateRangeChange = (dates) => {
    if (onChange && dates && dates.length === 2) {
      // Enforce dates are not in the future
      const now = moment();
      const adjustedDates = [
        dates[0].isAfter(now) ? now : dates[0],
        dates[1].isAfter(now) ? now : dates[1]
      ];
      onChange(adjustedDates);
    }
  };

  // Panel change handler to prevent mode switching
  const handlePanelChange = () => {
    // Don't allow panel mode changes
    return false;
  };

  return (
    <RangePicker
      value={value}
      onChange={handleDateRangeChange}
      onPanelChange={handlePanelChange}
      onOpenChange={(isOpen) => setOpen(isOpen)}
      panelRender={(panelNode) => {
        return (
          <div onClick={handlePanelClick}>
            {panelNode}
          </div>
        );
      }}
      allowClear={false}
      disabled={disabled}
      mode={['date', 'date']}
      picker="date"
      format="YYYY-MM-DD"
      disabledDate={(current) => current && current > moment().endOf('day')}
      popupStyle={{ minWidth: '320px' }} // Ensure calendar is wide enough
    />
  );
};

export default ControlledDateRangePicker;