import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

class SlideforgeNavigationItem {
  const SlideforgeNavigationItem({
    required this.label,
    required this.icon,
    required this.selectedIcon,
    this.badgeCount = 0,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final int badgeCount;
}

class SlideforgeBottomNavigationBar extends StatelessWidget {
  const SlideforgeBottomNavigationBar({
    super.key,
    required this.selectedIndex,
    required this.items,
    required this.onSelected,
  });

  final int selectedIndex;
  final List<SlideforgeNavigationItem> items;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return SafeArea(
      top: false,
      minimum: const EdgeInsets.fromLTRB(12, 0, 12, 10),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
          child: Container(
            constraints: const BoxConstraints(minHeight: 72),
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: const Color(0xDFF9FCF9),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xE8FFFFFF)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1F1B2B21),
                  blurRadius: 28,
                  offset: Offset(0, 10),
                ),
                BoxShadow(
                  color: Color(0xBFFFFFFF),
                  blurRadius: 1,
                  offset: Offset(0, -1),
                ),
              ],
            ),
            child: Row(
              children: [
                for (var index = 0; index < items.length; index++)
                  Expanded(
                    child: _NavigationDestination(
                      item: items[index],
                      selected: index == selectedIndex,
                      selectedColor: colors.primary,
                      onTap: () => onSelected(index),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NavigationDestination extends StatelessWidget {
  const _NavigationDestination({
    required this.item,
    required this.selected,
    required this.selectedColor,
    required this.onTap,
  });

  final SlideforgeNavigationItem item;
  final bool selected;
  final Color selectedColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final foreground = selected ? selectedColor : const Color(0xFF657168);
    return Semantics(
      button: true,
      selected: selected,
      label: item.label,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOutCubic,
            constraints: const BoxConstraints(minHeight: 56),
            decoration: BoxDecoration(
              color:
                  selected
                      ? selectedColor.withValues(alpha: .10)
                      : Colors.transparent,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color:
                    selected
                        ? selectedColor.withValues(alpha: .12)
                        : Colors.transparent,
              ),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Icon(
                      selected ? item.selectedIcon : item.icon,
                      size: 20,
                      color: foreground,
                    ),
                    if (item.badgeCount > 0)
                      Positioned(
                        right: -9,
                        top: -6,
                        child: Container(
                          constraints: const BoxConstraints(
                            minWidth: 16,
                            minHeight: 16,
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          decoration: BoxDecoration(
                            color: selectedColor,
                            borderRadius: BorderRadius.circular(99),
                            border: Border.all(
                              color: const Color(0xFFF9FCF9),
                              width: 1.5,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            item.badgeCount > 99 ? '99+' : '${item.badgeCount}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 8,
                              height: 1,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  item.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: foreground,
                    fontSize: 9,
                    height: 1.1,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
