const mongoose = require('mongoose');
const { HostBalance, BalanceTransaction } = require('../models/balance');

class BalanceService {
  constructor() {
    this.isConnected = false;
    // We don't need to connect here - we'll use the existing connection from analyticsService
  }

  // Check if a host has sufficient balance for a transaction
  async checkBalance(host, requiredAmount = 0) {
    try {
      // If host is not provided, return false
      if (!host) {
        console.log('Host not provided, cannot check balance');
        return { sufficient: false, error: 'Host identifier required' };
      }
      
      // Find host balance
      const hostBalance = await HostBalance.findOne({ host });
      
      // If host doesn't exist in the system
      if (!hostBalance) {
        return { 
          sufficient: false, 
          error: 'Host not registered in the system',
          balance: 0,
          hostExists: false
        };
      }
      
      // If host is inactive
      if (!hostBalance.active) {
        return { 
          sufficient: false, 
          error: 'Host account is inactive',
          balance: hostBalance.balance,
          hostExists: true,
          active: false
        };
      }
      
      // Check if there's enough balance
      const sufficient = hostBalance.balance >= requiredAmount;
      
      return {
        sufficient,
        balance: hostBalance.balance,
        hostExists: true,
        active: true,
        error: sufficient ? null : 'Insufficient balance'
      };
    } catch (error) {
      console.error('Error checking balance:', error);
      return { 
        sufficient: false, 
        error: 'Error checking balance',
        balance: 0
      };
    }
  }
  
  // Deduct credits from a host's balance
  async deductCredits(host, amount, description = 'API usage', reference = null) {
    try {
      // If host is not provided, return error
      if (!host) {
        console.log('Host not provided, cannot deduct credits');
        return { success: false, error: 'Host identifier required' };
      }
      
      // Check if amount is valid
      if (!amount || amount <= 0) {
        return { success: false, error: 'Invalid deduction amount' };
      }
      
      // Find host balance
      const hostBalance = await HostBalance.findOne({ host });
      
      // If host doesn't exist
      if (!hostBalance) {
        return { success: false, error: 'Host not registered in the system' };
      }
      
      // Check if balance is sufficient
      if (hostBalance.balance < amount) {
        return { success: false, error: 'Insufficient balance' };
      }
      
      // Update balance
      const newBalance = hostBalance.balance - amount;
      
      // Update host balance
      hostBalance.balance = newBalance;
      hostBalance.totalCreditsUsed += amount;
      hostBalance.lastUpdated = new Date();
      await hostBalance.save();
      
      // Record transaction
      const transaction = new BalanceTransaction({
        host,
        amount: -amount,
        type: 'deduct',
        balanceAfter: newBalance,
        description,
        reference
      });
      
      await transaction.save();
      
      return {
        success: true,
        balance: newBalance,
        deducted: amount
      };
    } catch (error) {
      console.error('Error deducting credits:', error);
      return { success: false, error: 'Error processing deduction' };
    }
  }
  
  // Add credits to a host's balance
  async addCredits(host, amount, description = 'Credit addition', reference = null, performedBy = null) {
    try {
      // If host is not provided, return error
      if (!host) {
        console.log('Host not provided, cannot add credits');
        return { success: false, error: 'Host identifier required' };
      }
      
      // Check if amount is valid
      if (!amount || amount <= 0) {
        return { success: false, error: 'Invalid credit amount' };
      }
      
      // Find or create host balance
      let hostBalance = await HostBalance.findOne({ host });
      
      // If host doesn't exist, create it
      if (!hostBalance) {
        hostBalance = new HostBalance({
          host,
          balance: 0,
          totalCreditsAdded: 0,
          totalCreditsUsed: 0,
          active: true
        });
      }
      
      // Update balance
      const newBalance = hostBalance.balance + amount;
      
      // Update host balance
      hostBalance.balance = newBalance;
      hostBalance.totalCreditsAdded += amount;
      hostBalance.lastUpdated = new Date();
      await hostBalance.save();
      
      // Record transaction
      const transaction = new BalanceTransaction({
        host,
        amount,
        type: 'add',
        balanceAfter: newBalance,
        description,
        reference,
        performedBy
      });
      
      await transaction.save();
      
      return {
        success: true,
        balance: newBalance,
        added: amount
      };
    } catch (error) {
      console.error('Error adding credits:', error);
      return { success: false, error: 'Error processing credit addition' };
    }
  }
  
  // Get balance details for a host
  async getHostBalance(host) {
    try {
      // If host is not provided, return error
      if (!host) {
        console.log('Host not provided, cannot get balance');
        return { success: false, error: 'Host identifier required' };
      }
      
      // Find host balance
      const hostBalance = await HostBalance.findOne({ host });
      
      // If host doesn't exist
      if (!hostBalance) {
        return { 
          success: false, 
          error: 'Host not registered in the system',
          hostExists: false
        };
      }
      
      return {
        success: true,
        balance: hostBalance.balance,
        totalCreditsAdded: hostBalance.totalCreditsAdded,
        totalCreditsUsed: hostBalance.totalCreditsUsed,
        lastUpdated: hostBalance.lastUpdated,
        active: hostBalance.active,
        notes: hostBalance.notes,
        hostExists: true
      };
    } catch (error) {
      console.error('Error getting host balance:', error);
      return { success: false, error: 'Error retrieving balance information' };
    }
  }
  
  // Update host status (active/inactive)
  async updateHostStatus(host, active, notes = null) {
    try {
      // If host is not provided, return error
      if (!host) {
        console.log('Host not provided, cannot update status');
        return { success: false, error: 'Host identifier required' };
      }
      
      // Find host balance
      const hostBalance = await HostBalance.findOne({ host });
      
      // If host doesn't exist
      if (!hostBalance) {
        return { success: false, error: 'Host not registered in the system' };
      }
      
      // Update host status
      hostBalance.active = active;
      if (notes !== null) {
        hostBalance.notes = notes;
      }
      hostBalance.lastUpdated = new Date();
      await hostBalance.save();
      
      return {
        success: true,
        active,
        host
      };
    } catch (error) {
      console.error('Error updating host status:', error);
      return { success: false, error: 'Error updating host status' };
    }
  }
  
  // Get transaction history for a host
  async getTransactionHistory(host, limit = 50, page = 1) {
    try {
      // If host is not provided, return error
      if (!host) {
        console.log('Host not provided, cannot get transaction history');
        return { success: false, error: 'Host identifier required' };
      }
      
      // Calculate skip for pagination
      const skip = (page - 1) * limit;
      
      // Get total count for pagination
      const totalCount = await BalanceTransaction.countDocuments({ host });
      
      // Get transactions with pagination
      const transactions = await BalanceTransaction.find({ host })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);
      
      // Check if host exists
      const hostExists = await HostBalance.exists({ host });
      
      return {
        success: true,
        transactions,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit)
        },
        hostExists: !!hostExists
      };
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return { success: false, error: 'Error retrieving transaction history' };
    }
  }
  
  // Get all hosts with balance information
  async getAllHosts() {
    try {
      const hosts = await HostBalance.find({})
        .sort({ lastUpdated: -1 });
      
      return {
        success: true,
        hosts: hosts.map(h => ({
          host: h.host,
          balance: h.balance,
          totalCreditsAdded: h.totalCreditsAdded,
          totalCreditsUsed: h.totalCreditsUsed,
          lastUpdated: h.lastUpdated,
          active: h.active,
          notes: h.notes
        }))
      };
    } catch (error) {
      console.error('Error getting all hosts:', error);
      return { success: false, error: 'Error retrieving host information' };
    }
  }
  
  // Refund a transaction
  async refundTransaction(transactionId, reason, performedBy) {
    try {
      // Find the transaction
      const transaction = await BalanceTransaction.findById(transactionId);
      
      // If transaction doesn't exist
      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }
      
      // Check if it's a deduction transaction (only deductions can be refunded)
      if (transaction.type !== 'deduct') {
        return { success: false, error: 'Only deduction transactions can be refunded' };
      }
      
      // Amount to refund (original amount was negative for deductions)
      const refundAmount = Math.abs(transaction.amount);
      
      // Find host balance
      const hostBalance = await HostBalance.findOne({ host: transaction.host });
      
      // If host doesn't exist
      if (!hostBalance) {
        return { success: false, error: 'Host not found' };
      }
      
      // Update balance
      const newBalance = hostBalance.balance + refundAmount;
      
      // Update host balance
      hostBalance.balance = newBalance;
      hostBalance.totalCreditsUsed -= refundAmount; // Adjust usage
      hostBalance.lastUpdated = new Date();
      await hostBalance.save();
      
      // Record refund transaction
      const refundTransaction = new BalanceTransaction({
        host: transaction.host,
        amount: refundAmount,
        type: 'refund',
        balanceAfter: newBalance,
        description: `Refund: ${reason || 'No reason provided'}`,
        reference: transaction._id.toString(),
        performedBy
      });
      
      await refundTransaction.save();
      
      return {
        success: true,
        balance: newBalance,
        refunded: refundAmount,
        transactionId: refundTransaction._id
      };
    } catch (error) {
      console.error('Error refunding transaction:', error);
      return { success: false, error: 'Error processing refund' };
    }
  }
}

module.exports = new BalanceService();