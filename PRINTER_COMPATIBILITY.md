# Printer Compatibility Guide: RawBT & MPT-III

## Overview

This POS system supports multiple thermal receipt printer options, including **RawBT** (Android print service) and **Milestone MPT-III** (Bluetooth thermal printer). Both are fully compatible with our ESC/POS-based receipt printing system.

## ✅ Compatibility Summary

| Printer/Service | Platform | Connection | Status |
|----------------|----------|------------|--------|
| **RawBT** | Android | HTTP (localhost:8080) | ✅ Fully Supported |
| **MPT-III** | Android/iOS | Bluetooth/USB | ✅ Fully Supported |
| **Web Serial API** | Desktop Browsers | USB | ✅ Supported |
| **Web Bluetooth API** | Desktop Browsers | Bluetooth | ✅ Supported |

---

## 📱 RawBT Integration

### What is RawBT?
RawBT is an Android application that acts as a print service, accepting ESC/POS commands via HTTP and forwarding them to connected thermal printers (Bluetooth, USB, or Wi-Fi).

### Setup Instructions

#### 1. Install RawBT
- Download RawBT from [Google Play Store](https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter)
- Or visit [RawBT Official Website](https://rawbt.ru)

#### 2. Configure RawBT
1. Open RawBT app on your Android device
2. Connect your thermal printer (Bluetooth/USB/Wi-Fi):
   - **Bluetooth**: Pair your printer in Android Bluetooth settings, then select it in RawBT
   - **USB**: Connect via OTG cable, RawBT will detect it
   - **Wi-Fi**: Enter printer IP address in RawBT settings
3. Ensure RawBT service is running (it should start automatically)

#### 3. Connect to POS System

**For Web Frontend:**
- When viewing a receipt, click "Connect RawBT" button
- The system will attempt to connect to `http://localhost:8080/` (RawBT default endpoint)
- Once connected, printing will automatically use RawBT

**For Custom IP/Port:**
If RawBT is running on a different device or port:
```javascript
import { setRawBTUrl } from '@/lib/printer';
setRawBTUrl('http://YOUR_ANDROID_IP:8080/');
```

#### 4. Print Receipts
- After connecting, click "Print" on any receipt
- ESC/POS commands will be sent to RawBT
- RawBT will forward to your connected printer

### RawBT Features
- ✅ Supports Bluetooth, USB, and Wi-Fi printers
- ✅ ESC/POS command compatible
- ✅ Works with MPT-III and most thermal printers
- ⚠️ Free version includes watermark (Premium removes it)

---

## 🖨️ Milestone MPT-III Integration

### What is MPT-III?
Milestone MPT-III is a compact Bluetooth thermal receipt printer with the following specs:
- **Print Width**: 72mm (80mm paper)
- **Print Speed**: Up to 90mm/s
- **Battery**: 7.4V 2600mAh rechargeable
- **Connectivity**: Bluetooth + USB
- **Command Set**: ESC/POS compatible

### Setup Instructions

#### Method 1: Via RawBT (Recommended for Android Web Apps)
1. Install RawBT on your Android device (see above)
2. Pair MPT-III with your Android device:
   - Turn on MPT-III printer
   - Enable Bluetooth on Android device
   - Search for "MPT-III" or "Milestone" in Bluetooth settings
   - Pair using default PIN: `1234` or `0000`
3. Open RawBT app
4. Select MPT-III as your printer in RawBT
5. Use RawBT integration in POS system (see RawBT section above)

#### Method 2: Direct Bluetooth (Flutter App)
The Flutter mobile app uses `esc_pos_printer` package which supports direct Bluetooth connection:

1. **Install Flutter App** on your Android/iOS device
2. **Pair MPT-III** via Bluetooth:
   - Android: Settings → Bluetooth → Pair with "MPT-III" (PIN: 1234)
   - iOS: Settings → Bluetooth → Pair with "MPT-III" (PIN: 1234)
3. **Connect in App**:
   - Open POS screen
   - Tap printer icon
   - Select "MPT-III" from available Bluetooth devices
4. **Print Receipts**: Receipts will print directly via Bluetooth

#### Method 3: USB Connection (Desktop/Tablet)
1. Connect MPT-III via USB to your device
2. **For Web (Chrome/Edge)**:
   - Use "Connect USB" button in receipt view
   - Browser will prompt to select printer port
   - Select MPT-III COM port
3. **For Flutter Desktop**:
   - The app will auto-detect USB-connected printer
   - Select MPT-III when prompted

---

## 🖥️ Web Frontend Integration

### Using RawBT with Web POS

The web frontend (React) now includes RawBT support:

```javascript
import { connectRawBTPrinter, printReceipt, getPrinterStatus } from '@/lib/printer';

// Connect to RawBT (defaults to localhost:8080)
await connectRawBTPrinter();

// Or use custom URL
await connectRawBTPrinter('http://192.168.1.100:8080/');

// Print a receipt
const result = await printReceipt(receiptData, {
  storeName: 'My Store',
  storeAddress: '123 Main St',
  currencySymbol: 'K'
});

// Check printer status
const status = getPrinterStatus();
console.log(status.type); // 'rawbt' if connected
```

### Available Printer Types
- `browser`: Browser print dialog (fallback)
- `usb`: USB via Web Serial API
- `bluetooth`: Bluetooth via Web Bluetooth API
- `rawbt`: RawBT service (Android)

---

## 📱 Flutter App Integration

### Direct Bluetooth Connection

The Flutter app uses `esc_pos_printer` package which directly supports MPT-III:

```dart
import 'package:esc_pos_printer/esc_pos_printer.dart';
import 'package:esc_pos_utils/esc_pos_utils.dart';

// Connect to MPT-III via Bluetooth
final printer = BluetoothPrinter(BluetoothPrinterInput(
  name: 'MPT-III', // or your printer's Bluetooth name
  address: 'XX:XX:XX:XX:XX:XX', // printer MAC address
  isIOS: false,
));

final result = await printer.connect();
if (result == PosPrintResult.success) {
  // Print receipt using ESC/POS commands
  final generator = Generator(PaperSize.mm80, await CapabilityProfile.load());
  printer.print(/* ESC/POS data */);
}
```

### Flutter App Printer Support
- ✅ Direct Bluetooth connection (MPT-III, Paperang, Peripage, etc.)
- ✅ USB connection (via platform channels)
- ✅ Network printers (if printer supports TCP/IP)

---

## 🔧 Technical Details

### ESC/POS Commands Used

This POS system generates standard ESC/POS commands compatible with both RawBT and MPT-III:

- **Initialize**: `ESC @` (Reset printer)
- **Alignment**: `ESC a` (Left/Center/Right)
- **Text Formatting**: `ESC E` (Bold), `GS !` (Size)
- **Paper Feed**: `ESC d` (Line feeds)
- **Cut Paper**: `GS V 0` (Full cut)

### Receipt Format
All receipts include:
- Store header (centered, double height)
- Receipt number and date
- Item list with prices and quantities
- Brand information for each item
- Totals and tax calculations
- Payment method and change
- Footer message

---

## 🐛 Troubleshooting

### RawBT Issues

**Problem**: "RawBT not available" error
- **Solution**: 
  - Ensure RawBT app is installed and running
  - Check if RawBT service is active (should show in notification)
  - Try restarting RawBT app
  - Verify URL: `http://localhost:8080/` (or custom IP if using network device)

**Problem**: Receipt prints but formatting is wrong
- **Solution**: 
  - Ensure printer is set to 80mm paper width in RawBT settings
  - Check if printer supports ESC/POS commands
  - Try updating RawBT to latest version

**Problem**: Watermark on printed receipts
- **Solution**: Upgrade to RawBT Premium to remove watermark

### MPT-III Issues

**Problem**: Can't pair MPT-III via Bluetooth
- **Solution**: 
  - Ensure printer is powered on and in pairing mode (LED should blink)
  - Try default PINs: `1234`, `0000`, or `8888`
  - Move printer closer to device (within 10 meters)
  - Reset printer by holding power button for 10 seconds

**Problem**: Connection drops during printing
- **Solution**: 
  - Check battery level (should be above 20%)
  - Reduce distance between devices
  - Ensure no interference from other Bluetooth devices
  - Try USB connection instead

**Problem**: Print quality issues
- **Solution**: 
  - Clean print head with alcohol wipes
  - Replace thermal paper roll
  - Check paper alignment
  - Adjust print darkness in printer settings

---

## 📚 Additional Resources

- **RawBT Documentation**: https://rawbt.ru/mike42/example_rawbt/
- **MPT-III Manual**: Check printer packaging or manufacturer website
- **ESC/POS Command Reference**: https://reference.epson-biz.com/modules/ref_escpos/
- **Flutter esc_pos_printer**: https://pub.dev/packages/esc_pos_printer

---

## ✅ Summary

**Yes, both RawBT and MPT-III work with this POS system!**

- **RawBT**: Perfect for Android web apps, works with any ESC/POS printer
- **MPT-III**: Direct Bluetooth support in Flutter app, or use via RawBT for web apps
- **Compatibility**: Both support standard ESC/POS commands used by this system
- **Setup**: Simple installation and pairing process

For the best experience:
- **Web apps on Android**: Use RawBT → MPT-III
- **Flutter mobile app**: Direct Bluetooth to MPT-III
- **Desktop browsers**: Use Web Serial API (USB) or Web Bluetooth API

---

**Need Help?** Check the troubleshooting section above or refer to the printer manufacturer's documentation.
