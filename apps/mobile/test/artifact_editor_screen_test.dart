import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:slideforge_mobile/artifacts/artifact_library_screen.dart';
import 'package:slideforge_mobile/artifacts/artifact_repository.dart';

class _FakeArtifactRepository implements ArtifactRepository {
  ArtifactDetail? created;

  @override
  Future<ArtifactDetail> create(
    String accessToken,
    String type,
    Map<String, dynamic> document,
  ) async {
    created = ArtifactDetail(
      id: 'artifact-1',
      type: type,
      title: document['title'] as String,
      language: 'en',
      currentVersion: 1,
      document: document,
    );
    return created!;
  }

  @override
  Future<Map<String, dynamic>> draft(
    String accessToken,
    String type,
    String prompt,
    String language, {
    int itemCount = 5,
  }) async => throw UnimplementedError();

  @override
  Future<Uint8List> export(
    String accessToken,
    String id,
    int version,
    String format,
  ) async => Uint8List(0);

  @override
  Future<List<ArtifactSummary>> list(String accessToken) async => [];

  @override
  Future<ArtifactDetail> read(String accessToken, String id) async => created!;

  @override
  Future<ArtifactDetail> save(
    String accessToken,
    String id,
    int expectedVersion,
    Map<String, dynamic> document,
  ) async => created!;
}

void main() {
  testWidgets('edits, plays, and saves an interactive quiz artifact', (
    tester,
  ) async {
    final repository = _FakeArtifactRepository();
    final document = <String, dynamic>{
      'schemaVersion': 1,
      'id': 'draft',
      'type': 'quiz',
      'title': 'Water quiz',
      'language': 'en',
      'sections': [
        {'id': 's1', 'heading': 'Instructions', 'body': 'Choose one answer.'},
      ],
      'questions': [
        {
          'id': 'q1',
          'question': 'What is H2O?',
          'options': ['Water', 'Oxygen'],
          'answerIndex': 0,
        },
      ],
    };
    await tester.pumpWidget(
      MaterialApp(
        home: ArtifactEditorScreen(
          accessToken: 'test-token',
          language: 'en',
          repository: repository,
          initialDocument: document,
        ),
      ),
    );

    expect(find.text('Interactive quiz'), findsOneWidget);
    await tester.tap(find.widgetWithText(ListTile, 'Water'));
    await tester.pump();
    expect(find.text('Correct!'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Save document'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Save document'));
    await tester.pumpAndSettle();
    expect(repository.created?.currentVersion, 1);
    expect(find.text('Save new version'), findsOneWidget);
  });
}
