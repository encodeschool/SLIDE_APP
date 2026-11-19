import 'package:flutter/material.dart';
import 'package:mobile/i18n/mobile_localizations.dart';
import 'package:mobile/shared/eduslides_brand_mark.dart';

enum AuthSubmitResult { signedIn, registered, failed }

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    super.key,
    required this.isRussian,
    required this.isUzbek,
    required this.isSubmitting,
    required this.error,
    required this.onSubmit,
    required this.onRequestVerification,
    required this.onRequestPasswordRecovery,
    required this.onToggleLanguage,
    this.onBack,
    this.notice,
  });

  final bool isRussian;
  final bool isUzbek;
  final bool isSubmitting;
  final String? error;
  final Future<AuthSubmitResult> Function(
    bool createAccount,
    String email,
    String password,
    String displayName,
  )
  onSubmit;
  final Future<void> Function(String email) onRequestVerification;
  final Future<void> Function(String email) onRequestPasswordRecovery;
  final VoidCallback onToggleLanguage;
  final VoidCallback? onBack;
  final String? notice;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  bool _createAccount = false;
  String? _emailActionError;

  MobileLocalizations get _strings => MobileLocalizations.fromFlags(
    isRussian: widget.isRussian,
    isUzbek: widget.isUzbek,
  );
  String _text(String english, String russian, String uzbek) =>
      _strings.text(english, russian, uzbek);

  String get _title => _text(
    'Your ideas, in their best light.',
    'Ваши идеи в лучшем свете.',
    'Gʻoyalaringizni yorqin namoyish eting.',
  );
  String get _subtitle =>
      _createAccount
          ? _text(
            'Create an account to start building presentations.',
            'Создайте аккаунт, чтобы начать создавать презентации.',
            'Taqdimot yaratishni boshlash uchun hisob oching.',
          )
          : _text(
            'Sign in to your presentation workspace.',
            'Войдите в рабочее пространство презентаций.',
            'Taqdimotlar ish maydoniga kiring.',
          );
  String get _emailLabel =>
      _text('Email address', 'Электронная почта', 'Elektron pochta');
  String get _passwordLabel => _text('Password', 'Пароль', 'Parol');
  String get _nameLabel => _text('Your name', 'Ваше имя', 'Ismingiz');
  String get _signIn => _text('Sign in', 'Войти', 'Kirish');
  String get _register =>
      _text('Create account', 'Создать аккаунт', 'Hisob yaratish');
  String get _switchMode =>
      _createAccount
          ? _text(
            'Already registered? Sign in',
            'Уже есть аккаунт? Войти',
            'Hisobingiz bormi? Kiring',
          )
          : _text(
            'New to EDU Slides? Create an account',
            'Нет аккаунта? Создать',
            'Yangi foydalanuvchimisiz? Hisob yarating',
          );
  String get _resendVerification => _text(
    'Resend verification email',
    'Отправить письмо повторно',
    'Tasdiqlash xatini qayta yuborish',
  );
  String get _forgotPassword =>
      _text('Forgot password?', 'Забыли пароль?', 'Parol esdan chiqdimi?');
  String get _invalidEmail => _text(
    'Enter a valid email address',
    'Введите корректный адрес электронной почты',
    'Toʻgʻri elektron pochta manzilini kiriting',
  );
  String get _passwordLength => _text(
    'Use at least 12 characters',
    'Не менее 12 символов',
    'Kamida 12 ta belgi kiriting',
  );
  String get _required => _text(
    'This field is required',
    'Обязательное поле',
    'Bu maydonni toʻldirish shart',
  );
  String get _languageTooltip =>
      _text('Switch language', 'Сменить язык', 'Tilni almashtirish');

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final result = await widget.onSubmit(
      _createAccount,
      _emailController.text.trim(),
      _passwordController.text,
      _nameController.text.trim(),
    );
    if (mounted && result == AuthSubmitResult.registered) {
      setState(() {
        _createAccount = false;
        _passwordController.clear();
        _emailActionError = null;
      });
    }
  }

  Future<void> _requestEmailAction(
    Future<void> Function(String email) action,
  ) async {
    final email = _emailController.text.trim();
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) {
      setState(() => _emailActionError = _invalidEmail);
      return;
    }
    setState(() => _emailActionError = null);
    await action(email);
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      key: const Key('auth-screen'),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF7F8F5),
        titleSpacing: 20,
        leading:
            widget.onBack == null
                ? null
                : IconButton(
                  tooltip: _text(
                    'Back to shop',
                    'Назад в магазин',
                    'Doʻkonga qaytish',
                  ),
                  onPressed: widget.onBack,
                  icon: const Icon(Icons.arrow_back_rounded),
                ),
        title: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: colors.primary,
                borderRadius: BorderRadius.circular(9),
              ),
              child: const EduslidesBrandMark(size: 34),
            ),
            const SizedBox(width: 10),
            const Text(
              'EDU Slides',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: _languageTooltip,
            onPressed: widget.onToggleLanguage,
            icon: const Icon(Icons.language_rounded),
          ),
          const SizedBox(width: 10),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(22, 34, 22, 28),
          children: [
            Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFFE39A58),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 9),
                Text(
                  _createAccount
                      ? _register.toUpperCase()
                      : _signIn.toUpperCase(),
                  style: TextStyle(
                    color: colors.primary,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.1,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 22),
            Text(
              _title,
              style: const TextStyle(
                fontSize: 34,
                height: 1.12,
                fontWeight: FontWeight.w700,
                color: Color(0xFF242A28),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              _subtitle,
              style: TextStyle(
                fontSize: 14,
                height: 1.65,
                color: colors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 28),
            Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_createAccount) ...[
                    TextFormField(
                      key: const Key('display-name-field'),
                      controller: _nameController,
                      textCapitalization: TextCapitalization.words,
                      maxLength: 120,
                      decoration: InputDecoration(
                        labelText: _nameLabel,
                        prefixIcon: const Icon(Icons.person_outline_rounded),
                      ),
                      validator:
                          (value) =>
                              value == null || value.trim().isEmpty
                                  ? _required
                                  : null,
                    ),
                    const SizedBox(height: 8),
                  ],
                  TextFormField(
                    key: const Key('email-field'),
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.email],
                    decoration: InputDecoration(
                      labelText: _emailLabel,
                      prefixIcon: const Icon(Icons.alternate_email_rounded),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return _required;
                      }
                      if (!RegExp(
                        r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
                      ).hasMatch(value.trim())) {
                        return _invalidEmail;
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    key: const Key('password-field'),
                    controller: _passwordController,
                    obscureText: true,
                    textInputAction: TextInputAction.done,
                    autofillHints: [
                      _createAccount
                          ? AutofillHints.newPassword
                          : AutofillHints.password,
                    ],
                    decoration: InputDecoration(
                      labelText: _passwordLabel,
                      prefixIcon: const Icon(Icons.lock_outline_rounded),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) return _required;
                      if (_createAccount && value.length < 12) {
                        return _passwordLength;
                      }
                      return null;
                    },
                    onFieldSubmitted: (_) => _submit(),
                  ),
                  if (_emailActionError != null) ...[
                    const SizedBox(height: 14),
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        _emailActionError!,
                        style: TextStyle(color: colors.error, fontSize: 12),
                      ),
                    ),
                  ],
                  if (widget.notice != null) ...[
                    const SizedBox(height: 14),
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        widget.notice!,
                        style: TextStyle(color: colors.primary, fontSize: 12),
                      ),
                    ),
                  ],
                  if (widget.error != null) ...[
                    const SizedBox(height: 14),
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        widget.error!,
                        key: const Key('auth-error'),
                        style: TextStyle(color: colors.error, fontSize: 12),
                      ),
                    ),
                  ],
                  const SizedBox(height: 22),
                  FilledButton.icon(
                    key: const Key('auth-submit'),
                    onPressed: widget.isSubmitting ? null : _submit,
                    icon:
                        widget.isSubmitting
                            ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                            : Icon(
                              _createAccount
                                  ? Icons.person_add_alt_1_rounded
                                  : Icons.login_rounded,
                            ),
                    label: Text(_createAccount ? _register : _signIn),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    key: const Key('auth-mode-switch'),
                    onPressed:
                        widget.isSubmitting
                            ? null
                            : () => setState(() {
                              _createAccount = !_createAccount;
                              _emailActionError = null;
                            }),
                    child: Text(_switchMode, textAlign: TextAlign.center),
                  ),
                  if (!_createAccount) ...[
                    TextButton(
                      key: const Key('auth-forgot-password'),
                      onPressed:
                          widget.isSubmitting
                              ? null
                              : () => _requestEmailAction(
                                widget.onRequestPasswordRecovery,
                              ),
                      child: Text(_forgotPassword),
                    ),
                    TextButton(
                      key: const Key('auth-resend-verification'),
                      onPressed:
                          widget.isSubmitting
                              ? null
                              : () => _requestEmailAction(
                                widget.onRequestVerification,
                              ),
                      child: Text(_resendVerification),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
