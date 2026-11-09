import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthUser {
  const AuthUser({
    required this.id,
    required this.email,
    required this.displayName,
    required this.locale,
    required this.roles,
  });

  final String id;
  final String email;
  final String displayName;
  final String locale;
  final List<String> roles;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      email: json['email'] as String,
      displayName: json['displayName'] as String,
      locale: json['locale'] as String? ?? 'en',
      roles: (json['roles'] as List<dynamic>? ?? const []).cast<String>(),
    );
  }
}

class AuthSession {
  const AuthSession({required this.user, required this.accessToken});

  final AuthUser user;
  final String accessToken;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      user: AuthUser.fromJson(Map<String, dynamic>.from(json['user'] as Map)),
      accessToken: json['accessToken'] as String,
    );
  }
}

class AuthException implements Exception {
  const AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}

abstract interface class AuthRepository {
  Future<AuthSession?> restoreSession();
  Future<AuthSession> login(String email, String password);
  Future<void> register(
    String email,
    String password,
    String displayName,
    String locale,
  );
  Future<void> requestEmailVerification(String email);
  Future<void> requestPasswordRecovery(String email);
  Future<void> logout();
}

abstract interface class SecureSessionStore {
  Future<String?> readAccessToken();
  Future<String?> readRefreshCookie();
  Future<void> writeSession(String accessToken, String refreshCookie);
  Future<void> clear();
}

class DeviceSecureSessionStore implements SecureSessionStore {
  DeviceSecureSessionStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage();

  static const _accessTokenKey = 'slideforge.access_token';
  static const _refreshCookieKey = 'slideforge.refresh_cookie';
  final FlutterSecureStorage _storage;

  @override
  Future<String?> readAccessToken() => _storage.read(key: _accessTokenKey);

  @override
  Future<String?> readRefreshCookie() => _storage.read(key: _refreshCookieKey);

  @override
  Future<void> writeSession(String accessToken, String refreshCookie) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshCookieKey, value: refreshCookie);
  }

  @override
  Future<void> clear() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshCookieKey);
  }
}

class ApiAuthRepository implements AuthRepository {
  ApiAuthRepository({
    required String baseUrl,
    required SecureSessionStore sessionStore,
    Dio? dio,
  }) : _sessionStore = sessionStore,
       _dio =
           dio ??
           Dio(
             BaseOptions(
               baseUrl: baseUrl,
               connectTimeout: const Duration(seconds: 10),
               receiveTimeout: const Duration(seconds: 10),
               validateStatus: (status) => status != null && status < 500,
             ),
           );

  final Dio _dio;
  final SecureSessionStore _sessionStore;

  @override
  Future<AuthSession?> restoreSession() async {
    final cookie = await _sessionStore.readRefreshCookie();
    if (cookie == null) return null;
    try {
      final response = await _post('/api/v1/auth/refresh', cookie: cookie);
      if (response.statusCode != 200) {
        if (response.statusCode == 401) await _sessionStore.clear();
        return null;
      }
      return await _saveSession(response);
    } on AuthException {
      rethrow;
    } on DioException {
      throw const AuthException(
        'Could not reach Slideforge. Check your connection.',
      );
    }
  }

  @override
  Future<AuthSession> login(String email, String password) async {
    final response = await _post(
      '/api/v1/auth/login',
      data: {'email': email, 'password': password},
    );
    if (response.statusCode != 200) throw _problem(response);
    return _saveSession(response);
  }

  @override
  Future<void> register(
    String email,
    String password,
    String displayName,
    String locale,
  ) async {
    final response = await _post(
      '/api/v1/auth/register',
      data: {
        'email': email,
        'password': password,
        'displayName': displayName,
        'locale': locale,
      },
    );
    if (response.statusCode != 201) throw _problem(response);
  }

  @override
  Future<void> requestEmailVerification(String email) async {
    final response = await _post(
      '/api/v1/auth/verify/request',
      data: {'email': email},
    );
    if (response.statusCode != 200) throw _problem(response);
  }

  @override
  Future<void> requestPasswordRecovery(String email) async {
    final response = await _post(
      '/api/v1/auth/password/forgot',
      data: {'email': email},
    );
    if (response.statusCode != 200) throw _problem(response);
  }

  @override
  Future<void> logout() async {
    final cookie = await _sessionStore.readRefreshCookie();
    try {
      if (cookie != null) {
        final response = await _post('/api/v1/auth/logout', cookie: cookie);
        if (response.statusCode != 204) throw _problem(response);
      }
    } on DioException {
      throw const AuthException(
        'Could not reach Slideforge to end this session.',
      );
    } finally {
      await _sessionStore.clear();
    }
  }

  Future<Response<dynamic>> _post(
    String path, {
    Object? data,
    String? cookie,
  }) async {
    try {
      final response = await _dio.post<dynamic>(
        path,
        data: data,
        options: Options(headers: cookie == null ? null : {'Cookie': cookie}),
      );
      return response;
    } on DioException {
      throw const AuthException(
        'Could not reach Slideforge. Check your connection.',
      );
    }
  }

  Future<AuthSession> _saveSession(Response<dynamic> response) async {
    final session = AuthSession.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
    final cookie = _refreshCookie(response);
    if (cookie == null) {
      throw const AuthException(
        'The server did not provide a refresh session.',
      );
    }
    await _sessionStore.writeSession(session.accessToken, cookie);
    return session;
  }

  String? _refreshCookie(Response<dynamic> response) {
    for (final header in response.headers['set-cookie'] ?? const <String>[]) {
      if (header.startsWith('slideforge_refresh=')) {
        return header.split(';').first;
      }
    }
    return null;
  }

  AuthException _problem(Response<dynamic> response) {
    final data = response.data;
    final detail = data is Map ? data['detail'] : null;
    return AuthException(
      detail is String ? detail : 'Sign-in failed (${response.statusCode}).',
    );
  }
}
