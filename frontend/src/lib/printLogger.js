// Print logging utility that sends logs to server
import { printLogAPI } from './api';

// Generate or retrieve device ID
const getDeviceId = () => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    // Create a simple device fingerprint
    const userAgent = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const fingerprint = `${userAgent}_${platform}_${screen.width}x${screen.height}`;
    deviceId = btoa(fingerprint).substring(0, 16).replace(/[^a-zA-Z0-9]/g, '');
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

// Get current session ID from store
let currentSessionId = null;

// Function to update context (called from POS component)
export const updatePrintLoggerContext = (sessionId, storeId, userId) => {
  currentSessionId = sessionId;
  // storeId and userId are available from the user context in the backend
};

// Send log to server (non-blocking, doesn't throw errors)
export const sendPrintLog = async (logLevel, logTag, message, data = {}, receiptNumber = null, transactionId = null) => {
  try {
    const logData = {
      log_level: logLevel,
      log_tag: logTag,
      message: message,
      data: {
        ...data,
        user_agent: navigator.userAgent,
        platform: navigator.platform,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      },
      receipt_number: receiptNumber,
      transaction_id: transactionId,
      device_id: getDeviceId(),
      session_id: currentSessionId,
    };

    // Send to server (fire and forget - don't wait for response)
    printLogAPI.create(logData).catch(error => {
      // Silently fail - we don't want logging to break the app
      console.warn('[PRINT-LOGGER] Failed to send log to server:', error.message);
    });
  } catch (error) {
    // Silently fail - we don't want logging to break the app
    console.warn('[PRINT-LOGGER] Error creating log:', error.message);
  }
};

// Convenience functions for different log levels
export const logPrintInfo = (tag, message, data = {}, receiptNumber = null, transactionId = null) => {
  console.log(`[${tag}] ${message}`, data);
  sendPrintLog('info', tag, message, data, receiptNumber, transactionId);
};

export const logPrintWarn = (tag, message, data = {}, receiptNumber = null, transactionId = null) => {
  console.warn(`[${tag}] ${message}`, data);
  sendPrintLog('warn', tag, message, data, receiptNumber, transactionId);
};

export const logPrintError = (tag, message, data = {}, receiptNumber = null, transactionId = null) => {
  console.error(`[${tag}] ${message}`, data);
  const errorData = {
    ...data,
    error: {
      message: data.error?.message || message,
      stack: data.error?.stack,
      name: data.error?.name,
    }
  };
  sendPrintLog('error', tag, message, errorData, receiptNumber, transactionId);
};

export const logPrintDebug = (tag, message, data = {}, receiptNumber = null, transactionId = null) => {
  console.debug(`[${tag}] ${message}`, data);
  sendPrintLog('debug', tag, message, data, receiptNumber, transactionId);
};
