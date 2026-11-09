import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:slideforge_mobile/auth/auth_repository.dart';

class FakeSessionStore implements SecureSessionStore {
  String? accessToken;
  String? refreshCookie;

  @override
  Future<String?> readAccessToken() async => accessToken;

  @override
  Future<String?> readRefreshCookie() async => refreshCookie;

  @override
  Future<void> writeSession(
    String newAccessToken,
    String newRefreshCookie,
  ) async {
    accessToken = newAccessToken;
    refreshCookie = newRefreshCookie;
  }

  @override
  Future<void> clear() async {
    accessToken = null;
    refreshCookie = null;
  }
}

class FakeHttpClientAdapter implements HttpClientAdapter {
  FakeHttpClientAdapter(this.response);

  final ResponseBody response;
  RequestOptions? lastRequest;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastRequest = options;
    return response;
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody authResponse({
  required int status,
  required String accessToken,
  String? cookie,
}) {
  final headers = <String, List<String>>{
    Headers.contentTypeHeader: [Headers.jsonContentType],
  };
  if (cookie != null) headers['set-cookie'] = [cookie];
  return ResponseBody.fromString(
    jsonEncode({
      'user': {
        'id': 'user-1',
        'email': 'mobile@example.test',
        'displayName': 'Mobile User',
        'locale': 'ru',
        'roles': ['USER'],
      },
      'accessToken': accessToken,
      'expiresInSeconds': 900,
    }),
    status,
    headers: headers,
  );
}

void main() {
  test(
    'registration requests email verification and never stores a session before verification',
    () async {
      final store = FakeSessionStore();
      final adapter = FakeHttpClientAdapter(
        ResponseBody.fromString(
          '{"message":"If the account is eligible, instructions will be sent."}',
          201,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        ),
      );
      final dio = Dio(BaseOptions(baseUrl: 'http://localhost:8080'))
        ..httpClientAdapter = adapter;
      final repository = ApiAuthRepository(
        baseUrl: 'http://localhost:8080',
        sessionStore: store,
        dio: dio,
      );

      await repository.register(
        'mobile@example.test',
        'long-mobile-password',
        'Mobile User',
        'ru',
      );

      expect(adapter.lastRequest?.path, '/api/v1/auth/register');
      expect(
        (adapter.lastRequest?.data as Map<String, dynamic>)['locale'],
        'ru',
      );
      expect(store.accessToken, isNull);
      expect(store.refreshCookie, isNull);
    },
  );

  test(
    'verification and password recovery requests use generic email actions',
    () async {
      final store = FakeSessionStore();
      ResponseBody genericResponse() => ResponseBody.fromString(
        '{"message":"If the account is eligible, instructions will be sent."}',
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );
      final verificationAdapter = FakeHttpClientAdapter(genericResponse());
      final verificationDio = Dio(BaseOptions(baseUrl: 'http://localhost:8080'))
        ..httpClientAdapter = verificationAdapter;
      final verificationRepository = ApiAuthRepository(
        baseUrl: 'http://localhost:8080',
        sessionStore: store,
        dio: verificationDio,
      );

      await verificationRepository.requestEmailVerification(
        'mobile@example.test',
      );
      expect(
        verificationAdapter.lastRequest?.path,
        '/api/v1/auth/verify/request',
      );
      expect(
        (verificationAdapter.lastRequest?.data
            as Map<String, dynamic>)['email'],
        'mobile@example.test',
      );

      final recoveryAdapter = FakeHttpClientAdapter(genericResponse());
      final recoveryDio = Dio(BaseOptions(baseUrl: 'http://localhost:8080'))
        ..httpClientAdapter = recoveryAdapter;
      final recoveryRepository = ApiAuthRepository(
        baseUrl: 'http://localhost:8080',
        sessionStore: store,
        dio: recoveryDio,
      );
      await recoveryRepository.requestPasswordRecovery('mobile@example.test');
      expect(recoveryAdapter.lastRequest?.path, '/api/v1/auth/password/forgot');
      expect(
        (recoveryAdapter.lastRequest?.data as Map<String, dynamic>)['email'],
        'mobile@example.test',
      );
    },
  );

  test(
    'session restoration sends and rotates the stored refresh cookie',
    () async {
      final store =
          FakeSessionStore()
            ..accessToken = 'expired-access'
            ..refreshCookie = 'slideforge_refresh=old-refresh';
      final adapter = FakeHttpClientAdapter(
        authResponse(
          status: 200,
          accessToken: 'access-2',
          cookie:
              'slideforge_refresh=rotated-refresh; HttpOnly; SameSite=Strict',
        ),
      );
      final dio = Dio(BaseOptions(baseUrl: 'http://localhost:8080'))
        ..httpClientAdapter = adapter;
      final repository = ApiAuthRepository(
        baseUrl: 'http://localhost:8080',
        sessionStore: store,
        dio: dio,
      );

      final session = await repository.restoreSession();

      expect(session?.accessToken, 'access-2');
      expect(adapter.lastRequest?.path, '/api/v1/auth/refresh');
      expect(
        adapter.lastRequest?.headers['Cookie'],
        'slideforge_refresh=old-refresh',
      );
      expect(store.accessToken, 'access-2');
      expect(store.refreshCookie, 'slideforge_refresh=rotated-refresh');
    },
  );

  test(
    'logout sends the refresh cookie then clears local credentials',
    () async {
      final store =
          FakeSessionStore()
            ..accessToken = 'access-3'
            ..refreshCookie = 'slideforge_refresh=refresh-3';
      final adapter = FakeHttpClientAdapter(ResponseBody.fromString('', 204));
      final dio = Dio(BaseOptions(baseUrl: 'http://localhost:8080'))
        ..httpClientAdapter = adapter;
      final repository = ApiAuthRepository(
        baseUrl: 'http://localhost:8080',
        sessionStore: store,
        dio: dio,
      );

      await repository.logout();

      expect(adapter.lastRequest?.path, '/api/v1/auth/logout');
      expect(
        adapter.lastRequest?.headers['Cookie'],
        'slideforge_refresh=refresh-3',
      );
      expect(store.accessToken, isNull);
      expect(store.refreshCookie, isNull);
    },
  );
}
