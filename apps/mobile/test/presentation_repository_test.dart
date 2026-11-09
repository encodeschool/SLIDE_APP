import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:slideforge_mobile/presentations/presentation_repository.dart';

class FakeHttpClientAdapter implements HttpClientAdapter {
  FakeHttpClientAdapter(this.responses);

  final List<ResponseBody> responses;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    return responses.removeAt(0);
  }

  @override
  void close({bool force = false}) {}
}

Map<String, dynamic> detailJson({int version = 1}) => {
  'id': 'presentation-1',
  'title': 'A mobile deck',
  'language': 'en',
  'status': 'DRAFT',
  'currentVersion': version,
  'createdAt': '2026-01-01T00:00:00Z',
  'updatedAt': '2026-01-01T00:00:00Z',
  'document': {
    'schemaVersion': 1,
    'id': 'presentation-1',
    'title': 'A mobile deck',
    'language': 'en',
    'size': {'width': 1280, 'height': 720},
    'slides': [
      {'id': 'slide-1', 'elements': <dynamic>[]},
    ],
  },
};

ResponseBody jsonResponse(Object body, {int status = 200}) =>
    ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );

void main() {
  test(
    'list sends the bearer token and parses the paginated response',
    () async {
      final adapter = FakeHttpClientAdapter([
        jsonResponse({
          'items': [
            {
              'id': 'presentation-1',
              'title': 'A mobile deck',
              'language': 'en',
              'status': 'DRAFT',
              'currentVersion': 2,
              'createdAt': '2026-01-01T00:00:00Z',
              'updatedAt': '2026-01-02T00:00:00Z',
            },
          ],
          'page': 0,
          'size': 50,
          'total': 1,
        }),
      ]);
      final dio = Dio(BaseOptions(baseUrl: 'http://localhost:8080'))
        ..httpClientAdapter = adapter;
      final repository = ApiPresentationRepository(
        baseUrl: 'http://localhost:8080',
        dio: dio,
      );

      final items = await repository.list('mobile-token');

      expect(items.single.title, 'A mobile deck');
      expect(items.single.currentVersion, 2);
      expect(adapter.requests.single.path, '/api/v1/presentations');
      expect(adapter.requests.single.queryParameters, {'page': 0, 'size': 50});
      expect(
        adapter.requests.single.headers['Authorization'],
        'Bearer mobile-token',
      );
    },
  );

  test(
    'create posts a valid blank canonical deck with the selected language',
    () async {
      final adapter = FakeHttpClientAdapter([
        jsonResponse(detailJson(), status: 201),
      ]);
      final dio = Dio(BaseOptions(baseUrl: 'http://localhost:8080'))
        ..httpClientAdapter = adapter;
      final repository = ApiPresentationRepository(
        baseUrl: 'http://localhost:8080',
        dio: dio,
      );

      await repository.create('mobile-token', 'A mobile deck', 'ru');

      final request = adapter.requests.single;
      final body = request.data as Map<String, dynamic>;
      final document = body['document'] as Map<String, dynamic>;
      final slide = (document['slides'] as List<dynamic>).single as Map;
      expect(request.method, 'POST');
      expect(request.headers['Authorization'], 'Bearer mobile-token');
      expect(body['title'], 'A mobile deck');
      expect(body['language'], 'ru');
      expect(document['schemaVersion'], 1);
      expect(document['language'], 'ru');
      expect(document['size'], {'width': 1280, 'height': 720});
      expect(slide['id'], isNotEmpty);
      expect(slide['elements'], isEmpty);
    },
  );

  test(
    'read and save use the detail route and expected version payload',
    () async {
      final adapter = FakeHttpClientAdapter([
        jsonResponse(detailJson()),
        jsonResponse(detailJson(version: 2)),
      ]);
      final dio = Dio(BaseOptions(baseUrl: 'http://localhost:8080'))
        ..httpClientAdapter = adapter;
      final repository = ApiPresentationRepository(
        baseUrl: 'http://localhost:8080',
        dio: dio,
      );
      final detail = await repository.read('mobile-token', 'presentation-1');
      final saved = await repository.save(
        'mobile-token',
        detail.id,
        1,
        detail.document,
      );

      expect(adapter.requests[0].path, '/api/v1/presentations/presentation-1');
      expect(adapter.requests[1].method, 'PUT');
      expect(
        (adapter.requests[1].data as Map<String, dynamic>)['expectedVersion'],
        1,
      );
      expect(
        adapter.requests[1].headers['Authorization'],
        'Bearer mobile-token',
      );
      expect(saved.currentVersion, 2);
    },
  );

  test(
    'API problem details are surfaced as a presentation exception',
    () async {
      final adapter = FakeHttpClientAdapter([
        jsonResponse({
          'detail': 'The presentation was not found.',
        }, status: 404),
      ]);
      final dio = Dio(BaseOptions(baseUrl: 'http://localhost:8080'))
        ..httpClientAdapter = adapter;
      final repository = ApiPresentationRepository(
        baseUrl: 'http://localhost:8080',
        dio: dio,
      );

      await expectLater(
        repository.read('mobile-token', 'missing'),
        throwsA(
          isA<PresentationException>().having(
            (error) => error.message,
            'message',
            'The presentation was not found.',
          ),
        ),
      );
    },
  );
}
