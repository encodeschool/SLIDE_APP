import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

class SlideforgeBottomNavigationBar extends StatelessWidget {
  const SlideforgeBottomNavigationBar({
    super.key,
    required this.selectedIndex,
    required this.cartCount,
    required this.thirdLabel,
    required this.thirdIcon,
    required this.thirdSelectedIcon,
    required this.shopLabel,
    required this.cartLabel,
    required this.onSelected,
  });

  final int selectedIndex;
  final int cartCount;
  final String shopLabel;
  final String cartLabel;
  final String thirdLabel;
  final IconData thirdIcon;
  final IconData thirdSelectedIcon;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    Widget cartIcon(bool selected) => Transform.translate(
      offset: const Offset(0, 0 ),
      child: Container(
        width: 46,
        height: 46,
        decoration: BoxDecoration(
          color: selected ? colors.primary : colors.surfaceContainerHighest,
          shape: BoxShape.circle,
          // boxShadow: [
          //   BoxShadow(
          //     color: colors.shadow.withValues(alpha: selected ? .2 : .1),
          //     blurRadius: selected ? 9 : 5,
          //     offset: const Offset(0, 3),
          //   ),
          // ],
        ),
        child: Center(
          child: Semantics(
            label: cartCount > 0 ? '$cartCount items in cart' : cartLabel,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  selected
                      ? Icons.shopping_bag_rounded
                      : Icons.shopping_bag_outlined,
                  color: selected ? colors.onPrimary : colors.onSurfaceVariant,
                ),
                if (cartCount > 0)
                  Positioned(
                    top: -9,
                    right: -12,
                    child: Container(
                      constraints: const BoxConstraints(minWidth: 19),
                      height: 19,
                      padding: const EdgeInsets.symmetric(horizontal: 5),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE34D59),
                        border: Border.all(color: Colors.white, width: 2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        cartCount > 99 ? '99+' : '$cartCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          height: 1,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );

    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: colors.surface.withValues(alpha: .84),
            border: Border(
              top: BorderSide(
                color: colors.outlineVariant.withValues(alpha: .6),
              ),
            ),
          ),
          child: NavigationBar(
            height: 76,
            selectedIndex: selectedIndex,
            animationDuration: const Duration(milliseconds: 320),
            onDestinationSelected: onSelected,
            destinations: [
              NavigationDestination(
                icon: const Icon(Icons.storefront_outlined),
                selectedIcon: const Icon(Icons.storefront_rounded),
                label: shopLabel,
              ),
              NavigationDestination(
                icon: cartIcon(false),
                selectedIcon: cartIcon(true),
                label: cartLabel,
              ),
              NavigationDestination(
                icon: Icon(thirdIcon),
                selectedIcon: Icon(thirdSelectedIcon),
                label: thirdLabel,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
