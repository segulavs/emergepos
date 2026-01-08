// Printer utilities for thermal receipt printers
// Supports: Browser print, Web Serial API (USB), and Bluetooth (Web Bluetooth API)

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
let printerType = 'browser'; // 'browser', 'usb', 'bluetooth'

// Check if Web Serial API is available
export const isSerialSupported = () => 'serial' in navigator;

// Check if Web Bluetooth is available
export const isBluetoothSupported = () => 'bluetooth' in navigator;

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
  
  return output;
};

// Print receipt based on connection type
export const printReceipt = async (receipt, settings = {}) => {
  switch (printerType) {
    case 'usb':
      try {
        const formatted = formatThermalReceipt(receipt, settings);
        // Debug: log formatted output to verify brand lines are included
        console.log('Thermal receipt formatted output (first 500 chars):', formatted.substring(0, 500));
        await sendToUSBPrinter(formatted);
        return { success: true, method: 'usb' };
      } catch (error) {
        console.error('USB print failed:', error);
        // Fallback to browser print
        printBrowserReceipt(receipt, settings);
        return { success: true, method: 'browser-fallback' };
      }
    
    case 'bluetooth':
      // Bluetooth printing would be implemented here
      // For now, fall back to browser
      printBrowserReceipt(receipt, settings);
      return { success: true, method: 'browser-fallback' };
    
    case 'browser':
    default:
      printBrowserReceipt(receipt, settings);
      return { success: true, method: 'browser' };
  }
};

// Browser print (opens print dialog)
export const printBrowserReceipt = (receipt, settings = {}) => {
  // This triggers the browser's native print dialog
  // The receipt should be displayed in a print-friendly format
  window.print();
};

// Get current printer status
export const getPrinterStatus = () => {
  return {
    type: printerType,
    connected: printerType !== 'browser' && printerWriter !== null,
    serialSupported: isSerialSupported(),
    bluetoothSupported: isBluetoothSupported()
  };
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

// Open receipt in new window for printing
export const openPrintWindow = (receipt, settings = {}) => {
  const html = generateReceiptHTML(receipt, settings);
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  // Close after print dialog
  printWindow.onafterprint = () => printWindow.close();
};
