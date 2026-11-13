import 'package:flutter/material.dart';
import 'package:slideforge_mobile/auth/app_state_store.dart';
import 'package:slideforge_mobile/auth/auth_repository.dart';
import 'package:slideforge_mobile/auth/auth_screen.dart';
import 'package:slideforge_mobile/marketplace/marketplace_screen.dart';
import 'package:slideforge_mobile/presentations/presentation_library_screen.dart';
import 'package:slideforge_mobile/presentations/presentation_repository.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({
    super.key,
    this.authRepository,
    this.presentationRepository,
    this.appStateStore,
  });

  final AuthRepository? authRepository;
  final PresentationRepository? presentationRepository;
  final MobileAppStateStore? appStateStore;

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  late final AuthRepository _repository;
  late final MobileAppStateStore _appStateStore;
  AuthSession? _session;
  String _locale = 'en';
  bool _isRestoring = true;
  bool _isSubmitting = false;
  bool _authRequested = false;
  bool _accountAuthRequested = false;
  int _workspaceTab = 0;
  int _marketplaceSection = 0;
  int _checkoutStep = 0;
  List<Map<String, dynamic>> _cartItems = [];
  String? _error;
  String? _notice;

  bool get _isRussian => _locale == 'ru';
  bool get _isUzbek => _locale == 'uz';
  String _text(String english, String russian, String uzbek) =>
      _isUzbek
          ? uzbek
          : _isRussian
          ? russian
          : english;

  @override
  void initState() {
    super.initState();
    _repository =
        widget.authRepository ??
        ApiAuthRepository(
          baseUrl: const String.fromEnvironment(
            'API_BASE_URL',
            defaultValue: 'http://10.0.2.2:8080',
          ),
          sessionStore: DeviceSecureSessionStore(),
        );
    _appStateStore = widget.appStateStore ?? DeviceMobileAppStateStore();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    final savedStateFuture = _appStateStore.read();
    try {
      final session = await _repository.restoreSession();
      if (mounted) {
        setState(() {
          _session = session;
        });
      }
    } on AuthException catch (exception) {
      if (mounted) setState(() => _error = exception.message);
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = _text(
            'Could not reach the server. Check your connection.',
            'Не удалось связаться с сервером. Проверьте подключение.',
            'Serverga ulanib boʻlmadi. Internet aloqasini tekshiring.',
          );
        });
      }
    } finally {
      final savedState = await savedStateFuture;
      if (mounted) {
        setState(() {
          _cartItems = savedState.cartItems;
          _marketplaceSection = savedState.marketplaceSection;
          _checkoutStep = savedState.checkoutStep;
          _workspaceTab = savedState.workspaceTab;
          if (savedState.localeIsSaved) {
            _locale = savedState.locale;
          } else if (_session != null) {
            _locale =
                ['en', 'ru', 'uz'].contains(_session!.user.locale)
                    ? _session!.user.locale
                    : 'en';
          }
          if (_session == null) {
            _marketplaceSection =
                savedState.marketplaceSection == 2
                    ? 2
                    : savedState.marketplaceSection;
            _workspaceTab =
                _marketplaceSection == 1
                    ? 1
                    : _marketplaceSection == 2
                    ? 2
                    : 1;
          }
          _isRestoring = false;
        });
      }
    }
  }

  MobileAppState _currentAppState() => MobileAppState(
    cartItems: _cartItems,
    marketplaceSection: _marketplaceSection,
    checkoutStep: _checkoutStep,
    workspaceTab: _workspaceTab,
    locale: _locale,
  );

  Future<void> _saveAppState() => _appStateStore.write(_currentAppState());

  void _updateCart(List<Map<String, dynamic>> items) {
    setState(() {
      _cartItems = items;
      if (items.isEmpty) _checkoutStep = 0;
    });
    _saveAppState();
  }

  void _updateMarketplaceState(int section, int checkoutStep) {
    setState(() {
      _marketplaceSection = section.clamp(0, 2).toInt();
      _checkoutStep = _cartItems.isEmpty ? 0 : checkoutStep.clamp(0, 2).toInt();
      _workspaceTab = _marketplaceSection == 2 ? 2 : 1;
    });
    _saveAppState();
  }

  void _updateWorkspaceTab(int tab) {
    setState(() {
      _workspaceTab = tab.clamp(0, 3).toInt();
      if (_workspaceTab == 1) {
        _marketplaceSection = _marketplaceSection == 1 ? 1 : 0;
      } else if (_workspaceTab == 2) {
        _marketplaceSection = 2;
      } else {
        _marketplaceSection = 0;
      }
      if (_cartItems.isEmpty) _checkoutStep = 0;
    });
    _saveAppState();
  }

  Future<AuthSubmitResult> _authenticate(
    bool createAccount,
    String email,
    String password,
    String displayName,
  ) async {
    setState(() {
      _isSubmitting = true;
      _error = null;
      _notice = null;
    });
    try {
      if (createAccount) {
        await _repository.register(email, password, displayName, _locale);
        if (mounted) {
          setState(() {
            _notice = _text(
              'If eligible, verification instructions will be sent to your email.',
              'Если аккаунт доступен, письмо для подтверждения будет отправлено.',
              'Agar hisob mos boʻlsa, tasdiqlash koʻrsatmalari elektron pochtangizga yuboriladi.',
            );
          });
        }
        return AuthSubmitResult.registered;
      }
      final session = await _repository.login(email, password);
      if (mounted) {
        setState(() {
          _session = session;
          _locale =
              ['en', 'ru', 'uz'].contains(session.user.locale)
                  ? session.user.locale
                  : 'en';
          _workspaceTab =
              _accountAuthRequested
                  ? 3
                  : _marketplaceSection == 1
                  ? 1
                  : _marketplaceSection == 2
                  ? 2
                  : 1;
          _accountAuthRequested = false;
        });
      }
      _saveAppState();
      return AuthSubmitResult.signedIn;
    } on AuthException catch (exception) {
      if (mounted) setState(() => _error = exception.message);
      return AuthSubmitResult.failed;
    } catch (_) {
      if (mounted) {
        setState(
          () =>
              _error = _text(
                'Could not reach the server. Check your connection.',
                'Не удалось связаться с сервером. Проверьте подключение.',
                'Serverga ulanib boʻlmadi. Internet aloqasini tekshiring.',
              ),
        );
      }
      return AuthSubmitResult.failed;
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _requestEmailAction(
    String email, {
    required bool verification,
  }) async {
    setState(() {
      _isSubmitting = true;
      _error = null;
      _notice = null;
    });
    try {
      if (verification) {
        await _repository.requestEmailVerification(email);
      } else {
        await _repository.requestPasswordRecovery(email);
      }
      if (mounted) {
        setState(() {
          _notice =
              verification
                  ? _text(
                    'If eligible, verification instructions will be sent to your email.',
                    'Если аккаунт доступен, письмо для подтверждения будет отправлено.',
                    'Agar hisob mos boʻlsa, tasdiqlash koʻrsatmalari elektron pochtangizga yuboriladi.',
                  )
                  : _text(
                    'If the account exists, password reset instructions will be sent.',
                    'Если аккаунт существует, инструкции для сброса пароля будут отправлены.',
                    'Agar hisob mavjud boʻlsa, parolni tiklash koʻrsatmalari yuboriladi.',
                  );
        });
      }
    } on AuthException catch (exception) {
      if (mounted) setState(() => _error = exception.message);
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = _text(
            'Could not reach the server. Check your connection.',
            'Не удалось связаться с сервером. Проверьте подключение.',
            'Serverga ulanib boʻlmadi. Internet aloqasini tekshiring.',
          );
        });
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _signOut() async {
    try {
      await _repository.logout();
    } on AuthException catch (exception) {
      if (mounted) setState(() => _error = exception.message);
    } finally {
      if (mounted) {
        setState(() {
          _session = null;
          _authRequested = false;
          _accountAuthRequested = false;
          _workspaceTab = 0;
        });
        _saveAppState();
      }
    }
  }

  void _toggleLanguage() {
    setState(() {
      _locale = switch (_locale) {
        'en' => 'ru',
        'ru' => 'uz',
        _ => 'en',
      };
    });
    _saveAppState();
  }

  @override
  Widget build(BuildContext context) {
    if (_isRestoring) {
      return _StartupLoadingScreen(isRussian: _isRussian, isUzbek: _isUzbek);
    }
    final session = _session;
    if (session != null) {
      return WorkspaceScreen(
        user: session.user,
        accessToken: session.accessToken,
        isRussian: _isRussian,
        isUzbek: _isUzbek,
        error: _error,
        onSignOut: _signOut,
        onToggleLanguage: _toggleLanguage,
        presentationRepository: widget.presentationRepository,
        cartItems: _cartItems,
        onCartChanged: _updateCart,
        initialTab: _workspaceTab,
        initialMarketplaceSection: _marketplaceSection,
        initialCheckoutStep: _checkoutStep,
        onTabChanged: _updateWorkspaceTab,
        onMarketplaceStateChanged: _updateMarketplaceState,
      );
    }
    if (!_authRequested) {
      return MarketplaceScreen(
        accessToken: null,
        isRussian: _isRussian,
        isUzbek: _isUzbek,
        presentationRepository:
            widget.presentationRepository ??
            ApiPresentationRepository(
              baseUrl: const String.fromEnvironment(
                'API_BASE_URL',
                defaultValue: 'http://10.0.2.2:8080',
              ),
            ),
        cartItems: _cartItems,
        onCartChanged: _updateCart,
        initialSection: _marketplaceSection,
        initialCheckoutStep: _checkoutStep,
        onStateChanged: _updateMarketplaceState,
        isRestoringSession: _isRestoring,
        startupError: _error,
        onRequireAuth: (section, checkoutStep) {
          _updateMarketplaceState(section, checkoutStep);
          setState(() {
            _authRequested = true;
            _accountAuthRequested = section == 2;
          });
        },
        onToggleLanguage: _toggleLanguage,
      );
    }
    return AuthScreen(
      isRussian: _isRussian,
      isUzbek: _isUzbek,
      isSubmitting: _isSubmitting,
      error: _error,
      notice: _notice,
      onSubmit: _authenticate,
      onRequestVerification:
          (email) => _requestEmailAction(email, verification: true),
      onRequestPasswordRecovery:
          (email) => _requestEmailAction(email, verification: false),
      onToggleLanguage: _toggleLanguage,
      onBack: () => setState(() => _authRequested = false),
    );
  }
}

class _StartupLoadingScreen extends StatelessWidget {
  const _StartupLoadingScreen({required this.isRussian, required this.isUzbek});

  final bool isRussian;
  final bool isUzbek;

  String _text(String english, String russian, String uzbek) =>
      isUzbek
          ? uzbek
          : isRussian
          ? russian
          : english;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              colors.surface,
              colors.primaryContainer.withValues(alpha: .55),
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: Padding(
                padding: const EdgeInsets.all(28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DecoratedBox(
                      decoration: BoxDecoration(
                        color: colors.primary,
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: const SizedBox(
                        width: 58,
                        height: 58,
                        child: Icon(
                          Icons.layers_rounded,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      'slideforge',
                      style: TextStyle(
                        fontSize: 21,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -.5,
                      ),
                    ),
                    const SizedBox(height: 28),
                    SizedBox(
                      width: 26,
                      height: 26,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: colors.primary,
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      _text(
                        'Preparing your workspace',
                        'Подготавливаем рабочее пространство',
                        'Ish maydoni tayyorlanmoqda',
                      ),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 7),
                    Text(
                      _text(
                        'Checking your session',
                        'Проверяем сессию',
                        'Sessiya tekshirilmoqda',
                      ),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
