import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';


class QRCodeScannerPage extends StatefulWidget {
  const QRCodeScannerPage({super.key});

  @override
  State<QRCodeScannerPage> createState() => _QRCodeScannerPageState();
}

class _QRCodeScannerPageState extends State<QRCodeScannerPage> {
  // Configura especificamente para QR Codes para melhorar performance e evitar outros códigos de barras
  final MobileScannerController controller = MobileScannerController(
    formats: [BarcodeFormat.qrCode],
    detectionSpeed: DetectionSpeed.noDuplicates,
  );
  bool _isProcessing = false;

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_isProcessing) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final barcode = barcodes.first;
    
    if (barcode.rawValue != null) {
      final String code = barcode.rawValue!;
        
      // Simple logic to extract ID if it's a URL
      String poleId = code;
      if (code.contains('/')) {
         // Handle URL formats like http://.../ID
         final parts = code.split('/');
         if (parts.isNotEmpty) {
           poleId = parts.last;
         }
      }
      
      // Remove any whitespace that might have come from the scan
      poleId = poleId.trim();

      if (poleId.isEmpty) return;

      setState(() {
          _isProcessing = true;
      });

      // Feedback visual/sonoro poderia ser adicionado aqui
      debugPrint('QR Code detectado: $poleId');

      // Navigate to Report Page with the ID
      // Usa URL Encode para garantir que caracteres como '+' passem corretamente na rota
      Navigator.pushNamed(
        context,
        '/iluminacao/report/${Uri.encodeComponent(poleId)}?fromQr=1',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
            // Torch Button
            IconButton(
              icon: const Icon(Icons.flash_on, color: Colors.white),
              onPressed: () => controller.toggleTorch(),
            ),
            // Switch Camera Button
            IconButton(
              icon: const Icon(Icons.cameraswitch, color: Colors.white),
              onPressed: () => controller.switchCamera(),
            ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: controller,
            onDetect: _onDetect,
          ),
          // Overlay
          Container(
            decoration: ShapeDecoration(
              shape: QrScannerOverlayShape(
                borderColor: Colors.blue,
                borderRadius: 10,
                borderLength: 30,
                borderWidth: 10,
                cutOutSize: 300,
              ),
            ),
          ),
          Positioned(
            bottom: 80,
            left: 0,
            right: 0,
            child: Text(
              'Aponte para o QR Code do poste',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                backgroundColor: Colors.black.withOpacity(0.5),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Simple overlay shape class (Mocking standard library behavior usually found in older qr libs, 
// implementing a custom Painter is better but for speed using a container with border is easier or using a package)
// Since QrScannerOverlayShape is from 'qr_code_scanner' which is deprecated, I will remove it and use a simpler overlay.
class QrScannerOverlayShape extends ShapeBorder {
  final Color borderColor;
  final double borderWidth;
  final Color overlayColor;
  final double borderRadius;
  final double borderLength;
  final double cutOutSize;

  QrScannerOverlayShape({
    this.borderColor = Colors.red,
    this.borderWidth = 10.0,
    this.overlayColor = const Color.fromRGBO(0, 0, 0, 0.5),
    this.borderRadius = 10,
    this.borderLength = 40,
    this.cutOutSize = 250,
  });

  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.zero;

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) {
    return Path()
      ..fillType = PathFillType.evenOdd
      ..addPath(getOuterPath(rect), Offset.zero);
  }

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    Path getLeftTopPath(Rect rect) {
      return Path()
        ..moveTo(rect.left, rect.bottom)
        ..lineTo(rect.left, rect.top)
        ..lineTo(rect.right, rect.top);
    }

    return getLeftTopPath(rect);
  }

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    final width = rect.width;
    final height = rect.height;
    final borderOffset = borderWidth / 2;
    final _cutOutSize = cutOutSize;
    final _cutOutRect = Rect.fromLTWH(
      width / 2 - _cutOutSize / 2 + borderOffset,
      height / 2 - _cutOutSize / 2 + borderOffset,
      _cutOutSize - borderWidth,
      _cutOutSize - borderWidth,
    );

    final backgroundPaint = Paint()
      ..color = overlayColor
      ..style = PaintingStyle.fill;

    final borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = borderWidth;

    final boxPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.fill;

    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(rect),
        Path()
          ..addRRect(
            RRect.fromRectAndRadius(
              _cutOutRect,
              Radius.circular(borderRadius),
            ),
          ),
      ),
      backgroundPaint,
    );

    // Draw corners
    // Top left
    canvas.drawPath(
      Path()
        ..moveTo(_cutOutRect.left, _cutOutRect.top + borderLength)
        ..lineTo(_cutOutRect.left, _cutOutRect.top)
        ..lineTo(_cutOutRect.left + borderLength, _cutOutRect.top),
      borderPaint,
    );
     // Top right
    canvas.drawPath(
      Path()
        ..moveTo(_cutOutRect.right, _cutOutRect.top + borderLength)
        ..lineTo(_cutOutRect.right, _cutOutRect.top)
        ..lineTo(_cutOutRect.right - borderLength, _cutOutRect.top),
      borderPaint,
    );
    // Bottom right
    canvas.drawPath(
      Path()
        ..moveTo(_cutOutRect.right, _cutOutRect.bottom - borderLength)
        ..lineTo(_cutOutRect.right, _cutOutRect.bottom)
        ..lineTo(_cutOutRect.right - borderLength, _cutOutRect.bottom),
      borderPaint,
    );
    // Bottom left
    canvas.drawPath(
      Path()
        ..moveTo(_cutOutRect.left, _cutOutRect.bottom - borderLength)
        ..lineTo(_cutOutRect.left, _cutOutRect.bottom)
        ..lineTo(_cutOutRect.left + borderLength, _cutOutRect.bottom),
      borderPaint,
    );
  }

  @override
  ShapeBorder scale(double t) {
    return QrScannerOverlayShape(
      borderColor: borderColor,
      borderWidth: borderWidth * t,
      overlayColor: overlayColor,
    );
  }
}
