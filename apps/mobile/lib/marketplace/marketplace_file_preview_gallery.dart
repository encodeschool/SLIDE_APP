import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:slideforge_mobile/i18n/mobile_localizations.dart';

class MarketplaceFilePreview {
  const MarketplaceFilePreview({required this.totalPages, required this.pages});

  factory MarketplaceFilePreview.fromJson(Map<String, dynamic> json) {
    final total = json['totalPages'];
    final rawPages = json['pages'];
    if (total is! num || rawPages is! List) {
      throw const FormatException('Marketplace preview response is invalid.');
    }

    final pages = rawPages
        .take(2)
        .map((rawPage) {
          if (rawPage is! Map) {
            throw const FormatException('Marketplace preview page is invalid.');
          }
          final pageNumber = rawPage['pageNumber'];
          final imageDataUrl = rawPage['imageDataUrl'];
          if (pageNumber is! num || imageDataUrl is! String) {
            throw const FormatException('Marketplace preview page is invalid.');
          }
          const prefix = 'data:image/png;base64,';
          if (imageDataUrl.length > 7000000 ||
              !RegExp(
                r'^data:image/png;base64,[A-Za-z0-9+/]+=*$',
              ).hasMatch(imageDataUrl)) {
            throw const FormatException(
              'Marketplace preview image is invalid.',
            );
          }
          return MarketplaceFilePreviewPage(
            pageNumber: pageNumber.toInt(),
            imageBytes: base64Decode(imageDataUrl.substring(prefix.length)),
          );
        })
        .toList(growable: false);

    return MarketplaceFilePreview(totalPages: total.toInt(), pages: pages);
  }

  final int totalPages;
  final List<MarketplaceFilePreviewPage> pages;

  int get lockedPageCount =>
      (totalPages - pages.length).clamp(0, 100000).toInt();
}

class MarketplaceFilePreviewPage {
  const MarketplaceFilePreviewPage({
    required this.pageNumber,
    required this.imageBytes,
  });

  final int pageNumber;
  final Uint8List imageBytes;
}

class MarketplaceFilePreviewGallery extends StatefulWidget {
  const MarketplaceFilePreviewGallery({
    super.key,
    required this.preview,
    required this.localizations,
  });

  final MarketplaceFilePreview preview;
  final MobileLocalizations localizations;

  @override
  State<MarketplaceFilePreviewGallery> createState() =>
      _MarketplaceFilePreviewGalleryState();
}

class _MarketplaceFilePreviewGalleryState
    extends State<MarketplaceFilePreviewGallery> {
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
    final pages = widget.preview.pages;
    if (pages.isEmpty) {
      return Text(
        widget.localizations.text(
          'No page previews are available.',
          'Предпросмотр страниц недоступен.',
          'Sahifalar koʻrinishi mavjud emas.',
        ),
      );
    }

    final strings = widget.localizations;
    return Column(
      children: [
        SizedBox(
          height: 300,
          child: PageView.builder(
            controller: _controller,
            itemCount: pages.length,
            onPageChanged: (index) => setState(() => _index = index),
            itemBuilder: (context, index) {
              final page = pages[index];
              return Semantics(
                label: strings.text(
                  'Preview page ${page.pageNumber}',
                  'Предпросмотр страницы ${page.pageNumber}',
                  '${page.pageNumber}-sahifa koʻrinishi',
                ),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: Theme.of(context).colorScheme.outlineVariant,
                    ),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: InteractiveViewer(
                    minScale: 1,
                    maxScale: 4,
                    child: Image.memory(
                      page.imageBytes,
                      fit: BoxFit.contain,
                      gaplessPlayback: true,
                      errorBuilder:
                          (context, error, stackTrace) => Center(
                            child: Text(
                              strings.text(
                                'This page preview could not be displayed.',
                                'Не удалось показать предпросмотр страницы.',
                                'Sahifa koʻrinishini ochib boʻlmadi.',
                              ),
                            ),
                          ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 8),
        Text(
          strings.text(
            'Page ${pages[_index].pageNumber} of ${widget.preview.totalPages}',
            'Страница ${pages[_index].pageNumber} из ${widget.preview.totalPages}',
            '${widget.preview.totalPages} sahifadan ${pages[_index].pageNumber}-sahifa',
          ),
          style: Theme.of(context).textTheme.labelMedium,
        ),
        if (pages.length > 1)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              pages.length,
              (index) => AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: index == _index ? 18 : 6,
                height: 6,
                margin: const EdgeInsets.symmetric(horizontal: 3, vertical: 8),
                decoration: BoxDecoration(
                  color:
                      index == _index
                          ? Theme.of(context).colorScheme.primary
                          : Theme.of(context).colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
