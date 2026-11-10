import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:slideforge_mobile/auth/auth_repository.dart';
import 'package:slideforge_mobile/main.dart';
import 'package:slideforge_mobile/presentations/presentation_repository.dart';

class FakeAuthRepository implements AuthRepository {
  AuthSession? restoredSession;
  String? registeredEmail;

  AuthSession _session(String email, String locale) => AuthSession(
    user: AuthUser(
      id: 'user-1',
      email: email,
      displayName: 'Slideforge User',
      locale: locale,
      roles: const ['USER'],
    ),
    accessToken: 'test-access-token',
  );

  @override
  Future<AuthSession?> restoreSession() async => restoredSession;

  @override
  Future<AuthSession> login(String email, String password) async =>
      _session(email, 'en');

  @override
  Future<void> register(
    String email,
    String password,
    String displayName,
    String locale,
  ) async {
    registeredEmail = email;
  }

  @override
  Future<void> requestEmailVerification(String email) async {}

  @override
  Future<void> requestPasswordRecovery(String email) async {}

  Future<void> loginAfterRegistration() async {
    restoredSession = _session(registeredEmail!, 'en');
  }

  @override
  Future<void> logout() async {
    restoredSession = null;
  }
}

class DelayedAuthRepository extends FakeAuthRepository {
  final Completer<AuthSession?> restoreCompleter = Completer<AuthSession?>();

  @override
  Future<AuthSession?> restoreSession() => restoreCompleter.future;
}

class FakePresentationRepository implements PresentationRepository {
  List<PresentationSummary> presentations = [];
  bool failList = false;
  PresentationException? saveError;
  PresentationDetail? latestDetail;
  int listCalls = 0;
  int readCalls = 0;
  Map<String, dynamic>? savedDocument;
  int saveCalls = 0;
  final List<int> expectedVersions = [];

  PresentationDetail _detail(
    String title, {
    int version = 1,
    bool withText = true,
  }) => PresentationDetail(
    id: 'presentation-1',
    title: title,
    language: 'en',
    status: 'DRAFT',
    currentVersion: version,
    updatedAt: DateTime.utc(2026, 1, 1),
    document: {
      'schemaVersion': 1,
      'id': 'presentation-1',
      'title': title,
      'language': 'en',
      'size': {'width': 1280, 'height': 720},
      'slides': [
        {
          'id': 'slide-1',
          'elements':
              withText
                  ? <dynamic>[
                    {
                      'id': 'text-1',
                      'type': 'text',
                      'x': 64,
                      'y': 80,
                      'w': 1000,
                      'h': 120,
                      'text': 'Original slide text',
                    },
                  ]
                  : <dynamic>[],
        },
      ],
    },
  );

  PresentationSummary summary(String title) => PresentationSummary(
    id: 'presentation-1',
    title: title,
    language: 'en',
    status: 'DRAFT',
    currentVersion: 1,
    updatedAt: DateTime.utc(2026, 1, 1),
  );

  @override
  Future<List<PresentationSummary>> list(String accessToken) async {
    listCalls++;
    if (failList) throw const PresentationException('list failed');
    return presentations;
  }

  @override
  Future<PresentationDetail> create(
    String accessToken,
    String title,
    String language,
  ) async {
    final detail = _detail(title, withText: false);
    presentations = [detail, ...presentations];
    return detail;
  }

  @override
  Future<PresentationDetail> read(
    String accessToken,
    String presentationId,
  ) async {
    readCalls++;
    return latestDetail ?? _detail('Saved deck');
  }

  @override
  Future<PresentationDetail> save(
    String accessToken,
    String presentationId,
    int expectedVersion,
    Map<String, dynamic> document,
  ) async {
    saveCalls++;
    final error = saveError;
    if (error != null) throw error;
    expectedVersions.add(expectedVersion);
    savedDocument = document;
    return PresentationDetail(
      id: 'presentation-1',
      title: document['title'] as String,
      language: 'en',
      status: 'DRAFT',
      currentVersion: expectedVersion + 1,
      updatedAt: DateTime.utc(2026, 1, 1),
      document: Map<String, dynamic>.from(document),
    );
  }
}

void main() {
  testWidgets('shop is the first screen and auth switches language', (
    tester,
  ) async {
    final repository = DelayedAuthRepository();
    await tester.pumpWidget(SlideforgeApp(authRepository: repository));
    expect(find.text('Presentation marketplace'), findsOneWidget);
    expect(find.byKey(const Key('auth-screen')), findsNothing);
    expect(find.text('Demo catalog · sample presentations'), findsOneWidget);
    expect(find.text('Investor pitch deck'), findsOneWidget);
    repository.restoreCompleter.complete(null);
    await tester.pumpAndSettle();

    expect(find.text('Presentation marketplace'), findsOneWidget);
    await tester.tap(find.text('Account'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sign in or create an account'));
    await tester.pumpAndSettle();

    expect(find.text('Your ideas, in their best light.'), findsOneWidget);
    await tester.tap(find.byTooltip('Switch language'));
    await tester.pumpAndSettle();

    expect(find.text('Ваши идеи в лучшем свете.'), findsOneWidget);
  });

  testWidgets('demo shop displays sample products in two columns', (
    tester,
  ) async {
    await tester.pumpWidget(
      SlideforgeApp(
        authRepository: FakeAuthRepository(),
        presentationRepository: FakePresentationRepository(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Demo catalog · sample presentations'), findsOneWidget);
    expect(find.text('Investor pitch deck'), findsOneWidget);
    final grid = tester.widget<GridView>(
      find.byKey(const ValueKey('market-product-grid')),
    );
    final delegate =
        grid.gridDelegate as SliverGridDelegateWithFixedCrossAxisCount;
    expect(delegate.crossAxisCount, 2);
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('market-product-grid')),
        matching: find.byType(Card),
      ),
      findsNWidgets(10),
    );
    final loadMore = find.text('Load 10 more');
    await tester.scrollUntilVisible(
      loadMore,
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.tap(loadMore);
    await tester.pumpAndSettle();
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('market-product-grid')),
        matching: find.byType(Card),
      ),
      findsNWidgets(12),
    );
    expect(find.text('Customer journey map'), findsOneWidget);
  }, skip: !const bool.fromEnvironment('MARKETPLACE_DEMO'));

  testWidgets('guest checkout returns to payment after cancelling sign-in', (
    tester,
  ) async {
    await tester.pumpWidget(
      SlideforgeApp(
        authRepository: FakeAuthRepository(),
        presentationRepository: FakePresentationRepository(),
      ),
    );
    await tester.pumpAndSettle();

    final addToCart = find.byTooltip('Add to cart').first;
    await tester.ensureVisible(addToCart);
    await tester.pumpAndSettle();
    await tester.tap(addToCart);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cart'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue to checkout'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue to payment'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sign in to continue'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('auth-screen')), findsOneWidget);
    await tester.tap(find.byTooltip('Back to shop'));
    await tester.pumpAndSettle();

    expect(find.text('Payment'), findsOneWidget);
    expect(find.text('Sign in to continue'), findsOneWidget);
  }, skip: !const bool.fromEnvironment('MARKETPLACE_DEMO'));

  testWidgets(
    'registration requests verification and returns to sign in without creating a session',
    (tester) async {
      final repository = FakeAuthRepository();
      await tester.pumpWidget(
        SlideforgeApp(
          authRepository: repository,
          presentationRepository: FakePresentationRepository(),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Account'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Sign in or create an account'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('auth-mode-switch')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('display-name-field')),
        'Mobile User',
      );
      await tester.enterText(
        find.byKey(const Key('email-field')),
        'mobile@example.test',
      );
      await tester.enterText(
        find.byKey(const Key('password-field')),
        'mobile-test-password',
      );
      await tester.tap(find.byKey(const Key('auth-submit')));
      await tester.pumpAndSettle();

      expect(repository.registeredEmail, 'mobile@example.test');
      expect(find.byKey(const Key('auth-screen')), findsOneWidget);
      expect(
        find.text(
          'If eligible, verification instructions will be sent to your email.',
        ),
        findsOneWidget,
      );
      expect(find.text('My presentations'), findsNothing);
    },
  );

  testWidgets('restores an existing session into the workspace', (
    tester,
  ) async {
    final repository =
        FakeAuthRepository()
          ..restoredSession = const AuthSession(
            user: AuthUser(
              id: 'user-2',
              email: 'returning@example.test',
              displayName: 'Returning User',
              locale: 'en',
              roles: ['USER'],
            ),
            accessToken: 'restored-access-token',
          );
    final presentations =
        FakePresentationRepository()
          ..presentations = [
            FakePresentationRepository().summary('A saved deck'),
          ];
    await tester.pumpWidget(
      SlideforgeApp(
        authRepository: repository,
        presentationRepository: presentations,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('returning@example.test'), findsOneWidget);
    expect(find.text('My presentations'), findsOneWidget);
    expect(find.text('A saved deck'), findsOneWidget);
    await tester.tap(find.byTooltip('Switch language'));
    await tester.pumpAndSettle();
    expect(find.text('Мои презентации'), findsOneWidget);
    expect(find.text('Создать презентацию'), findsOneWidget);
    await tester.tap(find.text('A saved deck'));
    await tester.pumpAndSettle();
    expect(presentations.readCalls, 1);
    expect(find.text('Редактор презентации'), findsOneWidget);
  });

  testWidgets('library shows an empty state and refreshes the list', (
    tester,
  ) async {
    final repository = FakePresentationRepository();
    await tester.pumpWidget(
      SlideforgeApp(
        authRepository:
            FakeAuthRepository()
              ..restoredSession = const AuthSession(
                user: AuthUser(
                  id: 'user-1',
                  email: 'person@example.test',
                  displayName: 'Person',
                  locale: 'en',
                  roles: ['USER'],
                ),
                accessToken: 'access-token',
              ),
        presentationRepository: repository,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('No presentations yet'), findsOneWidget);
    await tester.tap(find.byTooltip('Refresh'));
    await tester.pumpAndSettle();
    expect(repository.listCalls, 2);
  });

  testWidgets(
    'library creates and opens a deck, then saves title and slide text',
    (tester) async {
      final presentations = FakePresentationRepository();
      await tester.pumpWidget(
        SlideforgeApp(
          authRepository:
              FakeAuthRepository()
                ..restoredSession = const AuthSession(
                  user: AuthUser(
                    id: 'user-1',
                    email: 'person@example.test',
                    displayName: 'Person',
                    locale: 'en',
                    roles: ['USER'],
                  ),
                  accessToken: 'access-token',
                ),
          presentationRepository: presentations,
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('create-presentation')));
      await tester.pumpAndSettle();
      expect(find.text('Presentation editor'), findsOneWidget);

      await tester.enterText(
        find.byKey(const Key('editor-title-field')),
        'Updated mobile title',
      );
      await tester.enterText(
        find.byKey(const Key('editor-slide-text-field')),
        'Useful slide content',
      );
      await tester.tap(find.byKey(const Key('save-presentation')));
      await tester.pumpAndSettle();

      expect(presentations.saveCalls, 1);
      expect(presentations.savedDocument?['title'], 'Updated mobile title');
      final slides = presentations.savedDocument?['slides'] as List<dynamic>;
      final elements = (slides.first as Map)['elements'] as List<dynamic>;
      expect((elements.first as Map)['text'], 'Useful slide content');
      expect(find.text('Changes saved'), findsOneWidget);

      await tester.enterText(
        find.byKey(const Key('editor-slide-text-field')),
        'Second edit',
      );
      await tester.tap(find.byKey(const Key('save-presentation')));
      await tester.pumpAndSettle();
      expect(presentations.expectedVersions, [1, 2]);
      expect(find.text('Version 3'), findsOneWidget);
    },
  );

  testWidgets('mobile editor adds, switches, removes, and saves slides', (
    tester,
  ) async {
    final presentations = FakePresentationRepository();
    await tester.pumpWidget(
      SlideforgeApp(
        authRepository:
            FakeAuthRepository()
              ..restoredSession = const AuthSession(
                user: AuthUser(
                  id: 'user-1',
                  email: 'person@example.test',
                  displayName: 'Person',
                  locale: 'en',
                  roles: ['USER'],
                ),
                accessToken: 'access-token',
              ),
        presentationRepository: presentations,
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('create-presentation')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('add-slide')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('editor-slide-text-field')),
      'Second slide content',
    );
    await tester.tap(find.byKey(const Key('slide-tab-1')));
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('editor-slide-text-field')))
          .controller!
          .text,
      '',
    );
    await tester.enterText(
      find.byKey(const Key('editor-slide-text-field')),
      'First slide content',
    );
    await tester.tap(find.byKey(const Key('slide-tab-2')));
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('editor-slide-text-field')))
          .controller!
          .text,
      'Second slide content',
    );
    await tester.tap(find.byKey(const Key('save-presentation')));
    await tester.pumpAndSettle();

    final savedSlides = presentations.savedDocument?['slides'] as List<dynamic>;
    expect(savedSlides, hasLength(2));
    expect(
      ((savedSlides[0] as Map)['elements'] as List).first['text'],
      'First slide content',
    );
    expect(
      ((savedSlides[1] as Map)['elements'] as List).first['text'],
      'Second slide content',
    );

    await tester.tap(find.byKey(const Key('move-slide-up')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('save-presentation')));
    await tester.pumpAndSettle();
    final reorderedSlides =
        presentations.savedDocument?['slides'] as List<dynamic>;
    expect(
      ((reorderedSlides.first as Map)['elements'] as List).first['text'],
      'Second slide content',
    );

    await tester.tap(find.byKey(const Key('remove-slide')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('slide-tab-2')), findsNothing);
    await tester.tap(find.byKey(const Key('save-presentation')));
    await tester.pumpAndSettle();
    expect(
      presentations.savedDocument?['slides'] as List<dynamic>,
      hasLength(1),
    );
  });

  testWidgets(
    'mobile editor adds styled text and persists text and background colors',
    (tester) async {
      final presentations = FakePresentationRepository();
      await tester.pumpWidget(
        SlideforgeApp(
          authRepository:
              FakeAuthRepository()
                ..restoredSession = const AuthSession(
                  user: AuthUser(
                    id: 'user-1',
                    email: 'person@example.test',
                    displayName: 'Person',
                    locale: 'en',
                    roles: ['USER'],
                  ),
                  accessToken: 'access-token',
                ),
          presentationRepository: presentations,
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('create-presentation')));
      await tester.pumpAndSettle();

      final scrollable = find.byType(Scrollable).last;
      final addTitle = find.byKey(const Key('add-title-text'));
      await tester.scrollUntilVisible(addTitle, 250, scrollable: scrollable);
      await tester.tap(addTitle);
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('editor-slide-text-field')),
        'A styled heading',
      );

      final fontSize = find.byKey(const Key('font-size-control'));
      await tester.scrollUntilVisible(fontSize, 250, scrollable: scrollable);
      await tester.enterText(fontSize, '38');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();
      final fontFamily = find.byKey(const Key('font-family-control'));
      await tester.scrollUntilVisible(fontFamily, 250, scrollable: scrollable);
      await tester.tap(fontFamily);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Georgia').last);
      await tester.pumpAndSettle();
      final bold = find.byKey(const Key('bold-text'));
      await tester.scrollUntilVisible(bold, 250, scrollable: scrollable);
      expect(tester.widget<IconButton>(bold).onPressed, isNotNull);
      await tester.tap(bold);
      await tester.pumpAndSettle();
      await tester.tap(bold);
      await tester.pumpAndSettle();
      final italic = find.byKey(const Key('italic-text'));
      await tester.scrollUntilVisible(italic, 250, scrollable: scrollable);
      await tester.tap(italic);
      await tester.pumpAndSettle();
      final underline = find.byKey(const Key('underline-text'));
      await tester.scrollUntilVisible(underline, 250, scrollable: scrollable);
      await tester.tap(underline);
      await tester.pumpAndSettle();

      final textColor = find.byKey(const Key('text-color-control'));
      await tester.scrollUntilVisible(textColor, 250, scrollable: scrollable);
      await tester.tap(textColor);
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('color-option-#1976D2')));
      await tester.pumpAndSettle();

      final backgroundControl = find.byKey(
        const Key('slide-background-control'),
      );
      await tester.scrollUntilVisible(
        backgroundControl,
        250,
        scrollable: scrollable,
      );
      await tester.tap(backgroundControl);
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('color-option-#D84343')));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('save-presentation')));
      await tester.pumpAndSettle();
      final slide =
          (presentations.savedDocument?['slides'] as List).first as Map;
      expect((slide['background'] as Map)['color'], '#D84343');
      final text = (slide['elements'] as List).cast<Map>().singleWhere(
        (element) => element['text'] == 'A styled heading',
      );
      final style = text['style'] as Map;
      expect(style['fontSize'], 38.0);
      expect(style['fontFamily'], 'Georgia');
      expect(style['fontWeight'], 700);
      expect(style['italic'], isTrue);
      expect(style['underline'], isTrue);
      expect(style['color'], '#1976D2');
    },
  );

  testWidgets('mobile editor can reload after a version conflict', (
    tester,
  ) async {
    final presentations =
        FakePresentationRepository()
          ..saveError = const PresentationException(
            'Presentation changed since it was opened; reload before saving',
            code: 'VERSION_CONFLICT',
          )
          ..latestDetail = PresentationDetail(
            id: 'presentation-1',
            title: 'Latest server title',
            language: 'en',
            status: 'DRAFT',
            currentVersion: 4,
            updatedAt: DateTime.utc(2026, 1, 2),
            document: {
              'schemaVersion': 1,
              'id': 'presentation-1',
              'title': 'Latest server title',
              'language': 'en',
              'size': {'width': 1280, 'height': 720},
              'slides': [
                {
                  'id': 'latest-slide',
                  'elements': [
                    {
                      'id': 'latest-text',
                      'type': 'text',
                      'x': 64,
                      'y': 80,
                      'w': 1000,
                      'h': 120,
                      'text': 'Latest server content',
                    },
                  ],
                },
              ],
            },
          );
    await tester.pumpWidget(
      SlideforgeApp(
        authRepository:
            FakeAuthRepository()
              ..restoredSession = const AuthSession(
                user: AuthUser(
                  id: 'user-1',
                  email: 'person@example.test',
                  displayName: 'Person',
                  locale: 'en',
                  roles: ['USER'],
                ),
                accessToken: 'access-token',
              ),
        presentationRepository: presentations,
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('create-presentation')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('editor-slide-text-field')),
      'My stale content',
    );
    await tester.tap(find.byKey(const Key('save-presentation')));
    await tester.pumpAndSettle();

    expect(find.textContaining('reload before saving'), findsOneWidget);
    final reloadButton = find.byKey(const Key('reload-latest-version'));
    await tester.scrollUntilVisible(
      reloadButton,
      300,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.tap(reloadButton);
    await tester.pumpAndSettle();

    expect(presentations.readCalls, 1);
    expect(find.text('Version 4'), findsOneWidget);
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('editor-title-field')))
          .controller!
          .text,
      'Latest server title',
    );
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('editor-slide-text-field')))
          .controller!
          .text,
      'Latest server content',
    );
  });

  testWidgets('library shows a localized error and retry control', (
    tester,
  ) async {
    final repository = FakePresentationRepository()..failList = true;
    await tester.pumpWidget(
      SlideforgeApp(
        authRepository:
            FakeAuthRepository()
              ..restoredSession = const AuthSession(
                user: AuthUser(
                  id: 'user-1',
                  email: 'person@example.test',
                  displayName: 'Person',
                  locale: 'ru',
                  roles: ['USER'],
                ),
                accessToken: 'access-token',
              ),
        presentationRepository: repository,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Не удалось загрузить презентации.'), findsOneWidget);
    expect(find.text('Повторить'), findsOneWidget);
  });
}
