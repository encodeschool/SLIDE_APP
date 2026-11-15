/// Locale selection and mobile UI copy shared by the Flutter client.
///
/// API data and authored document content are deliberately not passed through
/// this class; it is only for interface text.
class MobileLocalizations {
  const MobileLocalizations(String locale)
    : locale = locale == 'en' || locale == 'ru' ? locale : 'uz';

  static const supportedLocales = ['en', 'ru', 'uz'];
  static const defaultLocale = 'uz';

  final String locale;

  bool get isRussian => locale == 'ru';
  bool get isUzbek => locale == 'uz';

  static String normalize(String? locale) =>
      supportedLocales.contains(locale) ? locale! : defaultLocale;

  static String nextLocale(String locale) => switch (normalize(locale)) {
    'uz' => 'en',
    'en' => 'ru',
    _ => 'uz',
  };

  static MobileLocalizations fromFlags({
    required bool isRussian,
    required bool isUzbek,
  }) => MobileLocalizations(
    isUzbek
        ? 'uz'
        : isRussian
        ? 'ru'
        : 'en',
  );

  String text(String english, String russian, String uzbek) => switch (locale) {
    'ru' => russian,
    'uz' => canonicalizeUzbek(uzbek),
    _ => english,
  };

  /// Applies the requested Uzbek 2026 Latin orthography to owned UI copy.
  ///
  /// This is used only for localized interface/catalog labels, never for API
  /// responses, generated text, or user-authored content.
  static String canonicalizeUzbek(String value) {
    var result = value.replaceAllMapped(
      RegExp(r"[Oo][ʻʼ‘’'`´]"),
      (match) => match[0]!.startsWith('O') ? 'Ö' : 'ö',
    );
    result = result.replaceAllMapped(
      RegExp(r"[Gg][ʻʼ‘’'`´]"),
      (match) => match[0]!.startsWith('G') ? 'Ğ' : 'ğ',
    );
    return result
        .replaceAll('Sh', 'Ş')
        .replaceAll('sh', 'ş')
        .replaceAll('Ch', 'Ç')
        .replaceAll('ch', 'ç');
  }

  String get languageName => switch (locale) {
    'ru' => 'Русский',
    'uz' => 'Özbekça',
    _ => 'English',
  };

  String languageNameFor(String code) => MobileLocalizations(code).languageName;

  String artifactType(String type) => switch (type) {
    'slides' => text('Presentation', 'Презентация', 'Taqdimot'),
    'independent-work' => text(
      'Independent work',
      'Самостоятельная работа',
      'Mustaqil ish',
    ),
    'coursework' => text('Coursework', 'Курсовая работа', 'Kurs ishi'),
    'research-article' => text(
      'Research article',
      'Научная статья',
      'Ilmiy maqola',
    ),
    'thesis-abstract' => text('Thesis abstract', 'Тезисы', 'Tezis'),
    'argumentative-essay' => text(
      'Argumentative essay',
      'Аргументативное эссе',
      'Munozarali esse',
    ),
    'essay' => text('Essay', 'Эссе', 'Esse'),
    'quiz' => text('Quiz', 'Тест', 'Test'),
    'crossword' => text('Crossword', 'Кроссворд', 'Krossvord'),
    'glossary' => text('Glossary', 'Глоссарий', 'Atamalar lugʻati'),
    'dissertation' => text('Dissertation', 'Диссертация', 'Dissertatsiya'),
    _ => type,
  };

  String artifactSizeUnit(String type) => switch (type) {
    'quiz' => text('questions', 'вопросов', 'savol'),
    'crossword' => text('clues', 'слов', 'topishmoq'),
    'glossary' => text('terms', 'терминов', 'atama'),
    'slides' => text('slides', 'слайдов', 'slayd'),
    _ => text('sections', 'разделов', 'boʻlim'),
  };

  String get learningDocuments =>
      text('Learning documents', 'Учебные материалы', 'Oʻquv hujjatlari');
  String get format => text('Format', 'Формат', 'Hujjat turi');
  String get outputLanguage =>
      text('Output language', 'Язык результата', 'Natija tili');
  String get outputSize => text('Output size', 'Размер результата', 'Hajmi');
  String get version => text('version', 'версия', 'versiya');
  String get describeDocument => text(
    'Describe the document you need',
    'Опишите нужный вам документ',
    'Kerakli hujjatni tavsiflang',
  );
  String get draftPreview =>
      text('Draft preview', 'Предварительный просмотр', 'Qoralama koʻrinishi');
  String get creatingDraft =>
      text('Creating draft…', 'Создание черновика…', 'Qoralama yaratilmoqda…');
  String get generateDraft => text(
    'Generate editable draft',
    'Создать черновик для редактирования',
    'Tahrirlanadigan qoralama yaratish',
  );
  String get savedDocuments =>
      text('Saved documents', 'Сохранённые документы', 'Saqlangan hujjatlar');
  String get noDocuments => text(
    'No learning documents yet.',
    'Учебных материалов пока нет.',
    'Hozircha oʻquv hujjatlari yoʻq.',
  );
  String get editLearningDocument => text(
    'Edit learning document',
    'Редактировать учебный материал',
    'Oʻquv hujjatini tahrirlash',
  );
  String get title => text('Title', 'Название', 'Sarlavha');
  String get sectionHeading =>
      text('Section heading', 'Заголовок раздела', 'Boʻlim sarlavhasi');
  String get sectionText =>
      text('Section text', 'Текст раздела', 'Boʻlim matni');
  String get interactiveQuiz =>
      text('Interactive quiz', 'Интерактивный тест', 'Interaktiv test');
  String get interactiveCrossword => text(
    'Interactive crossword',
    'Интерактивный кроссворд',
    'Interaktiv krossvord',
  );
  String get saveDocument =>
      text('Save document', 'Сохранить документ', 'Hujjatni saqlash');
  String get saveNewVersion => text(
    'Save new version',
    'Сохранить новую версию',
    'Yangi versiyani saqlash',
  );
  String get saveEditableDocx => text(
    'Save editable DOCX',
    'Сохранить DOCX для редактирования',
    'Tahrirlanadigan DOCX faylini saqlash',
  );
  String get savePdf =>
      text('Save PDF', 'Сохранить PDF', 'PDF faylini saqlash');
  String get correct => text('Correct!', 'Правильно!', 'Toʻgʻri!');
  String get tryAgain =>
      text('Try again', 'Попробуйте ещё раз', 'Qayta urinib koʻring');
  String get correctAnswer =>
      text('Correct answer', 'Правильный ответ', 'Toʻgʻri javob');
  String get hexColor => text('Hex color', 'Цвет HEX', 'HEX rang');

  String question(int number) =>
      text('Question $number', 'Вопрос $number', '$number-savol');

  String editOption(int number) => text(
    'Edit option $number',
    'Изменить вариант $number',
    '$number-variantni tahrirlash',
  );

  String option(int number) =>
      text('Option $number', 'Вариант $number', '$number-variant');

  String clue(int number) =>
      text('Clue $number', 'Подсказка $number', '$number-topishmoq');

  String get answerKey => text('Answer key', 'Ключ ответа', 'Javob kaliti');

  String get exportSaved =>
      text('Saved export to', 'Экспорт сохранён в', 'Eksport fayli saqlandi:');

  String savedExport(String path) => text(
    'Saved export to $path',
    'Экспорт сохранён в $path',
    'Eksport fayli saqlandi: $path',
  );
}
