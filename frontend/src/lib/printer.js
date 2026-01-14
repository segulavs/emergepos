// Printer utilities for thermal receipt printers
// Supports: Browser print, Web Serial API (USB), Bluetooth (Web Bluetooth API), and RawBT (Android)
import { logPrintInfo, logPrintWarn, logPrintError, logPrintDebug } from './printLogger';

// ESC/POS Commands for thermal printers
const ESC = '\x1B';
const GS = '\x1D';

const COMMANDS = {
  INIT: ESC + '@',                    // Initialize printer
  ALIGN_CENTER: ESC + 'a' + '\x01',   // Center alignment
  ALIGN_LEFT: ESC + 'a' + '\x00',     // Left alignment
  ALIGN_RIGHT: ESC + 'a' + '\x02',    // Right alignment
  BOLD_ON: ESC + 'E' + '\x01',        // Bold on
  BOLD_OFF: ESC + 'E' + '\x00',       // Bold off
  DOUBLE_HEIGHT: GS + '!' + '\x01',   // Double height
  NORMAL_SIZE: GS + '!' + '\x00',     // Normal size
  CUT_PAPER: GS + 'V' + '\x00',       // Cut paper
  FEED_LINE: '\n',                    // Line feed
  FEED_LINES: (n) => ESC + 'd' + String.fromCharCode(n), // Feed n lines
  LF: '\x0A',                         // Line Feed (LF) - ESC/POS standard
  CR: '\x0D',                         // Carriage Return (CR)
  CRLF: '\x0D\x0A',                   // CR+LF for compatibility
};

// Printer connection state
let serialPort = null;
let printerWriter = null;
let printerType = 'browser'; // 'browser', 'usb', 'bluetooth', 'rawbt'
let rawbtUrl = 'http://localhost:8080'; // RawBT default endpoint (no trailing slash)
let rawbtConnected = false; // Track RawBT connection status

// Check if Web Serial API is available
export const isSerialSupported = () => 'serial' in navigator;

// Check if Web Bluetooth is available
export const isBluetoothSupported = () => 'bluetooth' in navigator;

// Check if RawBT is available (for Android devices)
export const checkRawBTAvailable = async () => {
  try {
    // RawBT runs on localhost:8080 on Android devices
    const response = await fetch(rawbtUrl, {
      method: 'HEAD',
      mode: 'no-cors', // CORS might block, but we just need to check availability
      cache: 'no-cache'
    });
    return true;
  } catch (error) {
    // Try a simple test to see if RawBT endpoint is reachable
    // In practice, you'd attempt a connection and handle the error gracefully
    return false;
  }
};

// Auto-connect to RawBT on Android devices
export const autoConnectRawBT = async () => {
  const isAndroid = /Android/i.test(navigator.userAgent);
  if (!isAndroid) {
    return { success: false, reason: 'not_android' };
  }
  
  // If already connected, return success
  if (printerType === 'rawbt' && rawbtConnected) {
    return { success: true, alreadyConnected: true };
  }
  
  try {
    const result = await connectRawBTPrinter();
    return { success: true, ...result };
  } catch (error) {
    logPrintWarn('AUTO-CONNECT-RAWBT', 'Auto-connect failed', {
      error: error.message
    });
    return { success: false, error: error.message };
  }
};

// Connect to RawBT printer (Android)
export const connectRawBTPrinter = async (customUrl = null) => {
  logPrintInfo('CONNECT-RAWBT', 'Starting RawBT connection', {
    custom_url: customUrl,
    current_rawbt_url: rawbtUrl
  });
  
  if (customUrl) {
    // Remove trailing slash if present
    rawbtUrl = customUrl.replace(/\/$/, '');
    logPrintDebug('CONNECT-RAWBT', 'Updated RawBT URL', { new_url: rawbtUrl });
  }
  
  try {
    // Test connection by sending a simple ESC/POS init command
    // This is a minimal test to verify RawBT is responding
    logPrintInfo('CONNECT-RAWBT', 'Testing connection with init command', {});
    const testData = COMMANDS.INIT + COMMANDS.FEED_LINE;
    logPrintDebug('CONNECT-RAWBT', 'Test data prepared', { test_data_length: testData.length });
    const response = await sendToRawBT(testData);
    
    logPrintDebug('CONNECT-RAWBT', 'Connection test response', { response });
    
    if (response.success) {
      printerType = 'rawbt';
      rawbtConnected = true;
      logPrintInfo('CONNECT-RAWBT', 'SUCCESS - RawBT printer connected', { rawbt_url: rawbtUrl });
      return { success: true, type: 'rawbt', url: rawbtUrl };
    } else {
      logPrintError('CONNECT-RAWBT', 'Connection test failed - response not successful', {});
      throw new Error('RawBT connection test failed');
    }
  } catch (error) {
    printerType = 'browser';
    rawbtConnected = false;
    logPrintError('CONNECT-RAWBT', 'Connection failed', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      rawbt_url: rawbtUrl
    });
    throw new Error(`RawBT not available. Make sure RawBT app is installed and running on your Android device. Error: ${error.message}`);
  }
};

// Disconnect RawBT printer
export const disconnectRawBTPrinter = () => {
  if (printerType === 'rawbt') {
    printerType = 'browser';
    rawbtConnected = false;
  }
};

// Send data to RawBT printer via HTTP POST
// RawBT accepts ESC/POS data in multiple formats
const sendToRawBT = async (escPosData) => {
  logPrintInfo('SEND-RAWBT', 'Starting sendToRawBT', {
    rawbt_url: rawbtUrl,
    input_data_length: escPosData.length
  });
  
  // Convert ESC/POS string to bytes
  const encoder = new TextEncoder();
  const bytes = encoder.encode(escPosData);
  logPrintDebug('SEND-RAWBT', 'Encoded to bytes', { bytes_length: bytes.length });
  
  // Convert to base64 for RawBT
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);
  logPrintDebug('SEND-RAWBT', 'Converted to base64', { base64_length: base64Data.length });
  
  // Try multiple RawBT endpoints and formats
  const endpoints = [
    { url: `${rawbtUrl}/print`, contentType: 'text/plain', body: base64Data },
    { url: rawbtUrl, contentType: 'text/plain', body: base64Data },
    { url: `${rawbtUrl}/print`, contentType: 'application/octet-stream', body: bytes },
    { url: rawbtUrl, contentType: 'application/octet-stream', body: bytes },
  ];
  
  logPrintInfo('SEND-RAWBT', `Will try ${endpoints.length} endpoints`, { endpoint_count: endpoints.length });
  
  let lastError = null;
  let attemptCount = 0;
  
  for (const endpoint of endpoints) {
    attemptCount++;
    logPrintDebug('SEND-RAWBT', `Attempt ${attemptCount}/${endpoints.length}`, {
      url: endpoint.url,
      content_type: endpoint.contentType
    });
    
    try {
      // First try with CORS
      try {
        logPrintDebug('SEND-RAWBT', 'Trying with CORS mode', { url: endpoint.url });
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': endpoint.contentType,
          },
          body: endpoint.body,
        });
        
        logPrintDebug('SEND-RAWBT', 'Received response', {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        if (response.ok || response.status === 200) {
          logPrintInfo('SEND-RAWBT', 'SUCCESS', { endpoint: endpoint.url });
          rawbtConnected = true;
          return { success: true, endpoint: endpoint.url };
        } else {
          logPrintWarn('SEND-RAWBT', 'Response not OK', {
            status: response.status,
            url: endpoint.url
          });
          const responseText = await response.text().catch(() => 'Unable to read response');
          logPrintDebug('SEND-RAWBT', 'Response body', {
            preview: responseText.substring(0, 200)
          });
        }
      } catch (corsError) {
        // Try with no-cors mode
        logPrintWarn('SEND-RAWBT', 'CORS error, trying no-cors mode', {
          error: corsError.message,
          url: endpoint.url
        });
        
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': endpoint.contentType,
          },
          body: endpoint.body,
          mode: 'no-cors',
        });
        
        // With no-cors, response is opaque, assume success if no error
        logPrintInfo('SEND-RAWBT', 'No-CORS request sent (opaque response), assuming success', {
          endpoint: endpoint.url,
          mode: 'no-cors'
        });
        rawbtConnected = true;
        return { success: true, endpoint: endpoint.url, mode: 'no-cors' };
      }
    } catch (error) {
      lastError = error;
      logPrintError('SEND-RAWBT', `Endpoint ${endpoint.url} failed`, {
        error: error.message,
        stack: error.stack,
        name: error.name,
        url: endpoint.url
      });
    }
  }
  
  logPrintError('SEND-RAWBT', 'All endpoints failed', {
    rawbt_url: rawbtUrl,
    last_error: lastError?.message || 'Unknown error'
  });
  rawbtConnected = false;
  throw new Error(`Failed to send to RawBT. Make sure RawBT app is running at ${rawbtUrl}. Error: ${lastError?.message || 'Unknown error'}`);
};

// Connect to USB printer via Web Serial API
export const connectUSBPrinter = async () => {
  if (!isSerialSupported()) {
    throw new Error('Web Serial API not supported in this browser');
  }

  try {
    // Request port selection
    serialPort = await navigator.serial.requestPort();
    
    // Open connection with typical thermal printer settings
    await serialPort.open({
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: 'none'
    });

    printerWriter = serialPort.writable.getWriter();
    printerType = 'usb';
    
    // Initialize printer
    await sendToUSBPrinter(COMMANDS.INIT);
    
    return { success: true, type: 'usb' };
  } catch (error) {
    console.error('USB printer connection failed:', error);
    throw error;
  }
};

// Connect to Bluetooth printer
export const connectBluetoothPrinter = async () => {
  if (!isBluetoothSupported()) {
    throw new Error('Web Bluetooth API not supported in this browser');
  }

  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Common thermal printer service
      ],
      optionalServices: ['battery_service']
    });

    const server = await device.gatt.connect();
    // Note: Actual implementation would need the specific service UUID for the printer
    
    printerType = 'bluetooth';
    return { success: true, type: 'bluetooth', device: device.name };
  } catch (error) {
    console.error('Bluetooth printer connection failed:', error);
    throw error;
  }
};

// Disconnect printer
export const disconnectPrinter = async () => {
  try {
    if (printerWriter) {
      await printerWriter.close();
      printerWriter = null;
    }
    if (serialPort) {
      await serialPort.close();
      serialPort = null;
    }
    printerType = 'browser';
    return { success: true };
  } catch (error) {
    console.error('Disconnect failed:', error);
    throw error;
  }
};

// Send data to USB printer
const sendToUSBPrinter = async (data) => {
  if (!printerWriter) {
    throw new Error('Printer not connected');
  }
  
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);
  await printerWriter.write(encoded);
};

// Format receipt for thermal printer (ESC/POS)
export const formatThermalReceipt = (receipt, settings = {}) => {
  logPrintDebug('FORMAT-THERMAL', 'Starting formatThermalReceipt', {
    receipt_number: receipt.receipt_number,
    items_count: receipt.items?.length || 0,
    total: receipt.total,
    settings: settings
  }, receipt.receipt_number);
  
  const currencySymbol = settings.currencySymbol || 'K';
  const formatCurrency = (amount) => `${currencySymbol}${(amount || 0).toFixed(2)}`;
  
  let output = '';
  
  // Initialize
  output += COMMANDS.INIT;
  
  // Store Header
  output += COMMANDS.ALIGN_CENTER;
  output += COMMANDS.DOUBLE_HEIGHT;
  output += (settings.storeName || 'Store') + COMMANDS.CRLF;
  output += COMMANDS.NORMAL_SIZE;
  if (settings.storeAddress) {
    output += settings.storeAddress + COMMANDS.CRLF;
  }
  output += COMMANDS.CRLF;
  
  // Receipt Info
  output += COMMANDS.ALIGN_LEFT;
  output += `Receipt: ${receipt.receipt_number}` + COMMANDS.CRLF;
  output += `Date: ${new Date(receipt.created_at).toLocaleString()}` + COMMANDS.CRLF;
  if (receipt.cashier_name) {
    output += `Cashier: ${receipt.cashier_name}` + COMMANDS.CRLF;
  }
  output += COMMANDS.CRLF;
  
  // Customer Info
  if (receipt.customer_name) {
    output += COMMANDS.BOLD_ON;
    output += `Customer: ${receipt.customer_name}` + COMMANDS.CRLF;
    output += COMMANDS.BOLD_OFF;
    if (receipt.customer_phone) {
      output += `Phone: ${receipt.customer_phone}` + COMMANDS.CRLF;
    }
    output += COMMANDS.CRLF;
  }
  
  // Separator
  output += '-'.repeat(32) + COMMANDS.CRLF;
  
  // Items - ESC/POS compatible formatting
  for (const item of receipt.items || []) {
    const itemTotal = item.line_total || (item.quantity * item.unit_price);
    // Ensure left alignment for items
    output += COMMANDS.ALIGN_LEFT;
    // First row: description, unit price, quantity, total price
    output += `${item.product_name} ${formatCurrency(item.unit_price)} x${item.quantity} ${formatCurrency(itemTotal)}`;
    output += COMMANDS.CRLF; // Use CR+LF for ESC/POS compatibility
    
    // Second row: brand (always show, even if empty)
    // Ensure brand is always displayed on second line with proper ESC/POS formatting
    const brandValue = (item.brand !== undefined && item.brand !== null && String(item.brand).trim() !== '') 
      ? String(item.brand).trim() 
      : 'N/A';
    output += `  Brand: ${brandValue}`;
    output += COMMANDS.CRLF; // Use CR+LF for ESC/POS compatibility
    output += COMMANDS.FEED_LINE; // Additional line feed for spacing
  }
  
  // Separator
  output += '-'.repeat(32) + COMMANDS.CRLF;
  
  // Totals
  output += COMMANDS.BOLD_ON;
  const total = receipt.total || receipt.items?.reduce((sum, i) => sum + (i.line_total || i.quantity * i.unit_price), 0) || 0;
  output += `TOTAL: ${formatCurrency(total).padStart(25)}` + COMMANDS.CRLF;
  output += COMMANDS.BOLD_OFF;
  
  // Payment
  if (receipt.payments && receipt.payments.length > 0) {
    const payment = receipt.payments[0];
    output += `Paid (${payment.method.toUpperCase()}): ${formatCurrency(payment.amount).padStart(18)}` + COMMANDS.CRLF;
    if (payment.amount > total) {
      output += `Change: ${formatCurrency(payment.amount - total).padStart(24)}` + COMMANDS.CRLF;
    }
  }
  
  output += COMMANDS.CRLF;
  
  // Footer
  output += COMMANDS.ALIGN_CENTER;
  output += 'Thank you for your purchase!' + COMMANDS.CRLF;
  output += COMMANDS.CRLF + COMMANDS.CRLF + COMMANDS.CRLF;
  
  // Cut paper
  output += COMMANDS.CUT_PAPER;
  
  logPrintDebug('FORMAT-THERMAL', 'Formatted receipt complete', {
    length: output.length,
    first_200_chars: output.substring(0, 200),
    last_200_chars: output.substring(Math.max(0, output.length - 200))
  }, receipt.receipt_number);
  
  return output;
};

// Print receipt based on connection type
export const printReceipt = async (receipt, settings = {}, autoConnectRawBT = true) => {
  logPrintInfo('PRINT-RECEIPT', 'Starting printReceipt function', {
    printer_type: printerType,
    rawbt_connected: rawbtConnected,
    printer_writer_exists: printerWriter !== null,
    receipt_number: receipt.receipt_number,
    auto_connect_rawbt: autoConnectRawBT
  }, receipt.receipt_number, receipt.id);
  
  // On Android, try to auto-connect to RawBT if not already connected
  if (autoConnectRawBT && printerType !== 'rawbt' && /Android/i.test(navigator.userAgent)) {
    logPrintInfo('PRINT-RECEIPT', 'Attempting auto-connect to RawBT on Android', {}, receipt.receipt_number);
    const autoConnectResult = await autoConnectRawBT();
    if (autoConnectResult.success) {
      logPrintInfo('PRINT-RECEIPT', 'Auto-connected to RawBT successfully', {}, receipt.receipt_number);
    } else {
      logPrintDebug('PRINT-RECEIPT', 'Auto-connect to RawBT failed or not available', {
        reason: autoConnectResult.reason || autoConnectResult.error
      }, receipt.receipt_number);
    }
  }
  
  switch (printerType) {
    case 'usb':
      logPrintInfo('PRINT-RECEIPT', 'Using USB printer path', {}, receipt.receipt_number);
      try {
        const formatted = formatThermalReceipt(receipt, settings);
        logPrintDebug('PRINT-RECEIPT', 'Formatted receipt for USB', {
          length: formatted.length,
          preview: formatted.substring(0, 500)
        }, receipt.receipt_number);
        await sendToUSBPrinter(formatted);
        logPrintInfo('PRINT-RECEIPT', 'USB print successful', {}, receipt.receipt_number);
        return { success: true, method: 'usb' };
      } catch (error) {
        logPrintError('PRINT-RECEIPT', 'USB print failed', {
          error: error.message,
          stack: error.stack,
          name: error.name
        }, receipt.receipt_number);
        // Don't fallback to browser print on Android (avoids stuck preview)
        const isAndroid = /Android/i.test(navigator.userAgent);
        if (isAndroid) {
          throw error; // Let caller handle the error
        }
        // Fallback to browser print only on non-Android
        logPrintInfo('PRINT-RECEIPT', 'Falling back to browser print', {}, receipt.receipt_number);
        printBrowserReceipt(receipt, settings);
        return { success: true, method: 'browser-fallback' };
      }
    
    case 'bluetooth':
      logPrintWarn('PRINT-RECEIPT', 'Using Bluetooth printer path (not implemented)', {}, receipt.receipt_number);
      // Bluetooth printing would be implemented here
      // Don't fallback to browser print on Android
      const isAndroid = /Android/i.test(navigator.userAgent);
      if (isAndroid) {
        throw new Error('Bluetooth printing not implemented. Please use RawBT for Android devices.');
      }
      // Fallback to browser print only on non-Android
      printBrowserReceipt(receipt, settings);
      return { success: true, method: 'browser-fallback' };
    
    case 'rawbt':
      logPrintInfo('PRINT-RECEIPT', 'Using RawBT printer path', {
        rawbt_url: rawbtUrl,
        rawbt_connected: rawbtConnected
      }, receipt.receipt_number);
      try {
        const formatted = formatThermalReceipt(receipt, settings);
        logPrintDebug('PRINT-RECEIPT', 'Formatted receipt for RawBT', {
          length: formatted.length,
          preview: formatted.substring(0, 500)
        }, receipt.receipt_number);
        logPrintInfo('PRINT-RECEIPT', 'Attempting to send to RawBT', {}, receipt.receipt_number);
        const result = await sendToRawBT(formatted);
        logPrintInfo('PRINT-RECEIPT', 'RawBT print successful', { result }, receipt.receipt_number);
        return { success: true, method: 'rawbt' };
      } catch (error) {
        logPrintError('PRINT-RECEIPT', 'RawBT print failed', {
          error: error.message,
          stack: error.stack,
          name: error.name,
          rawbt_url: rawbtUrl,
          rawbt_connected: rawbtConnected
        }, receipt.receipt_number);
        rawbtConnected = false;
        // Don't fallback automatically, let the caller decide
        throw error;
      }
    
    case 'browser':
    default:
      // On Android, avoid browser print dialog (gets stuck on preview)
      const isAndroidDevice = /Android/i.test(navigator.userAgent);
      if (isAndroidDevice) {
        logPrintWarn('PRINT-RECEIPT', 'Browser print not recommended on Android - skipping to avoid stuck preview', {
          printer_type: printerType
        }, receipt.receipt_number);
        throw new Error('No printer connected. Please connect RawBT printer for Android devices.');
      }
      logPrintInfo('PRINT-RECEIPT', 'Using browser print path (default)', {
        printer_type: printerType
      }, receipt.receipt_number);
      printBrowserReceipt(receipt, settings);
      return { success: true, method: 'browser' };
  }
};

// Browser print (opens print dialog)
export const printBrowserReceipt = (receipt, settings = {}) => {
  logPrintInfo('BROWSER-PRINT', 'Starting browser print', {
    receipt_number: receipt.receipt_number,
    user_agent: navigator.userAgent,
    platform: navigator.platform,
    window_print_available: typeof window.print === 'function'
  }, receipt.receipt_number);
  
  try {
    // This triggers the browser's native print dialog
    // The receipt should be displayed in a print-friendly format
    window.print();
    logPrintInfo('BROWSER-PRINT', 'window.print() called successfully', {}, receipt.receipt_number);
  } catch (error) {
    logPrintError('BROWSER-PRINT', 'Error calling window.print()', {
      error: error.message,
      stack: error.stack,
      name: error.name
    }, receipt.receipt_number);
  }
};

// Get current printer status
export const getPrinterStatus = () => {
  const isConnected = printerType === 'rawbt' ? rawbtConnected : (printerWriter !== null);
  const status = {
    type: printerType,
    connected: printerType !== 'browser' && isConnected,
    serialSupported: isSerialSupported(),
    bluetoothSupported: isBluetoothSupported(),
    rawbtSupported: true, // Always available on Android if RawBT app is installed
    rawbtUrl: rawbtUrl,
    rawbtConnected: rawbtConnected
  };
  
  logPrintDebug('GET-PRINTER-STATUS', 'Current status', status);
  return status;
};

// Set RawBT URL (useful if using custom IP/port)
export const setRawBTUrl = (url) => {
  rawbtUrl = url;
};

// Generate receipt HTML for browser printing
export const generateReceiptHTML = (receipt, settings = {}) => {
  const currencySymbol = settings.currencySymbol || 'K';
  const formatCurrency = (amount) => `${currencySymbol}${(amount || 0).toFixed(2)}`;
  
  const total = receipt.total || receipt.items?.reduce((sum, i) => sum + (i.line_total || i.quantity * i.unit_price), 0) || 0;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt ${receipt.receipt_number}</title>
      <style>
        @page { margin: 0; size: 80mm auto; }
        body { 
          font-family: 'Courier New', monospace; 
          font-size: 12px; 
          width: 80mm; 
          margin: 0 auto; 
          padding: 5mm;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .right { text-align: right; }
        .separator { border-top: 1px dashed #000; margin: 5px 0; }
        .header { font-size: 16px; font-weight: bold; }
        .item { display: flex; justify-content: space-between; }
        .item-detail { padding-left: 10px; color: #666; }
        .total { font-size: 14px; font-weight: bold; margin-top: 10px; }
        .logo { max-height: 50px; max-width: 150px; margin: 0 auto 10px; display: block; }
      </style>
    </head>
    <body>
      ${settings.invoiceLogo ? `<img src="${settings.invoiceLogo}" alt="Logo" class="logo" />` : ''}
      <div class="center header">${settings.storeName || 'Store'}</div>
      ${settings.storeAddress ? `<div class="center">${settings.storeAddress}</div>` : ''}
      <div class="separator"></div>
      <div>Receipt: ${receipt.receipt_number}</div>
      <div>Date: ${new Date(receipt.created_at).toLocaleString()}</div>
      ${receipt.cashier_name ? `<div>Cashier: ${receipt.cashier_name}</div>` : ''}
      <div class="separator"></div>
      ${receipt.customer_name ? `
        <div class="bold">Customer: ${receipt.customer_name}</div>
        ${receipt.customer_phone ? `<div>Phone: ${receipt.customer_phone}</div>` : ''}
        <div class="separator"></div>
      ` : ''}
      ${(receipt.items || []).map(item => `
        <div class="item">
          <div>
            <div>${item.product_name} ${formatCurrency(item.unit_price)} x${item.quantity} ${formatCurrency(item.line_total || item.quantity * item.unit_price)}</div>
            <div class="item-detail">Brand: ${item.brand || 'N/A'}</div>
          </div>
        </div>
      `).join('')}
      <div class="separator"></div>
      <div class="item total">
        <span>TOTAL:</span>
        <span>${formatCurrency(total)}</span>
      </div>
      ${receipt.payments?.[0] ? `
        <div class="item">
          <span>Paid (${receipt.payments[0].method.toUpperCase()}):</span>
          <span>${formatCurrency(receipt.payments[0].amount)}</span>
        </div>
        ${receipt.payments[0].amount > total ? `
          <div class="item">
            <span>Change:</span>
            <span>${formatCurrency(receipt.payments[0].amount - total)}</span>
          </div>
        ` : ''}
      ` : ''}
      <div class="separator"></div>
      <div class="center">Thank you for your purchase!</div>
      <div class="center" style="font-size: 10px; margin-top: 5px;">Powered by NG POS</div>
    </body>
    </html>
  `;
};

// Open receipt in new window for printing (without auto-print to avoid stuck preview)
export const openPrintWindow = (receipt, settings = {}, autoPrint = false) => {
  logPrintInfo('OPEN-PRINT-WINDOW', 'Starting openPrintWindow', {
    receipt_number: receipt.receipt_number,
    user_agent: navigator.userAgent,
    platform: navigator.platform,
    auto_print: autoPrint
  }, receipt.receipt_number);
  
  try {
    let html = generateReceiptHTML(receipt, settings);
    
    // Only add auto-print script if explicitly requested (for reports, not receipts)
    if (autoPrint) {
      html = html.replace('</body>', '<script>window.onload = function() { window.print(); }</script></body>');
    }
    
    logPrintDebug('OPEN-PRINT-WINDOW', 'Generated HTML', { html_length: html.length }, receipt.receipt_number);
    
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    if (!printWindow) {
      logPrintError('OPEN-PRINT-WINDOW', 'Failed to open print window - popup blocked?', {}, receipt.receipt_number);
      throw new Error('Failed to open print window. Please allow popups.');
    }
    
    logPrintInfo('OPEN-PRINT-WINDOW', 'Print window opened successfully', {}, receipt.receipt_number);
    
    printWindow.document.write(html);
    printWindow.document.close();
    logPrintDebug('OPEN-PRINT-WINDOW', 'HTML written to print window', {}, receipt.receipt_number);
    
    // Only auto-print if requested (for reports)
    if (autoPrint) {
      // Close after print dialog
      printWindow.onafterprint = () => {
        logPrintInfo('OPEN-PRINT-WINDOW', 'Print dialog closed, closing window', {}, receipt.receipt_number);
        printWindow.close();
      };
    } else {
      // For receipts, just show the window - user can manually print if needed
      // This avoids the stuck "Preparing preview..." issue on Android
      printWindow.focus();
    }
  } catch (error) {
    logPrintError('OPEN-PRINT-WINDOW', 'Fatal error', {
      error: error.message,
      stack: error.stack,
      name: error.name
    }, receipt.receipt_number);
    throw error;
  }
};
