import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:slideforge_mobile/marketplace/marketplace_demo_data.dart';
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
  List<Map<String, dynamic>> _items = [];
  List<Map<String, dynamic>> _categories = [];
  int _section = 0;
  int _checkoutStep = 0;
  int _page = 0;
  int _total = 0;
  String _category = '';
  String _search = '';
  bool _loading = true;
  bool _loadingMore = false;
  bool _busy = false;
  bool _isDemoCatalog = true;
  String? _error;
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
    _section = widget.initialSection;
    _checkoutStep = widget.initialCheckoutStep;
    _categories = marketplaceDemoCategories;
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
  }

  Future<void> _initialize() async {
    if (const bool.fromEnvironment('MARKETPLACE_DEMO')) {
      _categories = marketplaceDemoCategories;
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
      if (remoteCategories.isNotEmpty) _categories = remoteCategories;
      if (widget.accessToken != null) {
        final preference = await _dio.get<Map<String, dynamic>>(
          '/api/v1/catalog/preferences',
          options: _authOptions,
        );
        _category = preference.data?['preferredCategory'] as String? ?? '';
      }
    } catch (_) {
      // Preferences are optional; the public catalog remains usable.
    }
    await _loadCatalog();
  }

  Future<void> _loadCatalog({bool append = false}) async {
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
            .where((item) => _category.isEmpty || item['category'] == _category)
            .toList();
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

  String _price(Map<String, dynamic> item) {
    final price = (item['priceTiyin'] as num) / 100;
    return '${price.toStringAsFixed(0)} ${item['currency']}';
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

  Future<void> _showDetails(Map<String, dynamic> item) async {
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
            (context) => SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(22),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      detail['title'] as String,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 10),
                    Text(detail['description'] as String),
                    const SizedBox(height: 12),
                    Text(
                      '${_text('Seller', 'Продавец', 'Sotuvchi')}: ${detail['sellerName']}',
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${_text('License terms', 'Лицензия', 'Litsenziya shartlari')}: ${detail['licenseTerms']}',
                    ),
                    const SizedBox(height: 14),
                    Text(
                      _price(detail),
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 14),
                    FilledButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        setState(() {
                          if (!_cart.any(
                            (entry) => entry['listingId'] == item['listingId'],
                          )) {
                            _updateCart([..._cart, item]);
                          }
                          _section = 1;
                        });
                      },
                      icon: const Icon(Icons.add_shopping_cart),
                      label: Text(
                        _text('Add to cart', 'В корзину', 'Savatga qoʻshish'),
                      ),
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
          _notice =
              _ru
                  ? 'Оплата в песочнице завершена.'
                  : 'Sandbox checkout complete.';
        });
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
    String selectedCategory = 'other';
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
                        DropdownButtonFormField<String>(
                          initialValue: selectedCategory,
                          decoration: InputDecoration(
                            labelText: _text('Category', 'Категория', 'Turkum'),
                          ),
                          items:
                              (_categories.isEmpty
                                      ? [
                                        {'slug': 'other', 'name': 'Other'},
                                      ]
                                      : _categories)
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
                                () => selectedCategory = value ?? 'other',
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
                      onPressed: () async {
                        final amount = int.tryParse(price.text.trim());
                        if (selectedId == null ||
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
                                  'description': description.text.trim(),
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
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
        children: [
          Text(
            _text(
              'Presentation marketplace',
              'Маркетплейс презентаций',
              'Taqdimotlar marketpleysi',
            ),
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 5),
          Text(
            _text(
              'Discover and sell editable presentations.',
              'Покупайте и продавайте редактируемые презентации.',
              'Tahrirlanadigan taqdimotlarni xarid qiling va soting.',
            ),
            style: TextStyle(color: colors.onSurfaceVariant),
          ),
          const SizedBox(height: 14),
          TextField(
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.search),
              hintText: _text('Search presentations', 'Поиск', 'Qidirish'),
              border: const OutlineInputBorder(),
              isDense: true,
            ),
            onChanged: (value) => setState(() => _search = value),
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            key: ValueKey(_category),
            initialValue: _category,
            decoration: InputDecoration(
              labelText: _text('Category', 'Категория', 'Turkum'),
              border: const OutlineInputBorder(),
              isDense: true,
            ),
            items: [
              DropdownMenuItem(
                value: '',
                child: Text(
                  _text('All categories', 'Все категории', 'Barcha turkumlar'),
                ),
              ),
              ..._categories.map(
                (category) => DropdownMenuItem(
                  value: category['slug'] as String,
                  child: Text(_categoryLabel(category['slug'] as String)),
                ),
              ),
            ],
            onChanged: (value) => _selectCategory(value),
          ),
          const SizedBox(height: 12),
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
                mainAxisExtent: 270,
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
          else
            GridView.builder(
              key: const ValueKey('market-product-grid'),
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _visibleItems.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                mainAxisExtent: 270,
              ),
              itemBuilder:
                  (context, index) =>
                      _productCard(context, _visibleItems[index], colors),
            ),
          if (!_loading && _items.length < _total)
            OutlinedButton(
              onPressed: _loadingMore ? null : () => _loadCatalog(append: true),
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
        ],
      ),
    );
  }

  Widget _productCard(
    BuildContext context,
    Map<String, dynamic> item,
    ColorScheme colors,
  ) {
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
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 58,
              width: double.infinity,
              decoration: BoxDecoration(
                color: cardColor,
                borderRadius: BorderRadius.circular(9),
              ),
              child: Icon(
                Icons.slideshow_rounded,
                size: 30,
                color: colors.primary,
              ),
            ),
            const SizedBox(height: 7),
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
            const SizedBox(height: 3),
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
            const SizedBox(height: 3),
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
            const Spacer(),
            Text(
              '${_text('By', 'Автор', 'Sotuvchi')}: ${item['sellerName']}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: colors.onSurfaceVariant, fontSize: 10),
            ),
            const SizedBox(height: 2),
            Text(
              _price(item),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: colors.primary,
                fontSize: 14,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 2),
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: () => _showDetails(item),
                    style: TextButton.styleFrom(
                      minimumSize: const Size(0, 34),
                      padding: EdgeInsets.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(
                      _text('Details', 'Подробнее', 'Batafsil'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11),
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                IconButton.filledTonal(
                  tooltip:
                      alreadyInCart
                          ? _text('In cart', 'В корзине', 'Savatda')
                          : _text(
                            'Add to cart',
                            'В корзину',
                            'Savatga qoʻshish',
                          ),
                  visualDensity: VisualDensity.compact,
                  onPressed:
                      alreadyInCart
                          ? null
                          : () => _updateCart([..._cart, item]),
                  icon: Icon(
                    alreadyInCart
                        ? Icons.check_rounded
                        : Icons.add_shopping_cart_rounded,
                    size: 18,
                  ),
                ),
              ],
            ),
          ],
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
    return ListView(
      key: const ValueKey('market-cart'),
      padding: const EdgeInsets.all(20),
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
        if (_checkoutStep == 0) ...[
          ..._cart.map(
            (item) => Card(
              child: ListTile(
                title: Text(item['title'] as String),
                subtitle: Text('${item['sellerName']} · ${_price(item)}'),
                trailing: IconButton(
                  tooltip: _text('Remove', 'Удалить', 'Oʻchirish'),
                  onPressed:
                      () => _updateCart(
                        _cart
                            .where(
                              (entry) =>
                                  entry['listingId'] != item['listingId'],
                            )
                            .toList(),
                      ),
                  icon: const Icon(Icons.close_rounded),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          _totalRow(colors, total),
          const SizedBox(height: 18),
          FilledButton(
            onPressed: () => setState(() => _checkoutStep = 1),
            child: Text(
              _text(
                'Continue to checkout',
                'Перейти к оформлению',
                'Rasmiylashtirishga oʻtish',
              ),
            ),
          ),
        ] else if (_checkoutStep == 1) ...[
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
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () => setState(() => _checkoutStep = 2),
            child: Text(
              _text(
                'Continue to payment',
                'Перейти к оплате',
                'Toʻlovga oʻtish',
              ),
            ),
          ),
          TextButton(
            onPressed: () => setState(() => _checkoutStep = 0),
            child: Text(
              _text('Back to cart', 'Назад в корзину', 'Savatga qaytish'),
            ),
          ),
        ] else ...[
          Card(
            child: ListTile(
              leading: const Icon(Icons.shield_outlined),
              title: Text(
                _text('Sandbox payment', 'Песочница оплаты', 'Sinov toʻlovi'),
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
          _totalRow(colors, total),
          const SizedBox(height: 18),
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
                            'Pay for order',
                            'Оплатить заказ',
                            'Buyurtma uchun toʻlash',
                          ),
                    ),
          ),
          TextButton(
            onPressed: () => setState(() => _checkoutStep = 1),
            child: Text(
              _text(
                'Back to checkout',
                'Назад к оформлению',
                'Rasmiylashtirishga qaytish',
              ),
            ),
          ),
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

  Widget _accountContent(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final signedIn = widget.accessToken != null;
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
        else
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
    );
  }

  @override
  Widget build(BuildContext context) {
    final destinations = [
      NavigationDestination(
        icon: const Icon(Icons.storefront_outlined),
        selectedIcon: const Icon(Icons.storefront_rounded),
        label: _text('Shop', 'Магазин', 'Doʻkon'),
      ),
      NavigationDestination(
        icon: Badge(
          isLabelVisible: _cart.isNotEmpty,
          label: Text('${_cart.length}'),
          child: const Icon(Icons.shopping_bag_outlined),
        ),
        selectedIcon: const Icon(Icons.shopping_bag_rounded),
        label: _text('Cart', 'Корзина', 'Savat'),
      ),
      NavigationDestination(
        icon: const Icon(Icons.account_circle_outlined),
        selectedIcon: const Icon(Icons.account_circle_rounded),
        label: _text('Account', 'Аккаунт', 'Hisob'),
      ),
    ];
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
                CurvedAnimation(parent: animation, curve: Curves.easeOutCubic),
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
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
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
      bottomNavigationBar: NavigationBar(
        selectedIndex: _section,
        animationDuration: const Duration(milliseconds: 320),
        onDestinationSelected:
            (index) => setState(() {
              _section = index;
              if (index == 1 && _cart.isEmpty) _checkoutStep = 0;
            }),
        destinations: destinations,
      ),
    );
  }
}
