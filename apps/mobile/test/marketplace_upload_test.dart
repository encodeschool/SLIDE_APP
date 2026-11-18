import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:slideforge_mobile/i18n/mobile_localizations.dart';
import 'package:slideforge_mobile/marketplace/marketplace_file_preview_gallery.dart';
import 'package:slideforge_mobile/marketplace/marketplace_upload_listing_dialog.dart';
import 'package:slideforge_mobile/marketplace/marketplace_upload_policy.dart';

void main() {
  test('upload policy matches work-type file restrictions', () {
    expect(
      MarketplaceUploadPolicy.accepts('presentation', 'DECK.PPTX'),
      isTrue,
    );
    expect(MarketplaceUploadPolicy.accepts('design', 'poster.svg'), isTrue);
    expect(MarketplaceUploadPolicy.accepts('other', 'notes.md'), isTrue);
    expect(
      MarketplaceUploadPolicy.accepts('presentation', 'notes.docx'),
      isFalse,
    );
    expect(MarketplaceUploadPolicy.accepts('other', 'archive.exe'), isFalse);
    expect(marketplaceMaximumUploadSizeBytes, 25 * 1024 * 1024);
  });

  test('mobile file preview only exposes the first two raster pages', () {
    final preview = MarketplaceFilePreview.fromJson({
      'totalPages': 5,
      'pages': [
        {'pageNumber': 1, 'imageDataUrl': 'data:image/png;base64,aGVsbG8='},
        {'pageNumber': 2, 'imageDataUrl': 'data:image/png;base64,aGVsbG8='},
        {'pageNumber': 3, 'imageDataUrl': 'data:image/png;base64,aGVsbG8='},
      ],
    });

    expect(preview.pages.map((page) => page.pageNumber), [1, 2]);
    expect(preview.pages.first.imageBytes, 'hello'.codeUnits);
    expect(preview.lockedPageCount, 3);
  });

  test('mobile file preview rejects malformed image payloads', () {
    expect(
      () => MarketplaceFilePreview.fromJson({
        'totalPages': 1,
        'pages': [
          {'pageNumber': 1, 'imageDataUrl': 'javascript:alert(1)'},
        ],
      }),
      throwsFormatException,
    );
  });

  testWidgets('file preview gallery pages are swipeable on a phone viewport', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final preview = MarketplaceFilePreview.fromJson({
      'totalPages': 5,
      'pages': [
        {'pageNumber': 1, 'imageDataUrl': 'data:image/png;base64,aGVsbG8='},
        {'pageNumber': 2, 'imageDataUrl': 'data:image/png;base64,aGVsbG8='},
      ],
    });
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MarketplaceFilePreviewGallery(
            preview: preview,
            localizations: const MobileLocalizations('en'),
          ),
        ),
      ),
    );

    expect(find.text('Page 1 of 5'), findsOneWidget);
    await tester.drag(find.byType(PageView), const Offset(-300, 0));
    await tester.pumpAndSettle();
    expect(find.text('Page 2 of 5'), findsOneWidget);
  });

  testWidgets(
    'upload form updates allowed formats for the selected work type',
    (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MarketplaceUploadListingDialog(
              localizations: const MobileLocalizations('en'),
              categories: const [
                {'slug': 'education', 'name': 'Education'},
              ],
              categoryLabel: (slug) => slug,
            ),
          ),
        ),
      );

      expect(find.byType(Dialog), findsOneWidget);
      expect(find.text('Upload work to sell'), findsOneWidget);
      expect(find.textContaining('.xlsx'), findsOneWidget);
      expect(find.text('Choose file'), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.tap(
        find.byKey(const ValueKey('marketplace-upload-work-type-other')),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Design').last);
      await tester.pumpAndSettle();

      expect(find.textContaining('.svg'), findsOneWidget);
      expect(find.textContaining('.xlsx'), findsNothing);
    },
  );
}
