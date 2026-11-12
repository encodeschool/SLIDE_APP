import 'dart:ui' show ImageFilter;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:slideforge_mobile/marketplace/bottom_navigation.dart';
import 'package:slideforge_mobile/marketplace/marketplace_demo_data.dart';
import 'package:slideforge_mobile/marketplace/slide_preview_carousel.dart';
import 'package:slideforge_mobile/presentations/presentation_repository.dart';

class MarketplaceScreen extends StatefulWidget {
  const MarketplaceScreen({
    super.key,
    required this.accessToken,
    required this.isRussian,
    required this.isUzbek,
    required this.presentationRepository,
    required this.cartItems,
    required this.onCartChanged,
    required this.onToggleLanguage,
    this.onRequireAuth,
    this.onStateChanged,
    this.showNavigation = true,
    this.initialSection = 0,
    this.initialCheckoutStep = 0,
    this.isRestoringSession = false,
    this.startupError,
  });

  final String? accessToken;
  final bool isRussian;
  final bool isUzbek;
  final PresentationRepository presentationRepository;
  final List<Map<String, dynamic>> cartItems;
  final ValueChanged<List<Map<String, dynamic>>> onCartChanged;
  final VoidCallback onToggleLanguage;
  final void Function(int section, int checkoutStep)? onRequireAuth;
  final void Function(int section, int checkoutStep)? onStateChanged;
  final bool showNavigation;
  final int initialSection;
  final int initialCheckoutStep;
  final bool isRestoringSession;
  final String? startupError;

  @override
  State<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends State<MarketplaceScreen> {
  late final Dio _dio;
  late final ScrollController _shopScrollController;
  List<Map<String, dynamic>> _items = [];
  List<Map<String, dynamic>> _categories = [];
  int _section = 0;
  int _checkoutStep = 0;
  int _page = 0;
  int _total = 0;
  String _category = '';
  String _search = '';
  String _sort = 'latest';
  int? _minPriceTiyin;
  int? _maxPriceTiyin;
  bool _showingPurchases = false;
  bool _loadingPurchases = false;
  List<Map<String, dynamic>> _purchases = [];
  String? _purchaseError;
  bool _loading = true;
  bool _loadingMore = false;
  bool _busy = false;
  bool _isDemoCatalog = true;
  String? _error;
  String? _categoryError;
  String? _notice;

  bool get _ru => widget.isRussian;
  bool get _uz => widget.isUzbek;
  List<Map<String, dynamic>> get _cart => widget.cartItems;
  String get _loadingText => _text(
    'Loading marketplace',
    'Загрузка маркетплейса',
    'Marketpleys yuklanmoqda',
  );

  String _text(String english, String russian, String uzbek) =>
      _uz
          ? uzbek
          : _ru
          ? russian
          : english;

  @override
  void initState() {
    super.initState();
    _shopScrollController =
        ScrollController()..addListener(_loadMoreWhenNearEnd);
    _section = widget.initialSection;
    _checkoutStep = widget.initialCheckoutStep;
    _items = getMarketplaceDemoProducts(_ru, _uz).take(10).toList();
    _total = marketplaceDemoExamples.length;
    _loading = false;
    _dio = Dio(
      BaseOptions(
        baseUrl: const String.fromEnvironment(
          'API_BASE_URL',
          defaultValue: 'http://10.0.2.2:8080',
        ),
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {'Authorization': 'Bearer ${widget.accessToken}'},
      ),
    );
    if (widget.accessToken == null) {
      _dio.options.headers.remove('Authorization');
    }
    _initialize();
  }

  @override
  void dispose() {
    _shopScrollController
      ..removeListener(_loadMoreWhenNearEnd)
      ..dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant MarketplaceScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialSection != widget.initialSection) {
      _section = widget.initialSection;
    }
    if (oldWidget.initialCheckoutStep != widget.initialCheckoutStep) {
      _checkoutStep = widget.initialCheckoutStep;
    }
  }

  Options? get _authOptions {
    final token = widget.accessToken;
    return token == null
        ? null
        : Options(headers: {'Authorization': 'Bearer $token'});
  }

  void _updateCart(List<Map<String, dynamic>> items) {
    widget.onCartChanged(items);
    if (items.isEmpty && _checkoutStep != 0) _setCheckoutStep(0);
  }

  void _addToCart(Map<String, dynamic> item) {
    if (_cart.any((entry) => entry['listingId'] == item['listingId'])) return;
    _updateCart([..._cart, item]);
    final message = _text(
      'Presentation added to your cart.',
      'Презентация добавлена в корзину.',
      'Taqdimot savatga qoʻshildi.',
    );
    setState(() {
      _notice = message;
    });
  }

  void _setSection(int section) {
    setState(() => _section = section);
    widget.onStateChanged?.call(_section, _checkoutStep);
  }

  void _setCheckoutStep(int step) {
    setState(() => _checkoutStep = step);
    widget.onStateChanged?.call(_section, _checkoutStep);
  }

  void _loadMoreWhenNearEnd() {
    if (!mounted ||
        _section != 0 ||
        !_shopScrollController.hasClients ||
        _loading ||
        _loadingMore ||
        _visibleItems.isEmpty ||
        _items.length >= _total) {
      return;
    }
    if (_shopScrollController.position.extentAfter <= 360) {
      _loadCatalog(append: true);
    }
  }

  Future<void> _initialize() async {
    if (const bool.fromEnvironment('MARKETPLACE_DEMO')) {
      _categories = marketplaceDemoCategories;
      _categoryError = null;
      await _loadDemoCatalog();
      return;
    }
    try {
      final categories = await _dio.get<List<dynamic>>(
        '/api/v1/catalog/categories',
      );
      final remoteCategories =
          (categories.data ?? [])
              .map((item) => Map<String, dynamic>.from(item as Map))
              .toList();
      if (mounted) {
        setState(() {
          _categories = remoteCategories;
          _categoryError = null;
          if (_category.isNotEmpty &&
              !_categories.any((item) => item['slug'] == _category)) {
            _category = '';
          }
        });
      }
    } catch (_) {
      if (mounted) {
        setState(
          () =>
              _categoryError = _text(
                'Could not load categories.',
                'Не удалось загрузить категории.',
                'Turkumlarni yuklab boʻlmadi.',
              ),
        );
      }
    }
    if (widget.accessToken != null && _categories.isNotEmpty) {
      try {
        final preference = await _dio.get<Map<String, dynamic>>(
          '/api/v1/catalog/preferences',
          options: _authOptions,
        );
        final preferredCategory =
            preference.data?['preferredCategory'] as String?;
        if (preferredCategory != null &&
            _categories.any((item) => item['slug'] == preferredCategory)) {
          _category = preferredCategory;
        }
      } catch (_) {
        // Preferences are optional; the public catalog remains usable.
      }
    }
    await _loadCatalog();
  }

  Future<void> _loadCatalog({bool append = false}) async {
    if (append && (_loadingMore || _items.length >= _total)) return;
    if (const bool.fromEnvironment('MARKETPLACE_DEMO') ||
        (append && _isDemoCatalog)) {
      await _loadDemoCatalog(append: append);
      return;
    }
    setState(() {
      if (append) {
        _loadingMore = true;
      } else {
        _loading = _items.isEmpty;
        _error = null;
      }
    });
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/catalog',
        queryParameters: {
          'page': append ? _page + 1 : 0,
          'size': 10,
          if (_category.isNotEmpty) 'category': _category,
          if (_minPriceTiyin != null) 'minPriceTiyin': _minPriceTiyin,
          if (_maxPriceTiyin != null) 'maxPriceTiyin': _maxPriceTiyin,
          'sort': _sort,
        },
      );
      final result = response.data!;
      final items =
          (result['items'] as List<dynamic>)
              .map((item) => Map<String, dynamic>.from(item as Map))
              .toList();
      if (!mounted) {
        return;
      }
      if (items.isEmpty && !append) {
        await _loadDemoCatalog();
        return;
      }
      setState(() {
        _isDemoCatalog = false;
        _items = append ? [..._items, ...items] : items;
        _page = result['page'] as int;
        _total = result['total'] as int;
        _notice = null;
      });
    } catch (_) {
      if (mounted) {
        setState(
          () =>
              _isDemoCatalog
                  ? _notice = _text(
                    'Showing sample presentations while the catalog is unavailable.',
                    'Каталог недоступен. Показаны примеры презентаций.',
                    'Katalog mavjud emas. Namunaviy taqdimotlar koʻrsatilmoqda.',
                  )
                  : _error = _text(
                    'Could not load catalog. Please try again.',
                    'Не удалось загрузить каталог. Попробуйте ещё раз.',
                    'Katalogni yuklab boʻlmadi. Qayta urinib koʻring.',
                  ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
          _loadingMore = false;
        });
      }
    }
  }

  Future<void> _loadDemoCatalog({bool append = false}) async {
    final filtered =
        getMarketplaceDemoProducts(_ru, _uz)
            .where(
              (item) =>
                  (_category.isEmpty || item['category'] == _category) &&
                  (_minPriceTiyin == null ||
                      (item['priceTiyin'] as num) >= _minPriceTiyin!) &&
                  (_maxPriceTiyin == null ||
                      (item['priceTiyin'] as num) <= _maxPriceTiyin!),
            )
            .toList();
    filtered.sort((left, right) {
      final priceOrder = (left['priceTiyin'] as num).compareTo(
        right['priceTiyin'] as num,
      );
      return switch (_sort) {
        'price_asc' => priceOrder,
        'price_desc' => -priceOrder,
        _ => (right['publishedAt'] as String).compareTo(
          left['publishedAt'] as String,
        ),
      };
    });
    final page = append ? _page + 1 : 0;
    final pageItems = filtered.skip(page * 10).take(10).toList();
    if (!mounted) return;
    setState(() {
      _isDemoCatalog = true;
      _items = append ? [..._items, ...pageItems] : pageItems;
      _page = page;
      _total = filtered.length;
      _loading = false;
      _loadingMore = false;
      _error = null;
    });
  }

  Future<void> _selectCategory(String? category) async {
    setState(() => _category = category ?? '');
    try {
      if (widget.accessToken == null) {
        await _loadCatalog();
        return;
      }
      await _dio.put<void>(
        '/api/v1/catalog/preferences',
        data: {'preferredCategory': _category.isEmpty ? null : _category},
        options: _authOptions,
      );
    } catch (_) {
      // Category filtering still works when preferences cannot be saved.
    }
    await _loadCatalog();
  }

  Future<void> _showFilters() async {
    final minimum = TextEditingController(
      text:
          _minPriceTiyin == null
              ? ''
              : (_minPriceTiyin! / 100).toStringAsFixed(0),
    );
    final maximum = TextEditingController(
      text:
          _maxPriceTiyin == null
              ? ''
              : (_maxPriceTiyin! / 100).toStringAsFixed(0),
    );
    final result = await showModalBottomSheet<Map<String, Object?>>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        var category = _category;
        var sort = _sort;
        var invalidRange = false;
        return StatefulBuilder(
          builder:
              (context, updateSheet) => SafeArea(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(
                    22,
                    8,
                    22,
                    MediaQuery.viewInsetsOf(context).bottom + 22,
                  ),
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _text('Filters', 'Фильтры', 'Filtrlar'),
                          style: Theme.of(context).textTheme.headlineSmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 18),
                        DropdownButtonFormField<String>(
                          key: ValueKey('filter-category-$category'),
                          initialValue: category,
                          decoration: InputDecoration(
                            labelText: _text('Category', 'Категория', 'Turkum'),
                          ),
                          items: [
                            DropdownMenuItem(
                              value: '',
                              child: Text(
                                _text(
                                  'All categories',
                                  'Все категории',
                                  'Barcha turkumlar',
                                ),
                              ),
                            ),
                            ..._categories.map(
                              (item) => DropdownMenuItem(
                                value: item['slug'] as String,
                                child: Text(
                                  _categoryLabel(item['slug'] as String),
                                ),
                              ),
                            ),
                          ],
                          onChanged:
                              (value) =>
                                  updateSheet(() => category = value ?? ''),
                        ),
                        const SizedBox(height: 14),
                        DropdownButtonFormField<String>(
                          key: ValueKey('filter-sort-$sort'),
                          initialValue: sort,
                          decoration: InputDecoration(
                            labelText: _text(
                              'Sort by',
                              'Сортировка',
                              'Saralash',
                            ),
                          ),
                          items: [
                            DropdownMenuItem(
                              value: 'latest',
                              child: Text(
                                _text(
                                  'Recently added',
                                  'Сначала новые',
                                  'Yangi',
                                ),
                              ),
                            ),
                            DropdownMenuItem(
                              value: 'price_asc',
                              child: Text(
                                _text(
                                  'Price: low to high',
                                  'Сначала дешевле',
                                  'Arzonidan',
                                ),
                              ),
                            ),
                            DropdownMenuItem(
                              value: 'price_desc',
                              child: Text(
                                _text(
                                  'Price: high to low',
                                  'Сначала дороже',
                                  'Qimmatidan',
                                ),
                              ),
                            ),
                          ],
                          onChanged:
                              (value) =>
                                  updateSheet(() => sort = value ?? 'latest'),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          _text(
                            'Price range · UZS',
                            'Цена · UZS',
                            'Narx · UZS',
                          ),
                          style: Theme.of(context).textTheme.labelLarge,
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: minimum,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                      decimal: true,
                                    ),
                                decoration: InputDecoration(
                                  labelText: _text('Minimum', 'От', 'Dan'),
                                ),
                                onChanged:
                                    (_) =>
                                        updateSheet(() => invalidRange = false),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextField(
                                controller: maximum,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                      decimal: true,
                                    ),
                                decoration: InputDecoration(
                                  labelText: _text('Maximum', 'До', 'Gacha'),
                                ),
                                onChanged:
                                    (_) =>
                                        updateSheet(() => invalidRange = false),
                              ),
                            ),
                          ],
                        ),
                        if (invalidRange)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              _text(
                                'Enter a valid price range.',
                                'Укажите корректный диапазон цены.',
                                'Toʻgʻri narx oraligʻini kiriting.',
                              ),
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                          ),
                        const SizedBox(height: 20),
                        Row(
                          children: [
                            TextButton(
                              onPressed: () {
                                minimum.clear();
                                maximum.clear();
                                updateSheet(() {
                                  category = '';
                                  sort = 'latest';
                                  invalidRange = false;
                                });
                              },
                              child: Text(
                                _text('Reset', 'Сбросить', 'Tozalash'),
                              ),
                            ),
                            const Spacer(),
                            FilledButton(
                              onPressed: () {
                                final minValue = _parsePrice(minimum.text);
                                final maxValue = _parsePrice(maximum.text);
                                if ((minimum.text.trim().isNotEmpty &&
                                        minValue == null) ||
                                    (maximum.text.trim().isNotEmpty &&
                                        maxValue == null) ||
                                    (minValue != null &&
                                        maxValue != null &&
                                        minValue > maxValue)) {
                                  updateSheet(() => invalidRange = true);
                                  return;
                                }
                                Navigator.pop(context, {
                                  'category': category,
                                  'sort': sort,
                                  'minPriceTiyin': minValue,
                                  'maxPriceTiyin': maxValue,
                                });
                              },
                              child: Text(
                                _text('Apply filters', 'Применить', 'Qoʻllash'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
        );
      },
    );
    minimum.dispose();
    maximum.dispose();
    if (result == null || !mounted) return;
    final category = result['category'] as String;
    final previousCategory = _category;
    setState(() {
      _sort = result['sort'] as String;
      _minPriceTiyin = result['minPriceTiyin'] as int?;
      _maxPriceTiyin = result['maxPriceTiyin'] as int?;
    });
    if (category != previousCategory) {
      await _selectCategory(category);
    } else {
      await _loadCatalog();
    }
  }

  int? _parsePrice(String value) {
    final parsed = num.tryParse(value.trim());
    if (parsed == null || parsed < 0 || !parsed.isFinite) return null;
    return (parsed * 100).round();
  }

  List<Map<String, dynamic>> get _visibleItems {
    final query = _search.toLowerCase();
    return _items
        .where(
          (item) =>
              '${item['title']} ${item['description']} ${item['sellerName']}'
                  .toLowerCase()
                  .contains(query),
        )
        .toList();
  }

  int get _activeFilterCount =>
      (_category.isNotEmpty ? 1 : 0) +
      (_minPriceTiyin != null ? 1 : 0) +
      (_maxPriceTiyin != null ? 1 : 0) +
      (_sort != 'latest' ? 1 : 0);

  String _price(Map<String, dynamic> item) {
    final price = (item['priceTiyin'] as num) / 100;
    return '${price.toStringAsFixed(0)} ${item['currency']}';
  }

  List<Map<String, dynamic>> _slidePreviews(Object? value) =>
      value is List
          ? value
              .whereType<Map>()
              .map((slide) => Map<String, dynamic>.from(slide))
              .toList()
          : const [];

  List<Map<String, dynamic>> _slidePreviewsFromDocument(
    Map<String, dynamic> document,
  ) {
    final slides = document['slides'];
    if (slides is! List) return const [];
    return List.generate(slides.length, (index) {
      final slide =
          slides[index] is Map
              ? Map<String, dynamic>.from(slides[index] as Map)
              : <String, dynamic>{};
      final elements = slide['elements'];
      final text =
          elements is List
              ? elements
                  .whereType<Map>()
                  .where((element) => element['type'] == 'text')
                  .map((element) => element['text'])
                  .whereType<String>()
                  .map((line) => line.trim())
                  .where((line) => line.isNotEmpty)
                  .toList()
              : <String>[];
      final title =
          slide['title'] is String &&
                  (slide['title'] as String).trim().isNotEmpty
              ? (slide['title'] as String).trim()
              : text.isNotEmpty
              ? text.removeAt(0)
              : _text(
                'Slide ${index + 1}',
                'Слайд ${index + 1}',
                'Slayd ${index + 1}',
              );
      return {
        'slideNumber': index + 1,
        'title': title,
        'text': text.take(3).toList(),
        'backgroundColor': slide['backgroundColor'],
        'accentColor': slide['accentColor'],
      };
    });
  }

  String _categoryLabel(String slug) {
    final matches = _categories.where((item) => item['slug'] == slug);
    final fallback =
        matches.isEmpty
            ? slug
            : (_uz ? matches.first['nameUz'] as String? : null) ??
                (_ru ? matches.first['nameRu'] as String? : null) ??
                matches.first['name'] as String;
    if (_uz || !_ru) return fallback;
    return const {
          'business': 'Бизнес',
          'education': 'Образование',
          'marketing': 'Маркетинг',
          'technology': 'Технологии',
          'other': 'Другое',
        }[slug] ??
        fallback;
  }

  IconData _categoryIcon(String slug) => switch (slug) {
    'business' => Icons.business_center_rounded,
    'education' => Icons.school_rounded,
    'marketing' => Icons.campaign_rounded,
    'technology' => Icons.devices_rounded,
    'other' => Icons.auto_awesome_mosaic_rounded,
    _ => Icons.category_rounded,
  };

  Widget _glassSurface({
    required Widget child,
    BorderRadius borderRadius = const BorderRadius.all(Radius.circular(24)),
    EdgeInsetsGeometry padding = const EdgeInsets.all(20),
  }) {
    return ClipRRect(
      borderRadius: borderRadius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: .64),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withValues(alpha: .76),
                const Color(0xFFEDE8FC).withValues(alpha: .44),
              ],
            ),
            borderRadius: borderRadius,
            border: Border.all(
              color: Colors.white.withValues(alpha: .92),
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF59419B).withValues(alpha: .08),
                blurRadius: 22,
                offset: const Offset(0, 9),
              ),
            ],
          ),
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }

  Future<void> _showDetails(Map<String, dynamic> item) async {
    final colors = Theme.of(context).colorScheme;
    try {
      final detail =
          (item['listingId'] as String).startsWith('demo-')
              ? getMarketplaceDemoProducts(
                _ru,
                _uz,
              ).firstWhere((entry) => entry['listingId'] == item['listingId'])
              : (await _dio.get<Map<String, dynamic>>(
                '/api/v1/catalog/${item['listingId']}',
              )).data!;
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        builder:
            (context) => FractionallySizedBox(
              heightFactor: .94,
              child: SafeArea(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            _text(
                              'Presentation preview',
                              'Предпросмотр презентации',
                              'Taqdimot koʻrinishi',
                            ),
                            style: Theme.of(context).textTheme.labelLarge,
                          ),
                        ),
                        IconButton(
                          tooltip: _text('Close', 'Закрыть', 'Yopish'),
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.close_rounded),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    SlidePreviewCarousel(
                      title: detail['title'] as String,
                      slides: _slidePreviews(detail['previewSlides']),
                      height: 190,
                    ),
                    const SizedBox(height: 24),
                    Text(
                      detail['title'] as String,
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      detail['description'] as String,
                      style: TextStyle(color: colors.onSurfaceVariant),
                    ),
                    const SizedBox(height: 18),
                    Card(
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: colors.secondaryContainer,
                          child: Icon(
                            Icons.storefront_rounded,
                            color: colors.onSecondaryContainer,
                          ),
                        ),
                        title: Text(_text('Seller', 'Продавец', 'Sotuvchi')),
                        subtitle: Text(
                          detail['sellerName'] as String? ??
                              _text('Independent creator', 'Автор', 'Muallif'),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _text('License', 'Лицензия', 'Litsenziya'),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 5),
                    Text(
                      detail['licenseTerms'] as String? ??
                          _text(
                            'License details are not available.',
                            'Условия лицензии недоступны.',
                            'Litsenziya shartlari mavjud emas.',
                          ),
                      style: TextStyle(color: colors.onSurfaceVariant),
                    ),
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            _price(detail),
                            style: Theme.of(context).textTheme.titleLarge
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                        ),
                        FilledButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            _addToCart({...item, ...detail});
                            _setSection(1);
                          },
                          icon: const Icon(Icons.add_shopping_cart_rounded),
                          label: Text(
                            _text(
                              'Add to cart',
                              'В корзину',
                              'Savatga qoʻshish',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
      );
    } catch (_) {
      if (mounted) {
        setState(
          () =>
              _error = _text(
                'Could not load listing details.',
                'Не удалось открыть объявление.',
                'Eʼlon maʼlumotlarini yuklab boʻlmadi.',
              ),
        );
      }
    }
  }

  Future<void> _checkout() async {
    if (widget.accessToken == null) {
      widget.onRequireAuth?.call(_section, _checkoutStep);
      return;
    }
    if (_cart.isEmpty) {
      return;
    }
    if (_cart.any(
      (item) => (item['listingId'] as String).startsWith('demo-'),
    )) {
      setState(
        () =>
            _notice =
                _uz
                    ? 'Namoyish rejimi: buyurtma va toʻlov yaratilmagan.'
                    : _ru
                    ? 'Демо: заказ и платёж не создавались.'
                    : 'Demo only: no order or payment was created.',
      );
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    final completed = <String>{};
    try {
      for (final item in _cart) {
        final key = 'mobile-${item['listingId']}-${item['listingVersionId']}';
        final orderResponse = await _dio.post<Map<String, dynamic>>(
          '/api/v1/orders',
          data: {'listingId': item['listingId'], 'idempotencyKey': key},
          options: _authOptions,
        );
        final order = orderResponse.data!;
        await _dio.post<void>(
          '/api/v1/orders/${order['id']}/sandbox-confirm',
          options: _authOptions,
        );
        completed.add(item['listingId'] as String);
      }
      if (mounted) {
        setState(() {
          _updateCart(
            _cart
                .where((item) => !completed.contains(item['listingId']))
                .toList(),
          );
          _notice = _text(
            'Sandbox checkout complete. Your purchase is ready.',
            'Оплата в песочнице завершена. Покупка доступна.',
            'Sinov toʻlovi yakunlandi. Xaridingiz tayyor.',
          );
          if (completed.isNotEmpty) {
            _section = 2;
            _showingPurchases = true;
          }
        });
        if (completed.isNotEmpty) {
          widget.onStateChanged?.call(_section, _checkoutStep);
        }
        if (completed.isNotEmpty) await _loadPurchases();
      }
    } on DioException catch (exception) {
      if (mounted) {
        final sandboxDisabled =
            exception.response?.statusCode == 503 ||
            exception.response?.statusCode == 404;
        setState(() {
          _updateCart(
            _cart
                .where((item) => !completed.contains(item['listingId']))
                .toList(),
          );
          _notice =
              sandboxDisabled
                  ? _text(
                    'Order created, but sandbox payment is disabled. It is only available in development.',
                    'Заказ создан, но песочница отключена. Она доступна только в режиме разработки.',
                    'Buyurtma yaratildi, ammo sinov toʻlovi oʻchiq. U faqat ishlab chiqish rejimida ishlaydi.',
                  )
                  : null;
          _error =
              sandboxDisabled
                  ? null
                  : _text(
                    'Could not complete checkout.',
                    'Не удалось оформить заказ.',
                    'Buyurtmani rasmiylashtirib boʻlmadi.',
                  );
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _publishListing() async {
    final accessToken = widget.accessToken;
    if (accessToken == null) {
      widget.onRequireAuth?.call(_section, _checkoutStep);
      return;
    }
    if (_busy) {
      return;
    }
    final presentations = await widget.presentationRepository.list(accessToken);
    if (!mounted) {
      return;
    }
    if (presentations.isEmpty) {
      setState(
        () =>
            _error = _text(
              'Create a presentation before publishing.',
              'Сначала создайте презентацию.',
              'Avval taqdimot yarating.',
            ),
      );
      return;
    }
    final description = TextEditingController();
    final terms = TextEditingController();
    final price = TextEditingController(text: '10000');
    String? selectedId = presentations.first.id;
    String selectedCategory =
        _categories.isEmpty ? '' : _categories.first['slug'] as String;
    await showDialog<void>(
      context: context,
      builder:
          (dialogContext) => StatefulBuilder(
            builder:
                (context, updateDialog) => AlertDialog(
                  title: Text(
                    _text(
                      'Sell a presentation',
                      'Продать презентацию',
                      'Taqdimot sotish',
                    ),
                  ),
                  content: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        DropdownButtonFormField<String>(
                          initialValue: selectedId,
                          decoration: InputDecoration(
                            labelText: _text(
                              'Presentation',
                              'Презентация',
                              'Taqdimot',
                            ),
                          ),
                          items:
                              presentations
                                  .map(
                                    (presentation) => DropdownMenuItem(
                                      value: presentation.id,
                                      child: Text(
                                        presentation.title,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  )
                                  .toList(),
                          onChanged:
                              (value) => updateDialog(() => selectedId = value),
                        ),
                        if (_categories.isEmpty)
                          Text(
                            _text(
                              'No active categories are available.',
                              'Нет активных категорий.',
                              'Faol turkumlar mavjud emas.',
                            ),
                          )
                        else
                          DropdownButtonFormField<String>(
                            initialValue: selectedCategory,
                            decoration: InputDecoration(
                              labelText: _text(
                                'Category',
                                'Категория',
                                'Turkum',
                              ),
                            ),
                            items:
                                _categories
                                    .map(
                                      (category) => DropdownMenuItem(
                                        value: category['slug'] as String,
                                        child: Text(
                                          _categoryLabel(
                                            category['slug'] as String,
                                          ),
                                        ),
                                      ),
                                    )
                                    .toList(),
                            onChanged:
                                (value) => updateDialog(
                                  () => selectedCategory = value ?? '',
                                ),
                          ),
                        TextField(
                          controller: price,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            labelText: _text(
                              'Price (UZS)',
                              'Цена (UZS)',
                              'Narxi (UZS)',
                            ),
                          ),
                        ),
                        TextField(
                          controller: description,
                          maxLines: 3,
                          decoration: InputDecoration(
                            labelText: _text(
                              'Description',
                              'Описание',
                              'Tavsif',
                            ),
                          ),
                        ),
                        TextField(
                          controller: terms,
                          maxLines: 3,
                          decoration: InputDecoration(
                            labelText: _text(
                              'License terms',
                              'Условия лицензии',
                              'Litsenziya shartlari',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(dialogContext),
                      child: Text(_text('Cancel', 'Отмена', 'Bekor qilish')),
                    ),
                    FilledButton(
                      onPressed:
                          _categories.isEmpty
                              ? null
                              : () async {
                                final amount = int.tryParse(price.text.trim());
                                if (selectedId == null ||
                                    !_categories.any(
                                      (category) =>
                                          category['slug'] == selectedCategory,
                                    ) ||
                                    amount == null ||
                                    amount < 1 ||
                                    description.text.trim().isEmpty ||
                                    terms.text.trim().isEmpty) {
                                  return;
                                }
                                Navigator.pop(dialogContext);
                                setState(() {
                                  _busy = true;
                                  _error = null;
                                });
                                try {
                                  final selected = presentations.firstWhere(
                                    (item) => item.id == selectedId,
                                  );
                                  final response = await _dio
                                      .post<Map<String, dynamic>>(
                                        '/api/v1/seller/listings',
                                        data: {
                                          'presentationId': selected.id,
                                          'presentationVersion':
                                              selected.currentVersion,
                                          'priceTiyin': amount * 100,
                                          'description':
                                              description.text.trim(),
                                          'licenseTerms': terms.text.trim(),
                                          'category': selectedCategory,
                                        },
                                        options: _authOptions,
                                      );
                                  await _dio.post<void>(
                                    '/api/v1/seller/listings/${response.data!['id']}/publish',
                                    options: _authOptions,
                                  );
                                  if (mounted) {
                                    setState(
                                      () =>
                                          _notice =
                                              _ru
                                                  ? 'Объявление опубликовано.'
                                                  : 'Listing published.',
                                    );
                                  }
                                  await _loadCatalog();
                                } catch (_) {
                                  if (mounted) {
                                    setState(
                                      () =>
                                          _error = _text(
                                            'Could not publish listing.',
                                            'Не удалось опубликовать объявление.',
                                            'Eʼlonni chop etib boʻlmadi.',
                                          ),
                                    );
                                  }
                                } finally {
                                  if (mounted) setState(() => _busy = false);
                                }
                              },
                      child: Text(
                        _text('Publish', 'Опубликовать', 'Chop etish'),
                      ),
                    ),
                  ],
                ),
          ),
    );
    if (mounted) {
      description.dispose();
      terms.dispose();
      price.dispose();
    }
  }

  Widget _shopContent(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return RefreshIndicator(
      onRefresh: () => _loadCatalog(),
      child: ListView(
        controller: _shopScrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
        children: [
          _glassSurface(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _text(
                          'Presentation marketplace',
                          'Маркетплейс презентаций',
                          'Taqdimotlar marketpleysi',
                        ),
                        style: Theme.of(
                          context,
                        ).textTheme.headlineSmall?.copyWith(
                          color: colors.onPrimaryContainer,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -.4,
                        ),
                      ),
                      const SizedBox(height: 7),
                      Text(
                        _text(
                          'A thoughtful start for your next big idea.',
                          'Вдохновение для вашей следующей идеи.',
                          'Keyingi gʻoyangiz uchun ilhom.',
                        ),
                        style: TextStyle(
                          color: colors.onPrimaryContainer.withValues(
                            alpha: .78,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  Icons.auto_awesome_rounded,
                  size: 38,
                  color: colors.primary,
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.search_rounded),
                    hintText: _text(
                      'Search presentations',
                      'Поиск презентаций',
                      'Taqdimotlarni qidirish',
                    ),
                    isDense: true,
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: .72),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(17),
                      borderSide: BorderSide(
                        color: Colors.white.withValues(alpha: .95),
                      ),
                    ),
                    suffixIcon:
                        _search.isEmpty
                            ? null
                            : IconButton(
                              tooltip: _text(
                                'Clear search',
                                'Очистить',
                                'Tozalash',
                              ),
                              onPressed: () => setState(() => _search = ''),
                              icon: const Icon(Icons.close_rounded),
                            ),
                  ),
                  onChanged: (value) => setState(() => _search = value),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filledTonal(
                tooltip: _text('Filters', 'Фильтры', 'Filtrlar'),
                onPressed: _showFilters,
                icon: Badge(
                  isLabelVisible: _activeFilterCount > 0,
                  label: Text('$_activeFilterCount'),
                  child: const Icon(Icons.tune_rounded),
                ),
              ),
            ],
          ),
          if (_categories.isNotEmpty) ...[
            const SizedBox(height: 17),
            Text(
              _text('Browse categories', 'Категории', 'Turkumlar'),
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w800,
                letterSpacing: -.15,
              ),
            ),
            const SizedBox(height: 9),
            SizedBox(
              height: 94,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _categoryTile(
                    slug: '',
                    label: _text('All', 'Все', 'Barchasi'),
                    icon: Icons.grid_view_rounded,
                    selected: _category.isEmpty,
                    onTap: () => _selectCategory(null),
                  ),
                  ..._categories.map((item) {
                    final slug = item['slug'] as String;
                    return _categoryTile(
                      slug: slug,
                      label: _categoryLabel(slug),
                      icon: _categoryIcon(slug),
                      selected: _category == slug,
                      onTap: () => _selectCategory(slug),
                    );
                  }),
                ],
              ),
            ),
          ],
          if (_category.isNotEmpty ||
              _sort != 'latest' ||
              _activeFilterCount > 0)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Wrap(
                spacing: 8,
                children: [
                  if (_category.isNotEmpty)
                    Chip(label: Text(_categoryLabel(_category))),
                  if (_sort != 'latest')
                    Chip(
                      label: Text(
                        _sort == 'price_asc'
                            ? _text(
                              'Price: low to high',
                              'Сначала дешевле',
                              'Arzonidan',
                            )
                            : _text(
                              'Price: high to low',
                              'Сначала дороже',
                              'Qimmatidan',
                            ),
                      ),
                    ),
                  if (_minPriceTiyin != null || _maxPriceTiyin != null)
                    Chip(
                      label: Text(
                        '${_minPriceTiyin == null ? '0' : (_minPriceTiyin! / 100).round()}–${_maxPriceTiyin == null ? '∞' : (_maxPriceTiyin! / 100).round()} UZS',
                      ),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 14),
          if (_isDemoCatalog)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: colors.primaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 9,
                  ),
                  child: Text(
                    _text(
                      'Demo catalog · sample presentations',
                      'Демо-каталог · примеры презентаций',
                      'Namoyish katalogi · namunaviy taqdimotlar',
                    ),
                    style: TextStyle(
                      color: colors.onPrimaryContainer,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
          if (_notice != null)
            Text(_notice!, style: TextStyle(color: colors.primary)),
          if (_categoryError != null)
            Text(_categoryError!, style: TextStyle(color: colors.error)),
          if (_error != null)
            Text(_error!, style: TextStyle(color: colors.error)),
          if (_loading)
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: 10,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                mainAxisExtent: 360,
              ),
              itemBuilder:
                  (context, index) => const Card(
                    child: Center(child: CircularProgressIndicator()),
                  ),
            )
          else if (_visibleItems.isEmpty)
            Padding(
              padding: const EdgeInsets.all(28),
              child: Center(
                child: Text(
                  _text(
                    'No published presentations yet.',
                    'Нет опубликованных презентаций.',
                    'Hozircha chop etilgan taqdimotlar yoʻq.',
                  ),
                ),
              ),
            )
          else ...[
            Padding(
              padding: const EdgeInsets.only(top: 4, bottom: 8),
              child: Text(
                _text(
                  'Popular presentations',
                  'Популярные презентации',
                  'Mashhur taqdimotlar',
                ),
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  letterSpacing: -.15,
                ),
              ),
            ),
            SizedBox(
              height: 306,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _visibleItems.length.clamp(0, 5),
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder:
                    (context, index) => SizedBox(
                      width: 218,
                      child: _productCard(
                        context,
                        _visibleItems[index],
                        colors,
                        keySuffix: 'featured',
                      ),
                    ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 20, bottom: 8),
              child: Text(
                _text('Explore all', 'Все презентации', 'Barcha taqdimotlar'),
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  letterSpacing: -.15,
                ),
              ),
            ),
            LayoutBuilder(
              builder: (context, constraints) {
                final tileWidth = (constraints.maxWidth - 12) / 2;
                final tileHeight = (tileWidth * 2.05).clamp(280.0, 360.0);
                return GridView.builder(
                  key: const ValueKey('market-product-grid'),
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _visibleItems.length,
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    mainAxisExtent: tileHeight,
                  ),
                  itemBuilder:
                      (context, index) =>
                          _productCard(context, _visibleItems[index], colors),
                );
              },
            ),
          ],
          if (!_loading && _items.length < _total)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: OutlinedButton(
                onPressed:
                    _loadingMore ? null : () => _loadCatalog(append: true),
                child: Text(
                  _loadingMore
                      ? _loadingText
                      : _text(
                        'Load 10 more',
                        'Загрузить ещё 10',
                        'Yana 10 tasini yuklash',
                      ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _categoryTile({
    required String slug,
    required String label,
    required IconData icon,
    required bool selected,
    required VoidCallback onTap,
  }) {
    final accent = Theme.of(context).colorScheme.primary;
    return Padding(
      padding: const EdgeInsets.only(right: 9, bottom: 3, top: 2),
      child: Semantics(
        button: true,
        selected: selected,
        label: label,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            key: ValueKey('market-category-${slug.isEmpty ? 'all' : slug}'),
            borderRadius: BorderRadius.circular(20),
            onTap: onTap,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  width: 88,
                  decoration: BoxDecoration(
                    color:
                        selected
                            ? const Color(0xFFEDE8FC).withValues(alpha: .88)
                            : Colors.white.withValues(alpha: .63),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color:
                          selected
                              ? accent.withValues(alpha: .28)
                              : Colors.white.withValues(alpha: .94),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: accent.withValues(alpha: selected ? .12 : .05),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        icon,
                        size: 23,
                        color: selected ? accent : const Color(0xFF777184),
                      ),
                      const SizedBox(height: 6),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 5),
                        child: Text(
                          label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 11,
                            height: 1.1,
                            fontWeight:
                                selected ? FontWeight.w700 : FontWeight.w600,
                            color:
                                selected
                                    ? const Color(0xFF382D63)
                                    : const Color(0xFF55515F),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _productCard(
    BuildContext context,
    Map<String, dynamic> item,
    ColorScheme colors, {
    String keySuffix = 'grid',
  }) {
    final category = item['category'] as String? ?? 'other';
    final cardColor = switch (category) {
      'business' => const Color(0xFFE2EBE6),
      'education' => const Color(0xFFE7E6F3),
      'marketing' => const Color(0xFFF4E8DE),
      'technology' => const Color(0xFFE0EDF1),
      _ => colors.surfaceContainerHighest,
    };
    final alreadyInCart = _cart.any(
      (entry) => entry['listingId'] == item['listingId'],
    );
    final previews = _slidePreviews(item['previewSlides']);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey(
          'market-product-${item['listingId']}${keySuffix == 'grid' ? '' : '-$keySuffix'}',
        ),
        onTap: () => _showDetails(item),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          color: cardColor,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        padding: const EdgeInsets.all(6),
                        child: SlidePreviewCarousel(
                          title: item['title'] as String,
                          slides: previews,
                          height: 84,
                          showSlideDetails: false,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _categoryLabel(category),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: colors.primary,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        item['title'] as String,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        item['description'] as String,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: colors.onSurfaceVariant,
                          fontSize: 10,
                          height: 1.2,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${_text('By', 'Автор', 'Sotuvchi')}: ${item['sellerName']}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: colors.onSurfaceVariant,
                          fontSize: 10,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _price(item),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: colors.primary,
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Tooltip(
                message:
                    alreadyInCart
                        ? _text('In cart', 'В корзине', 'Savatda')
                        : _text('Add to cart', 'В корзину', 'Savatga qoʻshish'),
                child: SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: alreadyInCart ? null : () => _addToCart(item),
                    icon: Icon(
                      alreadyInCart
                          ? Icons.check_rounded
                          : Icons.add_shopping_cart_rounded,
                      size: 17,
                    ),
                    label: Text(
                      alreadyInCart
                          ? _text('In cart', 'В корзине', 'Savatda')
                          : _text(
                            'Add to cart',
                            'В корзину',
                            'Savatga qoʻshish',
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(0, 36),
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      textStyle: const TextStyle(fontSize: 11),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _cartContent(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final total = _cart.fold<num>(
      0,
      (sum, item) => sum + ((item['priceTiyin'] as num?) ?? 0),
    );
    if (_cart.isEmpty) {
      return Center(
        child: Text(
          _text(
            'Your cart is empty.',
            'Корзина пока пуста.',
            'Savatingiz boʻsh.',
          ),
        ),
      );
    }
    return Column(
      key: const ValueKey('market-cart'),
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 12),
            children: [
              Text(
                _checkoutStep == 0
                    ? _text('Your cart', 'Ваша корзина', 'Savatingiz')
                    : _checkoutStep == 1
                    ? _text(
                      'Checkout',
                      'Оформление заказа',
                      'Buyurtmani rasmiylashtirish',
                    )
                    : _text('Payment', 'Оплата', 'Toʻlov'),
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 14),
              _checkoutProgress(colors),
              const SizedBox(height: 14),
              if (_checkoutStep == 0) ...[
                ..._cart.map(
                  (item) => Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SlidePreviewCarousel(
                            title: item['title'] as String,
                            slides: _slidePreviews(item['previewSlides']),
                            height: 128,
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item['title'] as String,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    Text(
                                      '${item['sellerName']} · ${_price(item)}',
                                      style: TextStyle(
                                        color: colors.onSurfaceVariant,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                tooltip: _text(
                                  'Remove ${item['title']} from cart',
                                  'Удалить «${item['title']}» из корзины',
                                  '${item['title']} savatdan oʻchirilsin',
                                ),
                                onPressed:
                                    () => _updateCart(
                                      _cart
                                          .where(
                                            (entry) =>
                                                entry['listingId'] !=
                                                item['listingId'],
                                          )
                                          .toList(),
                                    ),
                                icon: const Icon(Icons.close_rounded),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                _totalRow(colors, total),
              ] else if (_checkoutStep == 1) ...[
                SlidePreviewCarousel(
                  title: _cart.first['title'] as String,
                  slides: _slidePreviews(_cart.first['previewSlides']),
                  height: 150,
                ),
                const SizedBox(height: 14),
                ..._cart.map(
                  (item) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(item['title'] as String),
                    subtitle: Text(
                      '${_text('Seller', 'Продавец', 'Sotuvchi')}: ${item['sellerName']}',
                    ),
                    trailing: Text(_price(item)),
                  ),
                ),
                const Divider(),
                _totalRow(colors, total),
                const SizedBox(height: 16),
                Text(
                  _text(
                    'Your order will use current catalog prices.',
                    'Заказ будет создан по актуальным ценам каталога.',
                    'Buyurtma katalogdagi joriy narxlarda yaratiladi.',
                  ),
                  style: TextStyle(color: colors.onSurfaceVariant),
                ),
              ] else ...[
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.shield_outlined),
                    title: Text(
                      _text(
                        'Sandbox payment',
                        'Песочница оплаты',
                        'Sinov toʻlovi',
                      ),
                    ),
                    subtitle: Text(
                      _text(
                        'Available only when the operator enables development sandbox mode.',
                        'Доступна только если оператор включил режим разработки.',
                        'Faqat operator sinov rejimini yoqqanida ishlaydi.',
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  _text(
                    'Live payment methods are not connected yet.',
                    'Онлайн-оплата пока не подключена.',
                    'Onlayn toʻlov usullari hali ulanmagan.',
                  ),
                  style: TextStyle(color: colors.onSurfaceVariant),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    for (final provider in const [
                      'Click',
                      'Payme',
                      'Uzum',
                      'Uzcard',
                      'Humo',
                      'Visa',
                      'Mastercard',
                    ])
                      Chip(
                        label: Text(provider),
                        avatar: const Icon(
                          Icons.lock_outline_rounded,
                          size: 15,
                        ),
                        visualDensity: VisualDensity.compact,
                      ),
                  ],
                ),
                if (_cart.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  SlidePreviewCarousel(
                    title: _cart.first['title'] as String,
                    slides: _slidePreviews(_cart.first['previewSlides']),
                    height: 128,
                  ),
                ],
                const SizedBox(height: 12),
                _totalRow(colors, total),
              ],
              if (_notice != null) ...[
                const SizedBox(height: 14),
                Text(_notice!, style: TextStyle(color: colors.primary)),
              ],
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: TextStyle(color: colors.error)),
              ],
            ],
          ),
        ),
        _checkoutActions(colors),
      ],
    );
  }

  Widget _checkoutProgress(ColorScheme colors) {
    final labels = [
      _text('Cart', 'Корзина', 'Savat'),
      _text('Checkout', 'Оформление', 'Rasmiylashtirish'),
      _text('Payment', 'Оплата', 'Toʻlov'),
    ];
    return Row(
      children: [
        for (var index = 0; index < labels.length; index++) ...[
          if (index > 0)
            Expanded(
              child: Container(
                height: 2,
                color:
                    index <= _checkoutStep
                        ? colors.primary
                        : colors.outlineVariant,
              ),
            ),
          InkWell(
            onTap:
                index <= _checkoutStep ? () => _setCheckoutStep(index) : null,
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 13,
                    backgroundColor:
                        index <= _checkoutStep
                            ? colors.primary
                            : colors.surfaceContainerHighest,
                    child: Text(
                      '${index + 1}',
                      style: TextStyle(
                        color:
                            index <= _checkoutStep
                                ? colors.onPrimary
                                : colors.onSurfaceVariant,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    labels[index],
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _checkoutActions(ColorScheme colors) {
    final buttons = <Widget>[];
    if (_checkoutStep == 0) {
      buttons.add(
        FilledButton(
          onPressed: () => _setCheckoutStep(1),
          child: Text(
            _text(
              'Continue to checkout',
              'Перейти к оформлению',
              'Rasmiylashtirishga oʻtish',
            ),
          ),
        ),
      );
    } else if (_checkoutStep == 1) {
      buttons.addAll([
        FilledButton(
          onPressed: () => _setCheckoutStep(2),
          child: Text(
            _text('Continue to payment', 'Перейти к оплате', 'Toʻlovga oʻtish'),
          ),
        ),
        TextButton(
          onPressed: () => _setCheckoutStep(0),
          child: Text(
            _text('Back to cart', 'Назад в корзину', 'Savatga qaytish'),
          ),
        ),
      ]);
    } else {
      buttons.addAll([
        FilledButton(
          onPressed: _busy ? null : _checkout,
          child:
              _busy
                  ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                  : Text(
                    widget.accessToken == null
                        ? _text(
                          'Sign in to continue',
                          'Войти для продолжения',
                          'Davom etish uchun kiring',
                        )
                        : _text(
                          'Try sandbox checkout',
                          'Попробовать оплату в песочнице',
                          'Sinov toʻlovini sinab koʻrish',
                        ),
                  ),
        ),
        TextButton(
          onPressed: () => _setCheckoutStep(1),
          child: Text(
            _text(
              'Back to checkout',
              'Назад к оформлению',
              'Rasmiylashtirishga qaytish',
            ),
          ),
        ),
      ]);
    }

    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 8),
        decoration: BoxDecoration(
          color: colors.surface,
          border: Border(top: BorderSide(color: colors.outlineVariant)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children:
              buttons
                  .map(
                    (button) => SizedBox(width: double.infinity, child: button),
                  )
                  .toList(),
        ),
      ),
    );
  }

  Widget _totalRow(ColorScheme colors, num totalTiyin) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          _text('Total', 'Итого', 'Jami'),
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        Text(
          '${(totalTiyin / 100).toStringAsFixed(0)} UZS',
          style: TextStyle(color: colors.primary, fontWeight: FontWeight.w800),
        ),
      ],
    );
  }

  Future<void> _loadPurchases() async {
    final token = widget.accessToken;
    if (token == null) return;
    setState(() {
      _loadingPurchases = true;
      _purchaseError = null;
    });
    try {
      final response = await _dio.get<List<dynamic>>(
        '/api/v1/purchases',
        options: _authOptions,
      );
      final items =
          (response.data ?? [])
              .map((item) => Map<String, dynamic>.from(item as Map))
              .toList();
      if (mounted) setState(() => _purchases = items);
    } on DioException {
      if (mounted) {
        setState(
          () =>
              _purchaseError = _text(
                'Could not load your purchases. Try again.',
                'Не удалось загрузить покупки. Попробуйте ещё раз.',
                'Xaridlarni yuklab boʻlmadi. Qayta urinib koʻring.',
              ),
        );
      }
    } finally {
      if (mounted) setState(() => _loadingPurchases = false);
    }
  }

  Future<void> _openPurchase(Map<String, dynamic> purchase) async {
    final entitlementId = purchase['entitlementId'] as String?;
    if (entitlementId == null) return;
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/purchases/$entitlementId/content',
        options: _authOptions,
      );
      final data = response.data!;
      final document = data['document'] as Map<String, dynamic>;
      final previews = _slidePreviewsFromDocument(document);
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        builder:
            (context) => FractionallySizedBox(
              heightFactor: .94,
              child: SafeArea(
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    Text(
                      data['title'] as String,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 18),
                    SlidePreviewCarousel(
                      title: data['title'] as String,
                      slides: previews,
                      height: 210,
                    ),
                    const SizedBox(height: 18),
                    Text(
                      _text(
                        'Purchased and ready to use',
                        'Покупка доступна',
                        'Xarid foydalanishga tayyor',
                      ),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
      );
    } on DioException {
      if (mounted) {
        setState(
          () =>
              _purchaseError = _text(
                'Could not open this purchase.',
                'Не удалось открыть покупку.',
                'Xaridni ochib boʻlmadi.',
              ),
        );
      }
    }
  }

  Future<void> _showPurchases() async {
    setState(() => _showingPurchases = true);
    await _loadPurchases();
  }

  Widget _accountContent(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final signedIn = widget.accessToken != null;
    if (_showingPurchases) {
      return ListView(
        key: const ValueKey('market-purchases'),
        padding: const EdgeInsets.all(20),
        children: [
          Row(
            children: [
              IconButton(
                tooltip: _text('Back to account', 'Назад', 'Orqaga'),
                onPressed: () => setState(() => _showingPurchases = false),
                icon: const Icon(Icons.arrow_back_rounded),
              ),
              Expanded(
                child: Text(
                  _text('My purchases', 'Мои покупки', 'Xaridlarim'),
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              IconButton(
                tooltip: _text('Refresh', 'Обновить', 'Yangilash'),
                onPressed: _loadingPurchases ? null : _loadPurchases,
                icon: const Icon(Icons.refresh_rounded),
              ),
            ],
          ),
          if (_purchaseError != null)
            Text(_purchaseError!, style: TextStyle(color: colors.error)),
          if (_loadingPurchases)
            const Padding(
              padding: EdgeInsets.all(28),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_purchases.isEmpty && _purchaseError == null)
            Padding(
              padding: const EdgeInsets.only(top: 28),
              child: Text(
                _text(
                  'Your completed purchases will appear here.',
                  'Здесь появятся ваши покупки.',
                  'Yakunlangan xaridlaringiz shu yerda koʻrinadi.',
                ),
                textAlign: TextAlign.center,
                style: TextStyle(color: colors.onSurfaceVariant),
              ),
            )
          else
            ..._purchases.map(
              (purchase) => Card(
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () => _openPurchase(purchase),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SlidePreviewCarousel(
                          title: purchase['title'] as String,
                          slides: _slidePreviews(purchase['previewSlides']),
                          height: 128,
                        ),
                        const SizedBox(height: 10),
                        Text(
                          purchase['title'] as String,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${_text('By', 'Автор', 'Sotuvchi')}: ${purchase['sellerName']} · ${_price(purchase)}',
                          style: TextStyle(color: colors.onSurfaceVariant),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _text(
                            'Open presentation',
                            'Открыть презентацию',
                            'Taqdimotni ochish',
                          ),
                          style: TextStyle(
                            color: colors.primary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      );
    }
    return ListView(
      key: const ValueKey('market-account'),
      padding: const EdgeInsets.all(20),
      children: [
        Text(
          _text('Your account', 'Аккаунт', 'Hisobingiz'),
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        Text(
          signedIn
              ? _text(
                'You are signed in to Slideforge.',
                'Вы вошли в Slideforge.',
                'Slideforge tizimiga kirdingiz.',
              )
              : _text(
                'Sign in to buy or sell presentations.',
                'Войдите, чтобы покупать или продавать презентации.',
                'Taqdimotlarni sotib olish yoki sotish uchun tizimga kiring.',
              ),
          style: TextStyle(color: colors.onSurfaceVariant),
        ),
        const SizedBox(height: 18),
        if (!signedIn)
          FilledButton.icon(
            onPressed: () => widget.onRequireAuth?.call(_section, 0),
            icon: const Icon(Icons.login_rounded),
            label: Text(
              _text(
                'Sign in or create an account',
                'Войти или зарегистрироваться',
                'Kiring yoki hisob yarating',
              ),
            ),
          )
        else ...[
          FilledButton.tonalIcon(
            onPressed: _showPurchases,
            icon: const Icon(Icons.shopping_bag_outlined),
            label: Text(_text('My purchases', 'Мои покупки', 'Xaridlarim')),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _busy ? null : _publishListing,
            icon: const Icon(Icons.storefront_outlined),
            label: Text(
              _text(
                'Sell a presentation',
                'Продать презентацию',
                'Taqdimot sotish',
              ),
            ),
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final baseTheme = Theme.of(context);
    final marketplaceColors = baseTheme.colorScheme.copyWith(
      primary: const Color(0xFF7354D6),
      onPrimary: Colors.white,
      primaryContainer: const Color(0xFFEDE8FC),
      onPrimaryContainer: const Color(0xFF382D63),
      secondary: const Color(0xFF927BE0),
      secondaryContainer: const Color(0xFFF0ECFC),
      surface: Colors.white,
      surfaceContainerHighest: const Color(0xFFF1EFF7),
      outline: const Color(0xFFE4E0ED),
    );
    final marketplaceTheme = baseTheme.copyWith(
      colorScheme: marketplaceColors,
      scaffoldBackgroundColor: const Color(0xFFF8F7FC),
      cardTheme: baseTheme.cardTheme.copyWith(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFFECE9F2)),
        ),
      ),
      appBarTheme: baseTheme.appBarTheme.copyWith(
        backgroundColor: const Color(0xFFF8F7FC),
        surfaceTintColor: Colors.transparent,
      ),
      inputDecorationTheme: baseTheme.inputDecorationTheme.copyWith(
        filled: true,
        fillColor: Colors.white,
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFE8E4F0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF7354D6), width: 1.5),
        ),
      ),
      textTheme: baseTheme.textTheme.apply(
        bodyColor: const Color(0xFF282538),
        displayColor: const Color(0xFF282538),
      ),
    );
    return Theme(
      data: marketplaceTheme,
      child: Builder(
        builder: (context) {
          final content = switch (_section) {
            1 => _cartContent(context),
            2 => _accountContent(context),
            _ => _shopContent(context),
          };
          final animatedContent = AnimatedSwitcher(
            duration: const Duration(milliseconds: 260),
            reverseDuration: const Duration(milliseconds: 180),
            transitionBuilder:
                (child, animation) => FadeTransition(
                  opacity: animation,
                  child: SlideTransition(
                    position: Tween<Offset>(
                      begin: const Offset(0.035, 0),
                      end: Offset.zero,
                    ).animate(
                      CurvedAnimation(
                        parent: animation,
                        curve: Curves.easeOutCubic,
                      ),
                    ),
                    child: child,
                  ),
                ),
            child: KeyedSubtree(key: ValueKey(_section), child: content),
          );
          if (!widget.showNavigation) return animatedContent;
          return Scaffold(
            appBar: AppBar(
              title: const Text(
                'slideforge',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
              actions: [
                IconButton(
                  tooltip: _text(
                    'Switch language',
                    'Сменить язык',
                    'Tilni almashtirish',
                  ),
                  onPressed: widget.onToggleLanguage,
                  icon: const Icon(Icons.language_rounded),
                ),
              ],
            ),
            body: Column(
              children: [
                if (widget.isRestoringSession)
                  const LinearProgressIndicator(minHeight: 2),
                if (widget.startupError != null)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                    color: Theme.of(context).colorScheme.errorContainer,
                    child: Text(
                      widget.startupError!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onErrorContainer,
                      ),
                    ),
                  ),
                Expanded(child: animatedContent),
              ],
            ),
            bottomNavigationBar: SlideforgeBottomNavigationBar(
              selectedIndex: _section,
              cartCount: _cart.length,
              shopLabel: _text('Shop', 'Магазин', 'Doʻkon'),
              cartLabel: _text('Cart', 'Корзина', 'Savat'),
              thirdLabel: _text('Account', 'Аккаунт', 'Hisob'),
              thirdIcon: Icons.account_circle_outlined,
              thirdSelectedIcon: Icons.account_circle_rounded,
              onSelected: (index) {
                if (index == 1 && _cart.isEmpty) _setCheckoutStep(0);
                _setSection(index);
              },
            ),
          );
        },
      ),
    );
  }
}
