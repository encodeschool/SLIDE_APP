import 'package:flutter/material.dart';
import 'package:slideforge_mobile/auth/auth_repository.dart';
import 'package:slideforge_mobile/auth/auth_screen.dart';
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
  bool _isRussian = false;
  bool _isRestoring = true;
  bool _isSubmitting = false;
  String? _error;
  String? _notice;

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
          if (session != null) _isRussian = session.user.locale == 'ru';
        });
      }
    } on AuthException catch (exception) {
      if (mounted) setState(() => _error = exception.message);
    } catch (_) {
      if (mounted) {
        setState(() {
          _error =
              _isRussian
                  ? 'Не удалось связаться с сервером. Проверьте подключение.'
                  : 'Could not reach the server. Check your connection.';
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
        await _repository.register(
          email,
          password,
          displayName,
          _isRussian ? 'ru' : 'en',
        );
        if (mounted) {
          setState(() {
            _notice =
                _isRussian
                    ? 'Если аккаунт доступен, письмо для подтверждения будет отправлено.'
                    : 'If eligible, verification instructions will be sent to your email.';
          });
        }
        return AuthSubmitResult.registered;
      }
      final session = await _repository.login(email, password);
      if (mounted) {
        setState(() {
          _session = session;
          _isRussian = session.user.locale == 'ru';
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
              _error =
                  _isRussian
                      ? 'Не удалось связаться с сервером. Проверьте подключение.'
                      : 'Could not reach the server. Check your connection.',
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
                  ? (_isRussian
                      ? 'Если аккаунт доступен, письмо для подтверждения будет отправлено.'
                      : 'If eligible, verification instructions will be sent to your email.')
                  : (_isRussian
                      ? 'Если аккаунт существует, инструкции для сброса пароля будут отправлены.'
                      : 'If the account exists, password reset instructions will be sent.');
        });
      }
    } on AuthException catch (exception) {
      if (mounted) setState(() => _error = exception.message);
    } catch (_) {
      if (mounted) {
        setState(() {
          _error =
              _isRussian
                  ? 'Не удалось связаться с сервером. Проверьте подключение.'
                  : 'Could not reach the server. Check your connection.';
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
      if (mounted) setState(() => _session = null);
    }
  }

  void _toggleLanguage() {
    setState(() => _isRussian = !_isRussian);
  }

  @override
  Widget build(BuildContext context) {
    if (_isRestoring) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.layers_rounded,
                size: 30,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 16),
              const CircularProgressIndicator(),
            ],
          ),
        ),
      );
    }

    final session = _session;
    if (session != null) {
      return WorkspaceScreen(
        user: session.user,
        accessToken: session.accessToken,
        isRussian: _isRussian,
        error: _error,
        onSignOut: _signOut,
        onToggleLanguage: _toggleLanguage,
        presentationRepository: widget.presentationRepository,
      );
    }
    return AuthScreen(
      isRussian: _isRussian,
      isSubmitting: _isSubmitting,
      error: _error,
      notice: _notice,
      onSubmit: _authenticate,
      onRequestVerification:
          (email) => _requestEmailAction(email, verification: true),
      onRequestPasswordRecovery:
          (email) => _requestEmailAction(email, verification: false),
      onToggleLanguage: _toggleLanguage,
    );
  }
}
