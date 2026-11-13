import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:slideforge_mobile/auth/app_state_store.dart';

void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));

  const product = <String, dynamic>{
    'listingId': 'listing-1',
    'listingVersionId': 'version-1',
    'title': 'Investor presentation',
    'description': 'A reusable deck',
    'sellerId': 'seller-1',
    'sellerName': 'Studio',
    'version': 1,
    'priceTiyin': 125000,
    'currency': 'UZS',
    'publishedAt': '2026-01-01T00:00:00Z',
    'category': 'business',
    'slideCount': 12,
    'previewSlides': [
      {
        'slideNumber': 1,
        'title': 'Plan',
        'text': ['A clear starting point'],
        'backgroundColor': '#ffffff',
        'accentColor': '#7354d6',
      },
    ],
  };

  test('versioned cart state is validated and excludes unknown fields', () {
    final state = MobileAppState.fromJson({
      'version': MobileAppState.storageVersion,
      'cartItems': [
        {
          ...product,
          'accessToken': 'must-not-persist',
          'paymentCard': 'private',
        },
        {'listingId': 'incomplete', 'title': 'Invalid'},
      ],
      'marketplaceSection': 1,
      'checkoutStep': 2,
      'workspaceTab': 1,
      'locale': 'ru',
    });

    expect(state.cartItems, hasLength(1));
    expect(state.cartItems.single['listingId'], 'listing-1');
    expect(state.marketplaceSection, 1);
    expect(state.checkoutStep, 2);
    expect(state.locale, 'ru');
    expect(state.cartItems.single['slideCount'], 12);
    expect(
      (state.cartItems.single['previewSlides'] as List).length,
      lessThanOrEqualTo(3),
    );
    final serialized = state.toJson();
    expect(serialized['version'], MobileAppState.storageVersion);
    expect(serialized['cartItems'].toString(), isNot(contains('accessToken')));
    expect(serialized['cartItems'].toString(), isNot(contains('paymentCard')));
  });

  test(
    'unknown schema versions and invalid checkout state fall back safely',
    () {
      final state = MobileAppState.fromJson({
        'version': 999,
        'cartItems': [product],
        'marketplaceSection': 999,
        'checkoutStep': 2,
        'workspaceTab': -5,
        'locale': 'invalid',
      });

      expect(state.cartItems, isEmpty);
      expect(state.marketplaceSection, 0);
      expect(state.checkoutStep, 0);
      expect(state.workspaceTab, 0);
      expect(state.locale, 'en');
    },
  );

  test(
    'legacy navigation state migrates to the four web-aligned destinations',
    () {
      final oldHome = MobileAppState.fromJson({
        'version': 1,
        'workspaceTab': 2,
        'marketplaceSection': 0,
      });
      final oldCart = MobileAppState.fromJson({
        'version': 1,
        'workspaceTab': 1,
        'marketplaceSection': 1,
      });

      expect(oldHome.workspaceTab, 0);
      expect(oldCart.workspaceTab, 1);
      expect(oldCart.marketplaceSection, 1);
    },
  );

  test(
    'malformed cart elements are discarded without blocking valid state',
    () {
      final state = MobileAppState.fromJson({
        'version': MobileAppState.storageVersion,
        'cartItems': [
          product,
          {...product, 'priceTiyin': -1},
          {...product, 'currency': 'invalid'},
        ],
        'marketplaceSection': 1,
        'checkoutStep': 1,
      });

      expect(state.cartItems, hasLength(1));
      expect(state.checkoutStep, 1);
    },
  );

  test('malformed stored JSON returns usable default app state', () async {
    const key = 'slideforge.mobile_app_state';
    const storage = FlutterSecureStorage();
    await storage.write(key: key, value: '{not-json');

    final state = await DeviceMobileAppStateStore(storage).read();

    expect(state.cartItems, isEmpty);
    expect(state.checkoutStep, 0);
    expect(state.locale, 'en');
  });
}
