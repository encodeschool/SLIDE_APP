import 'dart:math';

import 'package:dio/dio.dart';

class PresentationSummary {
  const PresentationSummary({
    required this.id,
    required this.title,
    required this.language,
    required this.status,
    required this.currentVersion,
    required this.updatedAt,
  });

  final String id;
  final String title;
  final String language;
  final String status;
  final int currentVersion;
  final DateTime updatedAt;

  factory PresentationSummary.fromJson(Map<String, dynamic> json) =>
      PresentationSummary(
        id: json['id'] as String,
        title: json['title'] as String,
        language: json['language'] as String,
        status: json['status'] as String,
        currentVersion: json['currentVersion'] as int,
        updatedAt: DateTime.parse(json['updatedAt'] as String),
      );
}

class PresentationDetail extends PresentationSummary {
  const PresentationDetail({
    required super.id,
    required super.title,
    required super.language,
    required super.status,
    required super.currentVersion,
    required super.updatedAt,
    required this.document,
  });

  final Map<String, dynamic> document;

  factory PresentationDetail.fromJson(Map<String, dynamic> json) =>
      PresentationDetail(
        id: json['id'] as String,
        title: json['title'] as String,
        language: json['language'] as String,
        status: json['status'] as String,
        currentVersion: json['currentVersion'] as int,
        updatedAt: DateTime.parse(json['updatedAt'] as String),
        document: Map<String, dynamic>.from(json['document'] as Map),
      );
}

class PresentationException implements Exception {
  const PresentationException(this.message, {this.code});

  final String message;
  final String? code;

  @override
  String toString() => message;
}

abstract interface class PresentationRepository {
  Future<List<PresentationSummary>> list(String accessToken);
  Future<PresentationDetail> create(
    String accessToken,
    String title,
    String language,
  );
  Future<PresentationDetail> generate(
    String accessToken,
    String prompt,
    String language,
    int slideCount,
  );
  Future<PresentationDetail> read(String accessToken, String presentationId);
  Future<PresentationDetail> save(
    String accessToken,
    String presentationId,
    int expectedVersion,
    Map<String, dynamic> document,
  );
}

class ApiPresentationRepository implements PresentationRepository {
  ApiPresentationRepository({required String baseUrl, Dio? dio})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: baseUrl,
              connectTimeout: const Duration(seconds: 10),
              receiveTimeout: const Duration(seconds: 10),
            ),
          );

  final Dio _dio;

  @override
  Future<List<PresentationSummary>> list(String accessToken) async {
    final response = await _request(
      () => _dio.get<dynamic>(
        '/api/v1/presentations',
        queryParameters: const {'page': 0, 'size': 50},
        options: _authorized(accessToken),
      ),
    );
    final items = (response.data as Map)['items'] as List<dynamic>;
    return items
        .map(
          (item) => PresentationSummary.fromJson(
            Map<String, dynamic>.from(item as Map),
          ),
        )
        .toList();
  }

  @override
  Future<PresentationDetail> create(
    String accessToken,
    String title,
    String language,
  ) async {
    final slideId = _uuid();
    final deck = <String, dynamic>{
      'schemaVersion': 1,
      'id': _uuid(),
      'title': title,
      'language': language,
      'size': {'width': 1280, 'height': 720},
      'slides': [
        {'id': slideId, 'elements': <dynamic>[]},
      ],
    };
    final response = await _request(
      () => _dio.post<dynamic>(
        '/api/v1/presentations',
        data: {'title': title, 'language': language, 'document': deck},
        options: _authorized(accessToken),
      ),
    );
    return PresentationDetail.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
  }

  @override
  Future<PresentationDetail> generate(
    String accessToken,
    String prompt,
    String language,
    int slideCount,
  ) async {
    final response = await _request(
      () => _dio.post<dynamic>(
        '/api/v1/generations',
        data: {
          'prompt': prompt,
          'language': language,
          'slideCount': slideCount,
        },
        options: _authorized(accessToken),
      ),
    );
    var job = Map<String, dynamic>.from(response.data as Map);
    final jobId = job['id'] as String;
    final pollTimer = Stopwatch()..start();
    while (pollTimer.elapsed < const Duration(minutes: 2)) {
      final status = job['status'] as String;
      if (status == 'SUCCEEDED') {
        final document = Map<String, dynamic>.from(job['document'] as Map);
        final created = await _request(
          () => _dio.post<dynamic>(
            '/api/v1/presentations',
            data: {
              'title': document['title'],
              'language': document['language'],
              'document': document,
            },
            options: _authorized(accessToken),
          ),
        );
        return PresentationDetail.fromJson(
          Map<String, dynamic>.from(created.data as Map),
        );
      }
      if (status == 'FAILED') {
        final message = job['failureMessage'];
        throw PresentationException(
          message is String && message.isNotEmpty
              ? message
              : 'AI generation failed. Please try again.',
        );
      }
      await Future<void>.delayed(const Duration(seconds: 1));
      final updated = await _request(
        () => _dio.get<dynamic>(
          '/api/v1/generations/$jobId',
          options: _authorized(accessToken),
        ),
      );
      job = Map<String, dynamic>.from(updated.data as Map);
    }
    throw const PresentationException(
      'Generation is taking longer than expected. Please try again.',
    );
  }

  @override
  Future<PresentationDetail> read(
    String accessToken,
    String presentationId,
  ) async {
    final response = await _request(
      () => _dio.get<dynamic>(
        '/api/v1/presentations/$presentationId',
        options: _authorized(accessToken),
      ),
    );
    return PresentationDetail.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
  }

  @override
  Future<PresentationDetail> save(
    String accessToken,
    String presentationId,
    int expectedVersion,
    Map<String, dynamic> document,
  ) async {
    final response = await _request(
      () => _dio.put<dynamic>(
        '/api/v1/presentations/$presentationId',
        data: {'expectedVersion': expectedVersion, 'document': document},
        options: _authorized(accessToken),
      ),
    );
    return PresentationDetail.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
  }

  Options _authorized(String token) =>
      Options(headers: {'Authorization': 'Bearer $token'});

  Future<Response<dynamic>> _request(
    Future<Response<dynamic>> Function() operation,
  ) async {
    try {
      return await operation();
    } on DioException catch (exception) {
      final data = exception.response?.data;
      final detail = data is Map ? data['detail'] : null;
      final code = data is Map ? data['code'] : null;
      throw PresentationException(
        detail is String && detail.isNotEmpty
            ? detail
            : 'Could not reach the presentation service.',
        code: code is String ? code : null,
      );
    }
  }

  static String _uuid() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex =
        bytes.map((byte) => byte.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-'
        '${hex.substring(16, 20)}-${hex.substring(20)}';
  }
}
