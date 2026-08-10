import 'package:flutter/material.dart';

/// Widget de rodapé com copyright para páginas web
class CopyrightFooter extends StatelessWidget {
  const CopyrightFooter({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 16),
      color: Colors.transparent,
      child: Center(
        child: Text(
          '© 2025 SEMIT - Secretaria Municipal de Inovação e Tecnologia',
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

