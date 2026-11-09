import 'package:flutter/material.dart';
import 'package:slideforge_mobile/auth/auth_repository.dart';
import 'package:slideforge_mobile/presentations/presentation_editor_screen.dart';
import 'package:slideforge_mobile/presentations/presentation_repository.dart';

class WorkspaceScreen extends StatefulWidget {
  const WorkspaceScreen({
    super.key,
    required this.user,
    required this.accessToken,
    required this.isRussian,
    required this.onSignOut,
    required this.onToggleLanguage,
    this.presentationRepository,
    this.error,
  });

  final AuthUser user;
  final String accessToken;
  final bool isRussian;
  final String? error;
  final VoidCallback onSignOut;
  final VoidCallback onToggleLanguage;
  final PresentationRepository? presentationRepository;

  @override
  State<WorkspaceScreen> createState() => _WorkspaceScreenState();
}

class _WorkspaceScreenState extends State<WorkspaceScreen> {
  late final PresentationRepository _repository;
  List<PresentationSummary> _presentations = [];
  bool _isLoading = true;
  bool _isCreating = false;
  String? _openingId;
  String? _error;

  bool get _ru => widget.isRussian;
  String get _presentationsTitle =>
      _ru ? 'Мои презентации' : 'My presentations';
  String get _newTitle => _ru ? 'Новая презентация' : 'Untitled presentation';

  @override
  void initState() {
    super.initState();
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
              _error =
                  _ru
                      ? 'Не удалось загрузить презентации.'
                      : 'Could not load presentations.',
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
        _ru ? 'ru' : 'en',
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
              _error =
                  _ru
                      ? 'Не удалось создать презентацию. Попробуйте ещё раз.'
                      : 'Could not create the presentation. Please try again.',
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
                repository: _repository,
              ),
        ),
      );
      if (mounted) await _loadPresentations();
    } catch (_) {
      if (mounted) {
        setState(
          () =>
              _error =
                  _ru
                      ? 'Не удалось открыть презентацию.'
                      : 'Could not open the presentation.',
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
            tooltip: _ru ? 'Обновить' : 'Refresh',
            onPressed: _isLoading ? null : _loadPresentations,
            icon: const Icon(Icons.refresh_rounded),
          ),
          IconButton(
            tooltip: _ru ? 'Сменить язык' : 'Switch language',
            onPressed: widget.onToggleLanguage,
            icon: const Icon(Icons.language_rounded),
          ),
          IconButton(
            tooltip: _ru ? 'Выйти' : 'Sign out',
            onPressed: widget.onSignOut,
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      body: SafeArea(
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
                    _ru ? 'Аккаунт Slideforge' : 'Slideforge account',
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
                  _ru ? 'Создать презентацию' : 'Create presentation',
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
                    child: Text(_ru ? 'Повторить' : 'Try again'),
                  ),
                ),
              ],
              if (_isLoading) ...[
                const SizedBox(height: 32),
                const Center(child: CircularProgressIndicator()),
                const SizedBox(height: 12),
                Center(
                  child: Text(
                    _ru ? 'Загрузка презентаций…' : 'Loading presentations…',
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
                    _ru ? 'Презентаций пока нет' : 'No presentations yet',
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
                        '${_ru ? 'Версия' : 'Version'} ${presentation.currentVersion} · '
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
    );
  }
}
