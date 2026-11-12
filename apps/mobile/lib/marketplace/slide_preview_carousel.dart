import 'package:flutter/material.dart';

class SlidePreviewCarousel extends StatefulWidget {
  const SlidePreviewCarousel({
    super.key,
    required this.title,
    required this.slides,
    this.height = 190,
    this.showSlideDetails = true,
  });

  final String title;
  final List<Map<String, dynamic>> slides;
  final double height;
  final bool showSlideDetails;

  @override
  State<SlidePreviewCarousel> createState() => _SlidePreviewCarouselState();
}

class _SlidePreviewCarouselState extends State<SlidePreviewCarousel> {
  late final PageController _controller;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _controller = PageController();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final slides =
        widget.slides.isEmpty
            ? [
              {
                'slideNumber': 1,
                'title': widget.title,
                'text': const <String>[],
              },
            ]
            : widget.slides;
    final current = slides[_index.clamp(0, slides.length - 1)];
    final slideTitle =
        _string(current['title']).isEmpty
            ? widget.title
            : _string(current['title']);
    final slideText = _strings(current['text']);
    final compact = widget.height < 170;
    final previewOnly = widget.height < 120;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height: widget.height,
          child: PageView.builder(
            controller: _controller,
            itemCount: slides.length,
            onPageChanged: (index) => setState(() => _index = index),
            itemBuilder: (context, index) {
              final slide = slides[index];
              final accent =
                  _parseColor(slide['accentColor']) ?? colors.primary;
              final background =
                  _parseColor(slide['backgroundColor']) ??
                  colors.surfaceContainerHighest;
              final title =
                  _string(slide['title']).isEmpty
                      ? widget.title
                      : _string(slide['title']);
              final text = _strings(slide['text']);
              return Semantics(
                label:
                    'Slide ${_slideNumber(slide, index + 1)} of ${slides.length}: $title',
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  padding: EdgeInsets.all(
                    previewOnly
                        ? 10
                        : compact
                        ? 14
                        : 22,
                  ),
                  decoration: BoxDecoration(
                    color: background,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: accent.withValues(alpha: .16)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (!previewOnly)
                        Container(
                          width: 30,
                          height: 4,
                          decoration: BoxDecoration(
                            color: accent,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      SizedBox(
                        height:
                            previewOnly
                                ? 4
                                : compact
                                ? 10
                                : 15,
                      ),
                      Text(
                        title,
                        maxLines: previewOnly ? 1 : 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: colors.onSurface,
                          fontSize:
                              previewOnly
                                  ? 14
                                  : compact
                                  ? 17
                                  : 21,
                          height: 1.15,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -.4,
                        ),
                      ),
                      if (text.isNotEmpty && !previewOnly) ...[
                        SizedBox(height: compact ? 7 : 9),
                        Text(
                          text.first,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: colors.onSurfaceVariant,
                            fontSize: compact ? 12 : null,
                            height: compact ? 1.2 : 1.35,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        if (slides.length > 1) ...[
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              slides.length,
              (index) => AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: index == _index ? 18 : 6,
                height: 6,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(
                  color:
                      index == _index
                          ? colors.primary
                          : colors.onSurfaceVariant.withValues(alpha: .25),
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
        ],
        if (widget.showSlideDetails) ...[
          const SizedBox(height: 12),
          Text(
            slideTitle,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          if (slideText.isNotEmpty) ...[
            const SizedBox(height: 5),
            ...slideText
                .take(3)
                .map(
                  (line) => Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 7, right: 8),
                          child: Icon(
                            Icons.circle,
                            size: 5,
                            color: colors.primary,
                          ),
                        ),
                        Expanded(
                          child: Text(
                            line,
                            style: TextStyle(color: colors.onSurfaceVariant),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
          ],
        ],
      ],
    );
  }

  static int _slideNumber(Map<String, dynamic> slide, int fallback) =>
      slide['slideNumber'] is num
          ? (slide['slideNumber'] as num).toInt()
          : fallback;

  static String _string(Object? value) => value is String ? value.trim() : '';

  static List<String> _strings(Object? value) =>
      value is List
          ? value
              .whereType<String>()
              .map((line) => line.trim())
              .where((line) => line.isNotEmpty)
              .toList()
          : const [];

  static Color? _parseColor(Object? value) {
    if (value is! String || !value.startsWith('#')) return null;
    final hex = value.substring(1);
    if (hex.length != 6) return null;
    final parsed = int.tryParse(hex, radix: 16);
    return parsed == null ? null : Color(0xFF000000 | parsed);
  }
}
