import 'package:flutter/material.dart';
import 'package:slideforge_mobile/artifacts/artifact_library_screen.dart';
import 'package:slideforge_mobile/artifacts/artifact_repository.dart';
import 'package:slideforge_mobile/presentations/presentation_editor_screen.dart';
import 'package:slideforge_mobile/presentations/presentation_repository.dart';

class WorkCreatorScreen extends StatefulWidget {
  const WorkCreatorScreen({
    super.key,
    required this.accessToken,
    required this.language,
    required this.isRussian,
    required this.isUzbek,
    required this.presentationRepository,
    required this.artifactRepository,
  });

  final String accessToken;
  final String language;
  final bool isRussian;
  final bool isUzbek;
  final PresentationRepository presentationRepository;
  final ArtifactRepository artifactRepository;

  @override
  State<WorkCreatorScreen> createState() => _WorkCreatorScreenState();
}

class _WorkCreatorScreenState extends State<WorkCreatorScreen> {
  static const _formats = ['slides', ...artifactTypes];
  static const _sizes = [3, 5, 6, 8, 10, 15, 20];
  final _topicController = TextEditingController();
  String _format = 'slides';
  late String _language;
  int _itemCount = 6;
  bool _generating = false;
  String? _error;

  bool get _ru => widget.isRussian;
  bool get _uz => widget.isUzbek;
  String _text(String english, String russian, String uzbek) =>
      _uz
          ? uzbek
          : _ru
          ? russian
          : english;

  @override
  void initState() {
    super.initState();
    _language = widget.language;
  }

  @override
  void dispose() {
    _topicController.dispose();
    super.dispose();
  }

  String _formatName(String format) => switch (format) {
    'slides' => _text('Presentation', 'Презентация', 'Taqdimot'),
    'independent-work' => _text(
      'Independent work',
      'Самостоятельная работа',
      'Mustaqil ish',
    ),
    'coursework' => _text('Coursework', 'Курсовая работа', 'Kurs ishi'),
    'dissertation' => _text('Dissertation', 'Диссертация', 'Dissertatsiya'),
    'research-article' => _text(
      'Research article',
      'Научная статья',
      'Ilmiy maqola',
    ),
    'quiz' => _text('Quiz', 'Тест', 'Test'),
    'crossword' => _text('Crossword', 'Кроссворд', 'Krossvord'),
    'thesis-abstract' => _text('Thesis abstract', 'Тезисы', 'Tezis'),
    'glossary' => _text('Glossary', 'Глоссарий', 'Glossariy'),
    'argumentative-essay' => _text(
      'Argumentative essay',
      'Аргументативное эссе',
      'Argumentativ esse',
    ),
    _ => _text('Essay', 'Эссе', 'Esse'),
  };

  String get _sizeUnit => switch (_format) {
    'slides' => _text('slides', 'слайдов', 'slayd'),
    'quiz' => _text('questions', 'вопросов', 'savol'),
    'crossword' => _text('clues', 'слов', 'topishmoq'),
    'glossary' => _text('terms', 'терминов', 'atama'),
    _ => _text('sections', 'разделов', 'boʻlim'),
  };

  String _languageName(String language) => switch (language) {
    'ru' => 'Русский',
    'uz' => 'Oʻzbekcha',
    _ => 'English',
  };

  Future<void> _generate() async {
    final topic = _topicController.text.trim();
    if (topic.isEmpty || _generating) return;
    setState(() {
      _generating = true;
      _error = null;
    });
    try {
      if (_format == 'slides') {
        final detail = await widget.presentationRepository.generate(
          widget.accessToken,
          topic,
          _language,
          _itemCount,
        );
        if (!mounted) return;
        await Navigator.of(context).push<void>(
          MaterialPageRoute<void>(
            builder:
                (_) => PresentationEditorScreen(
                  detail: detail,
                  accessToken: widget.accessToken,
                  isRussian: _ru,
                  isUzbek: _uz,
                  repository: widget.presentationRepository,
                ),
          ),
        );
      } else {
        final document = await widget.artifactRepository.draft(
          widget.accessToken,
          _format,
          topic,
          _language,
          itemCount: _itemCount,
        );
        if (!mounted) return;
        await Navigator.of(context).push<void>(
          MaterialPageRoute<void>(
            builder:
                (_) => ArtifactEditorScreen(
                  accessToken: widget.accessToken,
                  language: _language,
                  repository: widget.artifactRepository,
                  initialDocument: document,
                ),
          ),
        );
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return PopScope(
      canPop: !_generating,
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            _text('Create with AI', 'Создать с ИИ', 'AI bilan yaratish'),
          ),
        ),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              _text(
                'What are we creating?',
                'Что будем создавать?',
                'Nima tayyorlaymiz?',
              ),
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text(
              _text(
                'Choose a format, describe your topic and preview the scope.',
                'Выберите формат, опишите тему и проверьте объём.',
                'Formatni tanlang, mavzuni yozing va hajmni koʻring.',
              ),
              style: TextStyle(color: colors.onSurfaceVariant),
            ),
            const SizedBox(height: 20),
            DropdownButtonFormField<String>(
              key: const Key('work-format'),
              initialValue: _format,
              decoration: InputDecoration(
                labelText: _text('Format', 'Формат', 'Format'),
              ),
              items:
                  _formats
                      .map(
                        (format) => DropdownMenuItem(
                          value: format,
                          child: Text(_formatName(format)),
                        ),
                      )
                      .toList(),
              onChanged:
                  _generating
                      ? null
                      : (value) => setState(() => _format = value ?? _format),
            ),
            const SizedBox(height: 12),
            TextField(
              key: const Key('work-topic'),
              controller: _topicController,
              enabled: !_generating,
              minLines: 2,
              maxLines: 5,
              maxLength: 4000,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                labelText: _text(
                  'Topic and requirements',
                  'Тема и требования',
                  'Mavzu va talablar',
                ),
                hintText: _text(
                  'For example: renewable energy in cities',
                  'Например: возобновляемая энергетика в городах',
                  'Masalan: shaharlarda qayta tiklanuvchi energiya',
                ),
                border: const OutlineInputBorder(),
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              key: const Key('work-language'),
              initialValue: _language,
              decoration: InputDecoration(
                labelText: _text(
                  'Output language',
                  'Язык результата',
                  'Natija tili',
                ),
              ),
              items: const [
                DropdownMenuItem(value: 'en', child: Text('English')),
                DropdownMenuItem(value: 'ru', child: Text('Русский')),
                DropdownMenuItem(value: 'uz', child: Text('Oʻzbekcha')),
              ],
              onChanged:
                  _generating
                      ? null
                      : (value) =>
                          setState(() => _language = value ?? _language),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<int>(
              key: const Key('work-size'),
              initialValue: _itemCount,
              decoration: InputDecoration(
                labelText: _text(
                  'Output size',
                  'Объём результата',
                  'Natija hajmi',
                ),
              ),
              items:
                  _sizes
                      .map(
                        (size) => DropdownMenuItem(
                          value: size,
                          child: Text('$size $_sizeUnit'),
                        ),
                      )
                      .toList(),
              onChanged:
                  _generating
                      ? null
                      : (value) =>
                          setState(() => _itemCount = value ?? _itemCount),
            ),
            const SizedBox(height: 12),
            Card(
              key: const Key('work-preview'),
              elevation: 0,
              child: ListTile(
                leading: Icon(Icons.preview_outlined, color: colors.primary),
                title: Text(
                  _text(
                    'Draft preview',
                    'Параметры черновика',
                    'Qoralama koʻrinishi',
                  ),
                ),
                subtitle: Text(
                  '${_topicController.text.trim().isEmpty ? _text('Your topic will appear here', 'Здесь появится ваша тема', 'Mavzuingiz shu yerda koʻrinadi') : _topicController.text.trim()}\n'
                  '${_formatName(_format)} · ${_languageName(_language)} · $_itemCount $_sizeUnit',
                ),
                isThreeLine: true,
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                key: const Key('work-creator-error'),
                style: TextStyle(color: colors.error),
              ),
            ],
            const SizedBox(height: 8),
            FilledButton.icon(
              key: const Key('generate-work'),
              onPressed:
                  _generating || _topicController.text.trim().isEmpty
                      ? null
                      : _generate,
              icon:
                  _generating
                      ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                      : const Icon(Icons.auto_awesome),
              label: Text(
                _generating
                    ? _text(
                      'Creating draft…',
                      'Создаём черновик…',
                      'Qoralama yaratilmoqda…',
                    )
                    : _text(
                      'Generate editable draft',
                      'Создать редактируемый черновик',
                      'Tahrirlanadigan qoralama yaratish',
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
