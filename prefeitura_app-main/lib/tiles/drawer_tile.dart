import 'package:flutter/material.dart';
import 'package:prefeitura_app/screens/mobile/category_screen.dart';

class DrawerTiles extends StatelessWidget {
  final IconData icon;
  final String text;
  final PageController controller;
  final int page;
  final VoidCallback? onTap;
  final Widget? customLeading;

  DrawerTiles(this.icon, this.text, this.controller, this.page, {this.onTap, this.customLeading});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          Navigator.of(context).pop();
          if (onTap != null) {
            onTap!();
          } else {
            controller.jumpToPage(page);
          }
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            color: Colors.white.withOpacity(0.1),
            border: Border.all(
              color: Colors.white.withOpacity(0.2),
              width: 0.5,
            ),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: customLeading ?? Icon(icon, color: const Color.fromRGBO(238, 112, 112, 1.0), size: 20),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  text,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
              const Icon(
                Icons.arrow_forward_ios,
                color: Color.fromRGBO(238, 112, 112, 1.0),
                size: 14,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
