import 'package:flutter_test/flutter_test.dart';
import 'package:slideforge_mobile/i18n/mobile_localizations.dart';
import 'package:slideforge_mobile/marketplace/marketplace_demo_data.dart';

void main() {
  test('locale normalization and cycling use Uzbek as the default', () {
    expect(MobileLocalizations.normalize(null), 'uz');
    expect(MobileLocalizations.normalize('invalid'), 'uz');
    expect(MobileLocalizations.nextLocale('uz'), 'en');
    expect(MobileLocalizations.nextLocale('en'), 'ru');
    expect(MobileLocalizations.nextLocale('ru'), 'uz');
  });

  test('Uzbek UI strings use 2026 Latin orthography', () {
    const uzbek = MobileLocalizations('uz');
    expect(uzbek.learningDocuments, 'Öquv hujjatlari');
    expect(uzbek.artifactType('glossary'), 'Atamalar luğati');
    expect(
      uzbek.text('', '', 'shahar choy Oʻzbekiston gʻalaba'),
      'şahar çoy Özbekiston ğalaba',
    );
    expect(
      MobileLocalizations.canonicalizeUzbek("o'zbekiston G’oya"),
      'özbekiston Ğoya',
    );
    for (final apostrophe in ['ʻ', 'ʼ', '‘', '’', "'", '`', '´']) {
      expect(
        MobileLocalizations.canonicalizeUzbek(
          'o${apostrophe}z g${apostrophe}oya',
        ),
        'öz ğoya',
      );
    }
    expect(
      getMarketplaceDemoProducts(false, true)[4]['title'],
      'Çoraklik biznes hisoboti',
    );
  });

  test('English and Russian remain selectable for existing preferences', () {
    expect(const MobileLocalizations('en').languageName, 'English');
    expect(const MobileLocalizations('ru').languageName, 'Русский');
    expect(const MobileLocalizations('uz').languageName, 'Özbekça');
    expect(
      const MobileLocalizations('en').text('sh ch Oʻ', '', ''),
      'sh ch Oʻ',
    );
    expect(const MobileLocalizations('ru').text('', 'Ш ш Ч ч', ''), 'Ш ш Ч ч');
  });
}
