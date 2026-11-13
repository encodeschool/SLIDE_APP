import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:slideforge_mobile/artifacts/artifact_library_screen.dart';
import 'package:slideforge_mobile/artifacts/artifact_repository.dart';
import 'package:slideforge_mobile/creation/work_creator_screen.dart';
import 'package:slideforge_mobile/marketplace/bottom_navigation.dart';
import 'package:slideforge_mobile/marketplace/marketplace_screen.dart';
import 'package:slideforge_mobile/auth/auth_repository.dart';
import 'package:slideforge_mobile/presentations/presentation_editor_screen.dart';
import 'package:slideforge_mobile/presentations/presentation_repository.dart';

class WorkspaceScreen extends StatefulWidget {
  const WorkspaceScreen({
    super.key,
    required this.user,
    required this.accessToken,
    required this.isRussian,
    required this.isUzbek,
    required this.onSignOut,
    required this.onToggleLanguage,
    required this.cartItems,
    required this.onCartChanged,
    this.initialTab = 0,
    this.initialMarketplaceSection = 0,
    this.initialCheckoutStep = 0,
    this.onTabChanged,
    this.onMarketplaceStateChanged,
    this.presentationRepository,
    this.artifactRepository,
    this.error,
  });

  final AuthUser user;
  final String accessToken;
  final bool isRussian;
  final bool isUzbek;
  final String? error;
  final VoidCallback onSignOut;
  final VoidCallback onToggleLanguage;
  final List<Map<String, dynamic>> cartItems;
  final ValueChanged<List<Map<String, dynamic>>> onCartChanged;
  final int initialTab;
  final int initialMarketplaceSection;
  final int initialCheckoutStep;
  final ValueChanged<int>? onTabChanged;
  final void Function(int section, int checkoutStep)? onMarketplaceStateChanged;
  final PresentationRepository? presentationRepository;
  final ArtifactRepository? artifactRepository;

  @override
  State<WorkspaceScreen> createState() => _WorkspaceScreenState();
}

class _WorkspaceScreenState extends State<WorkspaceScreen> {
  late final PresentationRepository _repository;
  late final ArtifactRepository _artifactRepository;
  late final Dio _walletDio;
  List<PresentationSummary> _presentations = [];
  Map<String, dynamic>? _wallet;
  List<Map<String, dynamic>> _walletTransactions = [];
  bool _isLoading = true;
  bool _isCreating = false;
  bool _walletLoading = false;
  bool _topUpBusy = false;
  String? _walletError;
  late int _selectedTab;
  late int _marketplaceSection;
  String? _openingId;
  String? _error;

  void _selectTab(int tab) {
    final selectedTab = tab.clamp(0, 3).toInt();
    setState(() {
      _selectedTab = selectedTab;
      if (selectedTab == 1) {
        if (_marketplaceSection == 2) _marketplaceSection = 0;
      } else if (selectedTab == 2) {
        _marketplaceSection = 2;
      } else {
        _marketplaceSection = 0;
      }
    });
    widget.onTabChanged?.call(selectedTab);
    if (selectedTab == 1 || selectedTab == 2) {
      widget.onMarketplaceStateChanged?.call(
        _marketplaceSection,
        widget.initialCheckoutStep,
      );
    }
    if (selectedTab == 3 && _wallet == null && !_walletLoading) {
      _loadWallet();
    }
  }

  void _onMarketplaceStateChanged(int section, int checkoutStep) {
    _marketplaceSection = section;
    final tab = section == 2 ? 2 : 1;
    if (_selectedTab != tab) setState(() => _selectedTab = tab);
    widget.onMarketplaceStateChanged?.call(section, checkoutStep);
  }

  bool get _ru => widget.isRussian;
  bool get _uz => widget.isUzbek;
  String _text(String english, String russian, String uzbek) =>
      _uz
          ? uzbek
          : _ru
          ? russian
          : english;
  String get _presentationsTitle =>
      _text('My presentations', 'Мои презентации', 'Taqdimotlarim');
  String get _newTitle =>
      _text('Untitled presentation', 'Новая презентация', 'Nomsiz taqdimot');

  @override
  void initState() {
    super.initState();
    _selectedTab = widget.initialTab;
    _marketplaceSection = widget.initialMarketplaceSection;
    _repository =
        widget.presentationRepository ??
        ApiPresentationRepository(
          baseUrl: const String.fromEnvironment(
            'API_BASE_URL',
            defaultValue: 'http://10.0.2.2:8080',
          ),
        );
    _artifactRepository =
        widget.artifactRepository ??
        ApiArtifactRepository(
          baseUrl: const String.fromEnvironment(
            'API_BASE_URL',
            defaultValue: 'http://10.0.2.2:8080',
          ),
        );
    _walletDio = Dio(
      BaseOptions(
        baseUrl: const String.fromEnvironment(
          'API_BASE_URL',
          defaultValue: 'http://10.0.2.2:8080',
        ),
        connectTimeout: const Duration(seconds: 5),
        receiveTimeout: const Duration(seconds: 5),
        headers: {'Authorization': 'Bearer ${widget.accessToken}'},
      ),
    );
    _loadPresentations();
    if (_selectedTab == 3) _loadWallet();
  }

  Future<void> _loadPresentations() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final presentations = await _repository.list(widget.accessToken);
      if (mounted) setState(() => _presentations = presentations);
    } catch (_) {
      if (mounted) {
        setState(
          () =>
              _error = _text(
                'Could not load presentations.',
                'Не удалось загрузить презентации.',
                'Taqdimotlarni yuklab boʻlmadi.',
              ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _createPresentation() async {
    setState(() {
      _isCreating = true;
      _error = null;
    });
    try {
      final detail = await _repository.create(
        widget.accessToken,
        _newTitle,
        _uz
            ? 'uz'
            : _ru
            ? 'ru'
            : 'en',
      );
      if (!mounted) return;
      setState(() {
        _presentations = [
          detail,
          ..._presentations.where((item) => item.id != detail.id),
        ];
      });
      await _openEditor(detail.id, alreadyLoaded: detail);
    } catch (_) {
      if (mounted) {
        setState(
          () =>
              _error = _text(
                'Could not create the presentation. Please try again.',
                'Не удалось создать презентацию. Попробуйте ещё раз.',
                'Taqdimotni yaratib boʻlmadi. Qayta urinib koʻring.',
              ),
        );
      }
    } finally {
      if (mounted) setState(() => _isCreating = false);
    }
  }

  Future<void> _openArtifactLibrary() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder:
            (_) => ArtifactLibraryScreen(
              accessToken: widget.accessToken,
              language:
                  _uz
                      ? 'uz'
                      : _ru
                      ? 'ru'
                      : 'en',
              repository: _artifactRepository,
            ),
      ),
    );
  }

  Future<void> _openWorkCreator() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder:
            (_) => WorkCreatorScreen(
              accessToken: widget.accessToken,
              language:
                  _uz
                      ? 'uz'
                      : _ru
                      ? 'ru'
                      : 'en',
              isRussian: _ru,
              isUzbek: _uz,
              presentationRepository: _repository,
              artifactRepository: _artifactRepository,
            ),
      ),
    );
    if (created == true && mounted) await _loadPresentations();
  }

  Future<void> _openEditor(
    String id, {
    PresentationDetail? alreadyLoaded,
  }) async {
    setState(() {
      _openingId = id;
      _error = null;
    });
    try {
      final detail =
          alreadyLoaded ?? await _repository.read(widget.accessToken, id);
      if (!mounted) return;
      await Navigator.of(context).push<void>(
        MaterialPageRoute<void>(
          builder:
              (_) => PresentationEditorScreen(
                detail: detail,
                accessToken: widget.accessToken,
                isRussian: _ru,
                isUzbek: _uz,
                repository: _repository,
              ),
        ),
      );
      if (mounted) await _loadPresentations();
    } catch (_) {
      if (mounted) {
        setState(
          () =>
              _error = _text(
                'Could not open the presentation.',
                'Не удалось открыть презентацию.',
                'Taqdimotni ochib boʻlmadi.',
              ),
        );
      }
    } finally {
      if (mounted) setState(() => _openingId = null);
    }
  }

  Future<void> _loadWallet() async {
    setState(() {
      _walletLoading = true;
      _walletError = null;
    });
    try {
      final walletRequest = _walletDio.get<Map<String, dynamic>>(
        '/api/v1/wallet',
      );
      final transactionsRequest = _walletDio.get<List<dynamic>>(
        '/api/v1/wallet/transactions',
      );
      final walletResponse = await walletRequest;
      final transactionsResponse = await transactionsRequest;
      if (!mounted) return;
      setState(() {
        _wallet = walletResponse.data;
        _walletTransactions =
            (transactionsResponse.data ?? const [])
                .whereType<Map>()
                .map((transaction) => Map<String, dynamic>.from(transaction))
                .toList();
      });
    } on DioException {
      if (mounted) {
        setState(() {
          _walletError = _text(
            'Could not load balance and billing activity. Try again.',
            'Не удалось загрузить баланс и историю операций. Повторите попытку.',
            'Balans va toʻlovlar tarixini yuklab boʻlmadi. Qayta urinib koʻring.',
          );
        });
      }
    } finally {
      if (mounted) setState(() => _walletLoading = false);
    }
  }

  Future<void> _showTopUp() async {
    if (_wallet == null) {
      await _loadWallet();
    }
    if (!mounted || _wallet == null) return;
    var method = 'CLICK';
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder:
          (context) => StatefulBuilder(
            builder:
                (context, updateSheet) => SafeArea(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(
                      20,
                      4,
                      20,
                      MediaQuery.viewInsetsOf(context).bottom + 20,
                    ),
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            _text(
                              'Add balance',
                              'Пополнить баланс',
                              'Balansni toʻldirish',
                            ),
                            style: Theme.of(context).textTheme.headlineSmall
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 7),
                          Text(
                            _text(
                              'Choose a package for your Slideforge account.',
                              'Выберите пакет для аккаунта Slideforge.',
                              'Slideforge hisobingiz uchun paketni tanlang.',
                            ),
                            style: TextStyle(
                              color:
                                  Theme.of(
                                    context,
                                  ).colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF5EFE5),
                              borderRadius: BorderRadius.circular(13),
                            ),
                            child: Text(
                              _text(
                                'Sandbox top-ups are simulated; no real payment is collected.',
                                'Тестовое пополнение симулируется; реальная оплата не списывается.',
                                'Sinov balans toʻldirish simulyatsiya qilinadi, haqiqiy pul olinmaydi.',
                              ),
                              style: const TextStyle(
                                fontSize: 11,
                                height: 1.45,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<String>(
                            initialValue: method,
                            decoration: InputDecoration(
                              labelText: _text(
                                'Sandbox payment method',
                                'Тестовый способ оплаты',
                                'Sinov toʻlov usuli',
                              ),
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: 'CLICK',
                                child: Text('Click'),
                              ),
                              DropdownMenuItem(
                                value: 'PAYME',
                                child: Text('Payme'),
                              ),
                              DropdownMenuItem(
                                value: 'UZUM',
                                child: Text('Uzum'),
                              ),
                              DropdownMenuItem(
                                value: 'VISA',
                                child: Text('Visa'),
                              ),
                              DropdownMenuItem(
                                value: 'MASTERCARD',
                                child: Text('Mastercard'),
                              ),
                              DropdownMenuItem(
                                value: 'HUMO',
                                child: Text('Humo'),
                              ),
                              DropdownMenuItem(
                                value: 'UZCARD',
                                child: Text('Uzcard'),
                              ),
                            ],
                            onChanged:
                                (value) =>
                                    updateSheet(() => method = value ?? method),
                          ),
                          const SizedBox(height: 14),
                          for (final item
                              in (_wallet?['packages'] as List? ?? const []))
                            if (item is Map)
                              Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              item['code'] == 'VALUE'
                                                  ? _text(
                                                    'Best value',
                                                    'Выгодный',
                                                    'Tejamkor',
                                                  )
                                                  : _text(
                                                    'Starter',
                                                    'Стартовый',
                                                    'Boshlangʻich',
                                                  ),
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              '${((item['amountTiyin'] as num?) ?? 0) ~/ 100} UZS · '
                                              '${item['workUnits']} ${_text('works', 'работ', 'ta ish')}',
                                            ),
                                          ],
                                        ),
                                      ),
                                      FilledButton(
                                        onPressed:
                                            _wallet?['sandboxEnabled'] ==
                                                        true &&
                                                    !_topUpBusy
                                                ? () async {
                                                  final code =
                                                      item['code'] as String?;
                                                  if (code == null) return;
                                                  updateSheet(() {});
                                                  final success = await _topUp(
                                                    code,
                                                    method,
                                                  );
                                                  if (success &&
                                                      context.mounted) {
                                                    Navigator.pop(context);
                                                  } else {
                                                    updateSheet(() {});
                                                  }
                                                }
                                                : null,
                                        child:
                                            _topUpBusy
                                                ? const SizedBox(
                                                  width: 18,
                                                  height: 18,
                                                  child:
                                                      CircularProgressIndicator(
                                                        strokeWidth: 2,
                                                      ),
                                                )
                                                : Text(
                                                  _text(
                                                    'Add',
                                                    'Пополнить',
                                                    'Toʻldirish',
                                                  ),
                                                ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          if (_walletError != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                _walletError!,
                                style: TextStyle(
                                  color: Theme.of(context).colorScheme.error,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          if (_wallet?['sandboxEnabled'] != true)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                _text(
                                  'Top-ups are not enabled for this environment.',
                                  'Пополнение отключено в этой среде.',
                                  'Bu muhitda balans toʻldirish yoqilmagan.',
                                ),
                                style: TextStyle(
                                  color: Theme.of(context).colorScheme.error,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
          ),
    );
  }

  Future<bool> _topUp(String packageCode, String method) async {
    setState(() {
      _topUpBusy = true;
      _walletError = null;
    });
    try {
      final random = Random.secure();
      final nonce =
          List.generate(16, (_) => random.nextInt(16).toRadixString(16)).join();
      await _walletDio.post<Map<String, dynamic>>(
        '/api/v1/wallet/topups',
        data: {
          'packageCode': packageCode,
          'paymentMethod': method,
          'idempotencyKey': 'mobile-$nonce',
        },
      );
      await _loadWallet();
      return true;
    } on DioException {
      if (mounted) {
        setState(() {
          _walletError = _text(
            'Could not top up the balance. Please try again.',
            'Не удалось пополнить баланс. Попробуйте ещё раз.',
            'Balansni toʻldirib boʻlmadi. Qayta urinib koʻring.',
          );
        });
      }
      return false;
    } finally {
      if (mounted) setState(() => _topUpBusy = false);
    }
  }

  String _money(Object? amount) {
    final tiyin = amount is num ? amount.toInt() : 0;
    return '${(tiyin / 100).round()} UZS';
  }

  Widget _accountContent(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return ListView(
      key: const ValueKey('account-home'),
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 30),
      children: [
        Text(
          _text('Your account', 'Ваш аккаунт', 'Hisobingiz'),
          style: Theme.of(
            context,
          ).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 6),
        Text(
          _text(
            'Manage your profile, balance and billing activity.',
            'Управляйте профилем, балансом и историей операций.',
            'Profil, balans va toʻlovlar tarixini boshqaring.',
          ),
          style: TextStyle(color: colors.onSurfaceVariant),
        ),
        const SizedBox(height: 18),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 25,
                  backgroundColor: colors.primaryContainer,
                  child: Text(
                    widget.user.displayName.isEmpty
                        ? '?'
                        : widget.user.displayName.characters.first
                            .toUpperCase(),
                    style: TextStyle(
                      color: colors.primary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const SizedBox(width: 13),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.user.displayName,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        widget.user.email,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: colors.onSurfaceVariant,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.verified_user_outlined, color: colors.primary),
              ],
            ),
          ),
        ),
        const SizedBox(height: 18),
        Row(
          children: [
            Expanded(
              child: Text(
                _text(
                  'Billing and balance',
                  'Баланс и платежи',
                  'Balans va toʻlovlar',
                ),
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
            ),
            IconButton(
              tooltip: _text('Refresh', 'Обновить', 'Yangilash'),
              onPressed: _walletLoading ? null : _loadWallet,
              icon: const Icon(Icons.refresh_rounded),
            ),
          ],
        ),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _text('Current balance', 'Текущий баланс', 'Joriy balans'),
                  style: TextStyle(
                    color: colors.onSurfaceVariant,
                    fontSize: 11,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  _wallet == null
                      ? _walletLoading
                          ? '…'
                          : '—'
                      : _money(_wallet?['balanceTiyin']),
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: colors.primary,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (_wallet != null)
                  Text(
                    '${_wallet?['workCredits'] ?? 0} ${_text('work credits', 'работ', 'ta ish')}',
                    style: TextStyle(
                      color: colors.onSurfaceVariant,
                      fontSize: 11,
                    ),
                  ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed:
                        _walletLoading && _wallet == null ? null : _showTopUp,
                    icon: const Icon(Icons.add_rounded),
                    label: Text(
                      _text(
                        'Top up balance',
                        'Пополнить баланс',
                        'Balansni toʻldirish',
                      ),
                    ),
                  ),
                ),
                if (_wallet?['sandboxEnabled'] == true)
                  Padding(
                    padding: const EdgeInsets.only(top: 9),
                    child: Text(
                      _text(
                        'Sandbox top-ups are simulated; no real payment is collected.',
                        'Тестовое пополнение симулируется; реальная оплата не списывается.',
                        'Sinov toʻldirishi simulyatsiya qilinadi, haqiqiy toʻlov olinmaydi.',
                      ),
                      style: TextStyle(
                        color: colors.onSurfaceVariant,
                        fontSize: 10,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        if (_walletError != null) ...[
          const SizedBox(height: 8),
          Text(
            _walletError!,
            style: TextStyle(color: colors.error, fontSize: 12),
          ),
        ],
        const SizedBox(height: 16),
        Text(
          _text('Billing activity', 'История операций', 'Toʻlovlar tarixi'),
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        if (_walletTransactions.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                _walletLoading
                    ? _text(
                      'Loading activity…',
                      'Загрузка операций…',
                      'Amaliyotlar yuklanmoqda…',
                    )
                    : _text(
                      'No transactions yet.',
                      'Операций пока нет.',
                      'Hozircha amaliyotlar yoʻq.',
                    ),
                style: TextStyle(color: colors.onSurfaceVariant),
              ),
            ),
          )
        else
          for (final transaction in _walletTransactions.take(8))
            Card(
              child: ListTile(
                leading: Icon(
                  (transaction['amountTiyin'] as num? ?? 0) < 0
                      ? Icons.arrow_upward_rounded
                      : Icons.arrow_downward_rounded,
                  color: colors.primary,
                ),
                title: Text(
                  transaction['type'] == 'TOP_UP'
                      ? _text(
                        'Wallet top-up',
                        'Пополнение кошелька',
                        'Hamyonni toʻldirish',
                      )
                      : transaction['type'] == 'MARKETPLACE_PURCHASE'
                      ? _text(
                        'Marketplace purchase',
                        'Покупка на маркетплейсе',
                        'Marketpleys xaridi',
                      )
                      : _text('AI work', 'Работа с ИИ', 'AI ishi'),
                ),
                subtitle: Text(
                  '${transaction['status'] ?? ''}${transaction['sandbox'] == true ? ' · sandbox' : ''}',
                ),
                trailing: Text(
                  _money((transaction['amountTiyin'] as num? ?? 0).abs()),
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
        const SizedBox(height: 16),
        Card(
          color: colors.surfaceContainerLow,
          child: ListTile(
            leading: Icon(Icons.shield_outlined, color: colors.primary),
            title: Text(
              _text(
                'Seller payouts',
                'Выплаты продавцам',
                'Sotuvchi toʻlovlari',
              ),
            ),
            subtitle: Text(
              _text(
                'Secure payouts are not configured yet. We never collect card numbers or security codes.',
                'Безопасные выплаты пока не настроены. Мы не собираем номера карт и коды безопасности.',
                'Xavfsiz sotuvchi toʻlovlari hali sozlanmagan. Karta raqami yoki xavfsizlik kodi yigʻilmaydi.',
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: widget.onSignOut,
          icon: const Icon(Icons.logout_rounded),
          label: Text(_text('Sign out', 'Выйти', 'Chiqish')),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: colors.primary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.layers_rounded,
                color: Colors.white,
                size: 20,
              ),
            ),
            const SizedBox(width: 9),
            const Flexible(
              child: Text(
                'slideforge',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: _text('Refresh', 'Обновить', 'Yangilash'),
            onPressed:
                _selectedTab != 0 || _isLoading ? null : _loadPresentations,
            icon: const Icon(Icons.refresh_rounded),
          ),
          IconButton(
            tooltip: _text(
              'Switch language',
              'Сменить язык',
              'Tilni almashtirish',
            ),
            onPressed: widget.onToggleLanguage,
            icon: const Icon(Icons.language_rounded),
          ),
          IconButton(
            tooltip: _text('Sign out', 'Выйти', 'Chiqish'),
            onPressed: widget.onSignOut,
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 260),
        reverseDuration: const Duration(milliseconds: 180),
        child: KeyedSubtree(
          key: ValueKey(_selectedTab),
          child: IndexedStack(
            index:
                _selectedTab == 0
                    ? 1
                    : _selectedTab == 3
                    ? 2
                    : 0,
            children: [
              MarketplaceScreen(
                accessToken: widget.accessToken,
                isRussian: _ru,
                isUzbek: _uz,
                presentationRepository: _repository,
                cartItems: widget.cartItems,
                onCartChanged: widget.onCartChanged,
                onToggleLanguage: widget.onToggleLanguage,
                onStateChanged: _onMarketplaceStateChanged,
                showNavigation: false,
                initialSection:
                    _selectedTab == 2
                        ? 2
                        : _selectedTab == 1
                        ? _marketplaceSection
                        : 0,
                initialCheckoutStep: widget.initialCheckoutStep,
              ),
              SafeArea(
                child: RefreshIndicator(
                  onRefresh: _loadPresentations,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
                    children: [
                      Text(
                        _text(
                          'Your ideas, in their best light.',
                          'Ваши идеи в лучшем свете.',
                          'Gʻoyalaringizni yorqin namoyish eting.',
                        ),
                        style: const TextStyle(
                          fontSize: 29,
                          height: 1.12,
                          letterSpacing: -.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _presentationsTitle,
                        style: TextStyle(color: colors.onSurfaceVariant),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        widget.user.email,
                        style: TextStyle(color: colors.onSurfaceVariant),
                      ),
                      const SizedBox(height: 18),
                      Card(
                        elevation: 0,
                        child: ListTile(
                          leading: Icon(
                            Icons.verified_user_outlined,
                            color: colors.primary,
                          ),
                          title: Text(widget.user.displayName),
                          subtitle: Text(
                            _text(
                              'Slideforge account',
                              'Аккаунт Slideforge',
                              'Slideforge hisobi',
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      FilledButton.icon(
                        key: const Key('create-with-ai'),
                        onPressed: _openWorkCreator,
                        icon: const Icon(Icons.auto_awesome),
                        label: Text(
                          _text(
                            'Create with AI',
                            'Создать с ИИ',
                            'AI bilan yaratish',
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      FilledButton.icon(
                        key: const Key('create-presentation'),
                        onPressed: _isCreating ? null : _createPresentation,
                        icon:
                            _isCreating
                                ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                                : const Icon(Icons.add_rounded),
                        label: Text(
                          _text(
                            'Create presentation',
                            'Создать презентацию',
                            'Taqdimot yaratish',
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        key: const Key('create-learning-document'),
                        onPressed: _openArtifactLibrary,
                        icon: const Icon(Icons.article_outlined),
                        label: Text(
                          _text(
                            'Create learning document',
                            'Создать учебный документ',
                            'Oʻquv hujjati yaratish',
                          ),
                        ),
                      ),
                      if (widget.error != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          widget.error!,
                          style: TextStyle(color: colors.error),
                        ),
                      ],
                      if (_error != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          _error!,
                          key: const Key('presentation-error'),
                          style: TextStyle(color: colors.error),
                        ),
                        Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: TextButton(
                            onPressed: _loadPresentations,
                            child: Text(
                              _text('Try again', 'Повторить', 'Qayta urinish'),
                            ),
                          ),
                        ),
                      ],
                      if (_isLoading) ...[
                        const SizedBox(height: 32),
                        const Center(child: CircularProgressIndicator()),
                        const SizedBox(height: 12),
                        Center(
                          child: Text(
                            _ru
                                ? 'Загрузка презентаций…'
                                : 'Loading presentations…',
                          ),
                        ),
                      ] else if (_error == null && _presentations.isEmpty) ...[
                        const SizedBox(height: 34),
                        Icon(
                          Icons.slideshow_outlined,
                          size: 42,
                          color: colors.onSurfaceVariant,
                        ),
                        const SizedBox(height: 10),
                        Center(
                          child: Text(
                            _text(
                              'No presentations yet',
                              'Презентаций пока нет',
                              'Hozircha taqdimotlar yoʻq',
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Center(
                          child: Text(
                            _ru
                                ? 'Создайте первую презентацию.'
                                : 'Create your first presentation.',
                          ),
                        ),
                      ] else if (_error == null) ...[
                        const SizedBox(height: 16),
                        for (final presentation in _presentations)
                          Card(
                            elevation: 0,
                            child: ListTile(
                              leading: Icon(
                                Icons.slideshow_rounded,
                                color: colors.primary,
                              ),
                              title: Text(
                                presentation.title,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              subtitle: Text(
                                '${_text('Version', 'Версия', 'Versiya')} ${presentation.currentVersion} · '
                                '${presentation.updatedAt.toLocal().toString().split(' ').first}',
                              ),
                              trailing:
                                  _openingId == presentation.id
                                      ? const SizedBox(
                                        width: 24,
                                        height: 24,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                      : const Icon(Icons.chevron_right_rounded),
                              onTap:
                                  _openingId == null
                                      ? () => _openEditor(presentation.id)
                                      : null,
                            ),
                          ),
                      ],
                    ],
                  ),
                ),
              ),
              _accountContent(context),
            ],
          ),
        ),
      ),
      bottomNavigationBar: SlideforgeBottomNavigationBar(
        selectedIndex: _selectedTab,
        items: [
          SlideforgeNavigationItem(
            label: _text('Home', 'Главная', 'Bosh sahifa'),
            icon: Icons.home_outlined,
            selectedIcon: Icons.home_rounded,
          ),
          SlideforgeNavigationItem(
            label: _text('Marketplace', 'Маркетплейс', 'Marketpleys'),
            icon: Icons.storefront_outlined,
            selectedIcon: Icons.storefront_rounded,
            badgeCount: widget.cartItems.length,
          ),
          SlideforgeNavigationItem(
            label: _text('Purchases', 'Покупки', 'Xaridlar'),
            icon: Icons.shopping_bag_outlined,
            selectedIcon: Icons.shopping_bag_rounded,
          ),
          SlideforgeNavigationItem(
            label: _text('Account', 'Аккаунт', 'Hisob'),
            icon: Icons.account_circle_outlined,
            selectedIcon: Icons.account_circle_rounded,
          ),
        ],
        onSelected: _selectTab,
      ),
    );
  }
}
