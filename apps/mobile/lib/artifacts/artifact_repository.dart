import 'dart:typed_data';

import 'package:dio/dio.dart';

const artifactTypes = <String>[
  'essay',
  'independent-work',
  'coursework',
  'dissertation',
  'research-article',
  'quiz',
  'crossword',
  'thesis-abstract',
  'glossary',
  'argumentative-essay',
];

class ArtifactSummary {
  const ArtifactSummary({
    required this.id,
    required this.type,
    required this.title,
    required this.language,
    required this.currentVersion,
  });

  final String id;
  final String type;
  final String title;
  final String language;
  final int currentVersion;

  factory ArtifactSummary.fromJson(Map<String, dynamic> json) =>
      ArtifactSummary(
        id: json['id'] as String,
        type: json['type'] as String,
        title: json['title'] as String,
        language: json['language'] as String,
        currentVersion: json['currentVersion'] as int,
      );
}

class ArtifactDetail extends ArtifactSummary {
  const ArtifactDetail({
    required super.id,
    required super.type,
    required super.title,
    required super.language,
    required super.currentVersion,
    required this.document,
  });

  final Map<String, dynamic> document;

  factory ArtifactDetail.fromJson(Map<String, dynamic> json) => ArtifactDetail(
    id: json['id'] as String,
    type: json['type'] as String,
    title: json['title'] as String,
    language: json['language'] as String,
    currentVersion: json['currentVersion'] as int,
    document: Map<String, dynamic>.from(json['document'] as Map),
  );
}

class ArtifactException implements Exception {
  const ArtifactException(this.message, {this.code});
  final String message;
  final String? code;
  @override
  String toString() => message;
}

abstract interface class ArtifactRepository {
  Future<List<ArtifactSummary>> list(String accessToken);
  Future<Map<String, dynamic>> draft(
    String accessToken,
    String type,
    String prompt,
    String language, {
    int itemCount = 5,
  });
  Future<ArtifactDetail> create(
    String accessToken,
    String type,
    Map<String, dynamic> document,
  );
  Future<ArtifactDetail> read(String accessToken, String id);
  Future<ArtifactDetail> save(
    String accessToken,
    String id,
    int expectedVersion,
    Map<String, dynamic> document,
  );
  Future<Uint8List> export(
    String accessToken,
    String id,
    int version,
    String format,
  );
}

class ApiArtifactRepository implements ArtifactRepository {
  ApiArtifactRepository({required String baseUrl, Dio? dio})
    : _dio = dio ?? Dio(BaseOptions(baseUrl: baseUrl));

  final Dio _dio;

  Options _authorized(String token) =>
      Options(headers: {'Authorization': 'Bearer $token'});

  Future<Response<dynamic>> _request(
    Future<Response<dynamic>> Function() operation,
  ) async {
    try {
      return await operation();
    } on DioException catch (exception) {
      final data = exception.response?.data;
      final message = data is Map ? data['detail'] : null;
      final code = data is Map ? data['code'] : null;
      throw ArtifactException(
        message is String && message.isNotEmpty
            ? message
            : 'Could not reach the learning document service.',
        code: code is String ? code : null,
      );
    }
  }

  @override
  Future<List<ArtifactSummary>> list(String accessToken) async {
    final response = await _request(
      () => _dio.get<dynamic>(
        '/api/v1/artifacts',
        queryParameters: const {'page': 0, 'size': 50},
        options: _authorized(accessToken),
      ),
    );
    final items = (response.data as Map)['items'] as List<dynamic>;
    return items
        .map(
          (item) =>
              ArtifactSummary.fromJson(Map<String, dynamic>.from(item as Map)),
        )
        .toList();
  }

  @override
  Future<Map<String, dynamic>> draft(
    String accessToken,
    String type,
    String prompt,
    String language, {
    int itemCount = 5,
  }) async {
    final response = await _request(
      () => _dio.post<dynamic>(
        '/api/v1/artifacts/draft',
        data: {
          'type': type,
          'prompt': prompt,
          'language': language,
          'itemCount': itemCount,
        },
        options: _authorized(accessToken),
      ),
    );
    return Map<String, dynamic>.from((response.data as Map)['document'] as Map);
  }

  @override
  Future<ArtifactDetail> create(
    String accessToken,
    String type,
    Map<String, dynamic> document,
  ) async {
    final response = await _request(
      () => _dio.post<dynamic>(
        '/api/v1/artifacts',
        data: {
          'type': type,
          'title': document['title'],
          'language': document['language'],
          'document': document,
        },
        options: _authorized(accessToken),
      ),
    );
    return ArtifactDetail.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
  }

  @override
  Future<ArtifactDetail> read(String accessToken, String id) async {
    final response = await _request(
      () => _dio.get<dynamic>(
        '/api/v1/artifacts/$id',
        options: _authorized(accessToken),
      ),
    );
    return ArtifactDetail.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
  }

  @override
  Future<ArtifactDetail> save(
    String accessToken,
    String id,
    int expectedVersion,
    Map<String, dynamic> document,
  ) async {
    final response = await _request(
      () => _dio.put<dynamic>(
        '/api/v1/artifacts/$id',
        data: {'expectedVersion': expectedVersion, 'document': document},
        options: _authorized(accessToken),
      ),
    );
    return ArtifactDetail.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
  }

  @override
  Future<Uint8List> export(
    String accessToken,
    String id,
    int version,
    String format,
  ) async {
    final response = await _request(
      () => _dio.get<List<int>>(
        '/api/v1/artifacts/$id/exports/$format',
        queryParameters: {'version': version},
        options: _authorized(
          accessToken,
        ).copyWith(responseType: ResponseType.bytes),
      ),
    );
    return Uint8List.fromList(response.data ?? const []);
  }
}
