import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class MobileAppState {
  static const storageVersion = 2;

  const MobileAppState({
    this.cartItems = const [],
    this.marketplaceSection = 0,
    this.checkoutStep = 0,
    this.workspaceTab = 0,
    this.locale = 'en',
    this.localeIsSaved = false,
  });

  final List<Map<String, dynamic>> cartItems;
  final int marketplaceSection;
  final int checkoutStep;
  final int workspaceTab;
  final String locale;
  final bool localeIsSaved;

  factory MobileAppState.fromJson(Map<String, dynamic> json) {
    final version = json['version'];
    if (version != 1 && version != storageVersion) {
      return const MobileAppState();
    }
    final cart = json['cartItems'];
    final items =
        cart is List
            ? cart
                .whereType<Map>()
                .take(50)
                .map(_sanitizeCartItem)
                .whereType<Map<String, dynamic>>()
                .toList()
            : <Map<String, dynamic>>[];
    final section = _boundedInt(json['marketplaceSection'], 0, 2);
    final step = items.isEmpty ? 0 : _boundedInt(json['checkoutStep'], 0, 2);
    final locale = json['locale'];
    final savedWorkspaceTab = _boundedInt(
      json['workspaceTab'],
      0,
      version == 1 ? 2 : 3,
      fallback: version == 1 ? 2 : 0,
    );
    final workspaceTab =
        version == 1
            ? (savedWorkspaceTab == 0 || savedWorkspaceTab == 1 ? 1 : 0)
            : savedWorkspaceTab;
    return MobileAppState(
      cartItems: items,
      marketplaceSection: section,
      checkoutStep: step,
      workspaceTab: workspaceTab,
      locale:
          locale is String && const {'en', 'ru', 'uz'}.contains(locale)
              ? locale
              : 'en',
      localeIsSaved:
          locale is String && const {'en', 'ru', 'uz'}.contains(locale),
    );
  }

  Map<String, dynamic> toJson() => {
    'version': storageVersion,
    'cartItems':
        cartItems
            .take(50)
            .map(_sanitizeCartItem)
            .whereType<Map<String, dynamic>>()
            .toList(),
    'marketplaceSection': marketplaceSection,
    'checkoutStep': cartItems.isEmpty ? 0 : checkoutStep,
    'workspaceTab': workspaceTab,
    'locale': locale,
  };

  static int _boundedInt(Object? value, int min, int max, {int fallback = 0}) {
    final parsed = value is num && value.isFinite ? value.toInt() : fallback;
    return parsed.clamp(min, max).toInt();
  }

  static Map<String, dynamic>? _sanitizeCartItem(Map item) {
    final listingId = item['listingId'];
    final listingVersionId = item['listingVersionId'];
    final title = item['title'];
    final sellerId = item['sellerId'];
    final sellerName = item['sellerName'];
    final version = item['version'];
    final price = item['priceTiyin'];
    final currency = item['currency'];
    final publishedAt = item['publishedAt'];
    final category = item['category'];
    final slideCount = item['slideCount'];
    if (listingId is! String ||
        listingId.isEmpty ||
        listingId.length > 120 ||
        listingVersionId is! String ||
        listingVersionId.isEmpty ||
        listingVersionId.length > 120 ||
        title is! String ||
        title.isEmpty ||
        title.length > 300 ||
        sellerId is! String ||
        sellerId.length > 120 ||
        sellerName is! String ||
        sellerName.length > 200 ||
        version is! int ||
        version < 1 ||
        price is! num ||
        !price.isFinite ||
        price < 0 ||
        price != price.roundToDouble() ||
        price > 9007199254740991 ||
        currency is! String ||
        !RegExp(r'^[A-Z]{3}$').hasMatch(currency) ||
        publishedAt is! String ||
        publishedAt.length > 80 ||
        category is! String ||
        category.length > 100) {
      return null;
    }

    final sanitized = <String, dynamic>{
      'listingId': listingId,
      'listingVersionId': listingVersionId,
      'title': title,
      'description':
          item['description'] is String
              ? (item['description'] as String).substring(
                0,
                (item['description'] as String).length.clamp(0, 4000).toInt(),
              )
              : '',
      'sellerId': sellerId,
      'sellerName': sellerName,
      'version': version,
      'priceTiyin': price,
      'currency': currency,
      'publishedAt': publishedAt,
      'category': category,
    };
    if (slideCount is num &&
        slideCount.isFinite &&
        slideCount >= 0 &&
        slideCount == slideCount.roundToDouble()) {
      sanitized['slideCount'] = slideCount;
    }
    final slides = item['previewSlides'];
    if (slides is List) {
      sanitized['previewSlides'] =
          slides
              .take(3)
              .whereType<Map>()
              .map(_sanitizePreviewSlide)
              .whereType<Map<String, dynamic>>()
              .toList();
    }
    return sanitized;
  }

  static Map<String, dynamic>? _sanitizePreviewSlide(Map slide) {
    final number = slide['slideNumber'];
    final title = slide['title'];
    final text = slide['text'];
    final background = slide['backgroundColor'];
    final accent = slide['accentColor'];
    if (number is! int ||
        title is! String ||
        text is! List ||
        !text.every((line) => line is String) ||
        background is! String ||
        accent is! String) {
      return null;
    }
    return {
      'slideNumber': number,
      'title': title.substring(0, title.length.clamp(0, 300).toInt()),
      'text':
          text
              .take(20)
              .map(
                (line) => line.substring(0, line.length.clamp(0, 1000).toInt()),
              )
              .toList(),
      'backgroundColor': background.substring(
        0,
        background.length.clamp(0, 32).toInt(),
      ),
      'accentColor': accent.substring(0, accent.length.clamp(0, 32).toInt()),
    };
  }
}

abstract interface class MobileAppStateStore {
  Future<MobileAppState> read();
  Future<void> write(MobileAppState state);
}

/// Stores non-secret app state using the same device-secure storage used for
/// the refresh session, without putting credentials in ordinary preferences.
class DeviceMobileAppStateStore implements MobileAppStateStore {
  DeviceMobileAppStateStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage();

  static const _stateKey = 'slideforge.mobile_app_state';
  final FlutterSecureStorage _storage;

  @override
  Future<MobileAppState> read() async {
    try {
      final raw = await _storage.read(key: _stateKey);
      if (raw == null) return const MobileAppState();
      final decoded = Map<String, dynamic>.from(jsonDecode(raw) as Map);
      if (decoded['version'] != MobileAppState.storageVersion) {
        return const MobileAppState();
      }
      return MobileAppState.fromJson(decoded);
    } catch (_) {
      return const MobileAppState();
    }
  }

  @override
  Future<void> write(MobileAppState state) async {
    try {
      await _storage.write(key: _stateKey, value: jsonEncode(state.toJson()));
    } catch (_) {
      // Persistence is best-effort; unavailable storage must not block the UI.
    }
  }
}
