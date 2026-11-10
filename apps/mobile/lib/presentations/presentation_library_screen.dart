import 'package:flutter/material.dart';
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
    this.initialTab = 1,
    this.initialMarketplaceSection = 0,
    this.initialCheckoutStep = 0,
    this.presentationRepository,
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
  final PresentationRepository? presentationRepository;

  @override
  State<WorkspaceScreen> createState() => _WorkspaceScreenState();
}

class _WorkspaceScreenState extends State<WorkspaceScreen> {
  late final PresentationRepository _repository;
  List<PresentationSummary> _presentations = [];
  bool _isLoading = true;
  bool _isCreating = false;
  late int _selectedTab;
  String? _openingId;
  String? _error;

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
    _repository =
        widget.presentationRepository ??
        ApiPresentationRepository(
          baseUrl: const String.fromEnvironment(
            'API_BASE_URL',
            defaultValue: 'http://10.0.2.2:8080',
          ),
        );
    _loadPresentations();
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
            const Text(
              'slideforge',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: _text('Refresh', 'Обновить', 'Yangilash'),
            onPressed:
                _selectedTab != 2 || _isLoading ? null : _loadPresentations,
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
      body: IndexedStack(
        index: _selectedTab == 2 ? 1 : 0,
        children: [
          MarketplaceScreen(
            accessToken: widget.accessToken,
            isRussian: _ru,
            isUzbek: _uz,
            presentationRepository: _repository,
            cartItems: widget.cartItems,
            onCartChanged: widget.onCartChanged,
            onToggleLanguage: widget.onToggleLanguage,
            showNavigation: false,
            initialSection: _selectedTab == 1 ? 1 : 0,
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
                    _presentationsTitle,
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                    ),
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
                    key: const Key('create-presentation'),
                    onPressed: _isCreating ? null : _createPresentation,
                    icon:
                        _isCreating
                            ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
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
                  if (widget.error != null) ...[
                    const SizedBox(height: 12),
                    Text(widget.error!, style: TextStyle(color: colors.error)),
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
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedTab,
        animationDuration: const Duration(milliseconds: 320),
        onDestinationSelected: (index) => setState(() => _selectedTab = index),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.storefront_outlined),
            selectedIcon: const Icon(Icons.storefront_rounded),
            label: _text('Shop', 'Магазин', 'Doʻkon'),
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: widget.cartItems.isNotEmpty,
              label: Text('${widget.cartItems.length}'),
              child: const Icon(Icons.shopping_bag_outlined),
            ),
            selectedIcon: const Icon(Icons.shopping_bag_rounded),
            label: _text('Cart', 'Корзина', 'Savat'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.slideshow_outlined),
            selectedIcon: const Icon(Icons.slideshow_rounded),
            label: _text('My slides', 'Презентации', 'Taqdimotlarim'),
          ),
        ],
      ),
    );
  }
}
