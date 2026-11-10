import 'package:flutter/material.dart';
import 'package:slideforge_mobile/auth/auth_repository.dart';
import 'package:slideforge_mobile/auth/auth_screen.dart';
import 'package:slideforge_mobile/marketplace/marketplace_screen.dart';
import 'package:slideforge_mobile/presentations/presentation_library_screen.dart';
import 'package:slideforge_mobile/presentations/presentation_repository.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key, this.authRepository, this.presentationRepository});

  final AuthRepository? authRepository;
  final PresentationRepository? presentationRepository;

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  late final AuthRepository _repository;
  AuthSession? _session;
  String _locale = 'en';
  bool _isRestoring = true;
  bool _isSubmitting = false;
  bool _authRequested = false;
  int _guestReturnSection = 0;
  int _guestReturnCheckoutStep = 0;
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
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    try {
      final session = await _repository.restoreSession();
      if (mounted) {
        setState(() {
          _session = session;
          if (session != null) {
            _locale =
                ['en', 'ru', 'uz'].contains(session.user.locale)
                    ? session.user.locale
                    : 'en';
          }
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
      if (mounted) setState(() => _isRestoring = false);
    }
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
        });
      }
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
        });
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
  }

  @override
  Widget build(BuildContext context) {
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
        onCartChanged: (items) => setState(() => _cartItems = items),
        initialTab: _cartItems.isNotEmpty ? 1 : 2,
        initialMarketplaceSection: _cartItems.isNotEmpty ? 1 : 0,
        initialCheckoutStep: _cartItems.isNotEmpty ? 2 : 0,
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
        onCartChanged: (items) => setState(() => _cartItems = items),
        initialSection: _guestReturnSection,
        initialCheckoutStep: _guestReturnCheckoutStep,
        isRestoringSession: _isRestoring,
        startupError: _error,
        onRequireAuth:
            (section, checkoutStep) => setState(() {
              _guestReturnSection = section;
              _guestReturnCheckoutStep = checkoutStep;
              _authRequested = true;
            }),
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
