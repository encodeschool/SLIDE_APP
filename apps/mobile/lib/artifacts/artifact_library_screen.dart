import 'dart:io';

import 'package:flutter/material.dart';
import 'package:eduslides_mobile/i18n/mobile_localizations.dart';
import 'package:path_provider/path_provider.dart';
import 'package:eduslides_mobile/artifacts/artifact_repository.dart';

class ArtifactLibraryScreen extends StatefulWidget {
  const ArtifactLibraryScreen({
    super.key,
    required this.accessToken,
    required this.language,
    required this.repository,
    this.uiLocale = MobileLocalizations.defaultLocale,
  });

  final String accessToken;
  final String language;
  final ArtifactRepository repository;
  final String uiLocale;

  @override
  State<ArtifactLibraryScreen> createState() => _ArtifactLibraryScreenState();
}

class _ArtifactLibraryScreenState extends State<ArtifactLibraryScreen> {
  MobileLocalizations get _strings => MobileLocalizations(widget.uiLocale);
  final _promptController = TextEditingController();
  List<ArtifactSummary> _items = [];
  String _type = 'essay';
  late String _language;
  int _itemCount = 5;
  bool _loading = true;
  bool _generating = false;
  String? _error;

  String _label(String type) => _strings.artifactType(type);

  @override
  void initState() {
    super.initState();
    _language = widget.language;
    _load();
  }

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await widget.repository.list(widget.accessToken);
      if (mounted) setState(() => _items = items);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _draft() async {
    final prompt = _promptController.text.trim();
    if (prompt.isEmpty || _generating) return;
    setState(() {
      _generating = true;
      _error = null;
    });
    try {
      final document = await widget.repository.draft(
        widget.accessToken,
        _type,
        prompt,
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
                uiLocale: widget.uiLocale,
                repository: widget.repository,
                initialDocument: document,
              ),
        ),
      );
      await _load();
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  Future<void> _open(ArtifactSummary item) async {
    try {
      final detail = await widget.repository.read(widget.accessToken, item.id);
      if (!mounted) return;
      await Navigator.of(context).push<void>(
        MaterialPageRoute<void>(
          builder:
              (_) => ArtifactEditorScreen(
                accessToken: widget.accessToken,
                language: detail.language,
                uiLocale: widget.uiLocale,
                repository: widget.repository,
                initialDocument: detail.document,
                savedArtifact: detail,
              ),
        ),
      );
      await _load();
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(_strings.learningDocuments)),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        DropdownButtonFormField<String>(
          initialValue: _type,
          decoration: InputDecoration(labelText: _strings.format),
          items:
              artifactTypes
                  .map(
                    (type) => DropdownMenuItem(
                      value: type,
                      child: Text(_label(type)),
                    ),
                  )
                  .toList(),
          onChanged:
              _generating
                  ? null
                  : (value) => setState(() => _type = value ?? _type),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _language,
          decoration: InputDecoration(labelText: _strings.outputLanguage),
          items: [
            for (final locale in MobileLocalizations.supportedLocales)
              DropdownMenuItem(
                value: locale,
                child: Text(_strings.languageNameFor(locale)),
              ),
          ],
          onChanged:
              _generating
                  ? null
                  : (value) => setState(() => _language = value ?? _language),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<int>(
          initialValue: _itemCount,
          decoration: InputDecoration(
            labelText: '${_strings.outputSize} · ${_sizeUnit(_type)}',
          ),
          items:
              const [3, 5, 8, 10, 15, 20]
                  .map(
                    (count) => DropdownMenuItem(
                      value: count,
                      child: Text('$count ${_sizeUnit(_type)}'),
                    ),
                  )
                  .toList(),
          onChanged:
              _generating
                  ? null
                  : (value) => setState(() => _itemCount = value ?? _itemCount),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _promptController,
          enabled: !_generating,
          minLines: 2,
          maxLines: 5,
          maxLength: 4000,
          decoration: InputDecoration(
            labelText: _strings.describeDocument,
            border: const OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 8),
        Card(
          elevation: 0,
          child: ListTile(
            leading: const Icon(Icons.preview_outlined),
            title: Text(_strings.draftPreview),
            subtitle: Text(
              '${_label(_type)} · ${_languageName(_language)} · $_itemCount ${_sizeUnit(_type)}',
            ),
          ),
        ),
        const SizedBox(height: 8),
        FilledButton.icon(
          onPressed: _generating ? null : _draft,
          icon:
              _generating
                  ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                  : const Icon(Icons.auto_awesome),
          label: Text(
            _generating ? _strings.creatingDraft : _strings.generateDraft,
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(
            _error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
        const SizedBox(height: 24),
        Text(
          _strings.savedDocuments,
          style: Theme.of(context).textTheme.titleLarge,
        ),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (_items.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Text(_strings.noDocuments),
          )
        else
          ..._items.map(
            (item) => Card(
              child: ListTile(
                leading: const Icon(Icons.article_outlined),
                title: Text(item.title),
                subtitle: Text(
                  '${_label(item.type)} · ${_strings.version} ${item.currentVersion}',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => _open(item),
              ),
            ),
          ),
      ],
    ),
  );

  String _sizeUnit(String type) => _strings.artifactSizeUnit(type);

  String _languageName(String language) => _strings.languageNameFor(language);
}

class ArtifactEditorScreen extends StatefulWidget {
  const ArtifactEditorScreen({
    super.key,
    required this.accessToken,
    required this.language,
    required this.repository,
    required this.initialDocument,
    this.uiLocale = MobileLocalizations.defaultLocale,
    this.savedArtifact,
  });

  final String accessToken;
  final String language;
  final ArtifactRepository repository;
  final Map<String, dynamic> initialDocument;
  final String uiLocale;
  final ArtifactDetail? savedArtifact;

  @override
  State<ArtifactEditorScreen> createState() => _ArtifactEditorScreenState();
}

class _ArtifactEditorScreenState extends State<ArtifactEditorScreen> {
  MobileLocalizations get _strings => MobileLocalizations(widget.uiLocale);
  late Map<String, dynamic> _document;
  late final TextEditingController _title;
  late final List<TextEditingController> _headings;
  late final List<TextEditingController> _bodies;
  final Map<String, int> _quizAnswers = {};
  final Map<String, String> _crosswordInputs = {};
  final Map<String, TextEditingController> _crosswordControllers = {};
  ArtifactDetail? _saved;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _document = _copyMap(widget.initialDocument);
    _saved = widget.savedArtifact;
    _title = TextEditingController(text: _document['title'] as String? ?? '');
    final sections = _document['sections'] as List<dynamic>? ?? [];
    _headings =
        sections
            .map(
              (section) => TextEditingController(
                text: (section as Map)['heading'] as String? ?? '',
              ),
            )
            .toList();
    _bodies =
        sections
            .map(
              (section) => TextEditingController(
                text: (section as Map)['body'] as String? ?? '',
              ),
            )
            .toList();
  }

  Map<String, dynamic> _copyMap(Map source) =>
      source.map((key, value) => MapEntry(key.toString(), _copyValue(value)));

  dynamic _copyValue(dynamic value) {
    if (value is Map) return _copyMap(value);
    if (value is List) return value.map(_copyValue).toList();
    return value;
  }

  @override
  void dispose() {
    _title.dispose();
    for (final controller in [..._headings, ..._bodies]) {
      controller.dispose();
    }
    for (final controller in _crosswordControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Map<String, dynamic> _currentDocument() {
    final sections = _document['sections'] as List<dynamic>;
    for (var index = 0; index < sections.length; index++) {
      final section = Map<String, dynamic>.from(sections[index] as Map);
      section['heading'] = _headings[index].text;
      section['body'] = _bodies[index].text;
      sections[index] = section;
    }
    _document['title'] = _title.text;
    return _document;
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final document = _currentDocument();
      final detail =
          _saved == null
              ? await widget.repository.create(
                widget.accessToken,
                document['type'] as String,
                document,
              )
              : await widget.repository.save(
                widget.accessToken,
                _saved!.id,
                _saved!.currentVersion,
                document,
              );
      if (mounted) setState(() => _saved = detail);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _export(String format) async {
    final saved = _saved;
    if (saved == null) return;
    try {
      final bytes = await widget.repository.export(
        widget.accessToken,
        saved.id,
        saved.currentVersion,
        format,
      );
      final directory = await getApplicationDocumentsDirectory();
      final file = File('${directory.path}/${saved.id}.$format');
      await file.writeAsBytes(bytes, flush: true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_strings.savedExport(file.path))),
        );
      }
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    }
  }

  List<Map<String, dynamic>> get _questions =>
      (_document['questions'] as List<dynamic>? ?? [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();

  List<Map<String, dynamic>> get _entries =>
      ((_document['crossword'] as Map?)?['entries'] as List<dynamic>? ?? [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();

  void _editQuizQuestion(int index, String value) {
    final questions = _document['questions'] as List<dynamic>;
    final question = Map<String, dynamic>.from(questions[index] as Map);
    question['question'] = value;
    questions[index] = question;
  }

  void _editQuizOption(int questionIndex, int optionIndex, String value) {
    final questions = _document['questions'] as List<dynamic>;
    final question = Map<String, dynamic>.from(questions[questionIndex] as Map);
    final options = List<dynamic>.from(question['options'] as List);
    options[optionIndex] = value;
    question['options'] = options;
    questions[questionIndex] = question;
  }

  void _editQuizAnswer(int questionIndex, int answerIndex) {
    final questions = _document['questions'] as List<dynamic>;
    final question = Map<String, dynamic>.from(questions[questionIndex] as Map);
    question['answerIndex'] = answerIndex;
    questions[questionIndex] = question;
  }

  void _editEntry(int index, String key, String value) {
    final crossword = Map<String, dynamic>.from(_document['crossword'] as Map);
    final entries = List<dynamic>.from(crossword['entries'] as List);
    entries[index] = {
      ...Map<String, dynamic>.from(entries[index] as Map),
      key: value,
    };
    crossword['entries'] = entries;
    _document['crossword'] = crossword;
  }

  @override
  Widget build(BuildContext context) {
    final type = _document['type'] as String;
    final questions = _questions;
    final entries = _entries;
    return Scaffold(
      appBar: AppBar(title: Text(_strings.editLearningDocument)),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextField(
            controller: _title,
            decoration: InputDecoration(labelText: _strings.title),
          ),
          const SizedBox(height: 12),
          for (var index = 0; index < _headings.length; index++)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  children: [
                    TextField(
                      controller: _headings[index],
                      decoration: InputDecoration(
                        labelText: _strings.sectionHeading,
                      ),
                    ),
                    TextField(
                      controller: _bodies[index],
                      minLines: 3,
                      maxLines: 10,
                      decoration: InputDecoration(
                        labelText: _strings.sectionText,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          if (type == 'quiz') ...[
            Text(
              _strings.interactiveQuiz,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            for (var index = 0; index < questions.length; index++)
              _buildQuestion(context, questions[index], index),
          ],
          if (type == 'crossword') ...[
            Text(
              _strings.interactiveCrossword,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            _buildCrosswordGrid(context, entries),
            for (var index = 0; index < entries.length; index++)
              _buildEntry(entries[index], index),
          ],
          if (_error != null)
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          FilledButton.icon(
            onPressed: _saving ? null : _save,
            icon:
                _saving
                    ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                    : const Icon(Icons.save_outlined),
            label: Text(
              _saved == null ? _strings.saveDocument : _strings.saveNewVersion,
            ),
          ),
          if (_saved != null) ...[
            OutlinedButton.icon(
              onPressed: () => _export('docx'),
              icon: const Icon(Icons.description_outlined),
              label: Text(_strings.saveEditableDocx),
            ),
            OutlinedButton.icon(
              onPressed: () => _export('pdf'),
              icon: const Icon(Icons.picture_as_pdf_outlined),
              label: Text(_strings.savePdf),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildQuestion(
    BuildContext context,
    Map<String, dynamic> question,
    int index,
  ) {
    final id = question['id'] as String;
    final options = List<String>.from(question['options'] as List);
    final answerIndex = question['answerIndex'] as int;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextFormField(
              initialValue: question['question'] as String,
              decoration: InputDecoration(
                labelText: _strings.question(index + 1),
              ),
              onChanged: (value) => _editQuizQuestion(index, value),
            ),
            for (
              var optionIndex = 0;
              optionIndex < options.length;
              optionIndex++
            )
              Semantics(
                selected: _quizAnswers[id] == optionIndex,
                button: true,
                child: ListTile(
                  leading: Icon(
                    _quizAnswers[id] == optionIndex
                        ? Icons.radio_button_checked
                        : Icons.radio_button_unchecked,
                  ),
                  title: Text(options[optionIndex]),
                  onTap: () => setState(() => _quizAnswers[id] = optionIndex),
                ),
              ),
            if (_quizAnswers.containsKey(id))
              Text(
                '${_quizAnswers[id] == answerIndex ? _strings.correct : _strings.tryAgain}'
                '${question['explanation'] is String && (question['explanation'] as String).isNotEmpty ? ' — ${question['explanation']}' : ''}',
              ),
            for (
              var optionIndex = 0;
              optionIndex < options.length;
              optionIndex++
            )
              TextFormField(
                initialValue: options[optionIndex],
                decoration: InputDecoration(
                  labelText: _strings.editOption(optionIndex + 1),
                ),
                onChanged:
                    (value) => _editQuizOption(index, optionIndex, value),
              ),
            DropdownButtonFormField<int>(
              initialValue: answerIndex,
              decoration: InputDecoration(labelText: _strings.correctAnswer),
              items: [
                for (
                  var optionIndex = 0;
                  optionIndex < options.length;
                  optionIndex++
                )
                  DropdownMenuItem(
                    value: optionIndex,
                    child: Text(_strings.option(optionIndex + 1)),
                  ),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() => _editQuizAnswer(index, value));
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCrosswordGrid(
    BuildContext context,
    List<Map<String, dynamic>> entries,
  ) {
    final crossword = Map<String, dynamic>.from(_document['crossword'] as Map);
    final rows = crossword['rows'] as int;
    final columns = crossword['columns'] as int;
    final cells = <String, String>{};
    for (final entry in entries) {
      final answer = (entry['answer'] as String).toUpperCase();
      for (var index = 0; index < answer.length; index++) {
        final row =
            (entry['row'] as int) + (entry['direction'] == 'down' ? index : 0);
        final column =
            (entry['column'] as int) +
            (entry['direction'] == 'across' ? index : 0);
        cells['$row-$column'] = answer[index];
      }
    }
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Column(
            children: [
              for (var row = 0; row < rows; row++)
                Row(
                  children: [
                    for (var column = 0; column < columns; column++)
                      _buildCrosswordCell(row, column, cells['$row-$column']),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCrosswordCell(int row, int column, String? answer) {
    final key = '$row-$column';
    final controller =
        answer == null
            ? null
            : _crosswordControllers.putIfAbsent(
              key,
              () => TextEditingController(text: _crosswordInputs[key] ?? ''),
            );
    return Container(
      width: 31,
      height: 34,
      margin: const EdgeInsets.all(1),
      color: answer == null ? Colors.black87 : Colors.white,
      child:
          answer == null
              ? null
              : TextField(
                controller: controller,
                maxLength: 1,
                textAlign: TextAlign.center,
                decoration: const InputDecoration(
                  counterText: '',
                  contentPadding: EdgeInsets.zero,
                ),
                onChanged:
                    (value) => setState(
                      () => _crosswordInputs[key] = value.toUpperCase(),
                    ),
              ),
    );
  }

  Widget _buildEntry(Map<String, dynamic> entry, int index) {
    final answer = (entry['answer'] as String).toUpperCase();
    final correct = List.generate(answer.length, (offset) {
      final row =
          (entry['row'] as int) + (entry['direction'] == 'down' ? offset : 0);
      final column =
          (entry['column'] as int) +
          (entry['direction'] == 'across' ? offset : 0);
      return _crosswordInputs['$row-$column']?.toUpperCase() == answer[offset];
    }).every((value) => value);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            TextFormField(
              initialValue: entry['clue'] as String,
              decoration: InputDecoration(labelText: _strings.clue(index + 1)),
              onChanged: (value) => _editEntry(index, 'clue', value),
            ),
            TextFormField(
              initialValue: entry['answer'] as String,
              decoration: InputDecoration(labelText: _strings.answerKey),
              onChanged:
                  (value) => _editEntry(index, 'answer', value.toUpperCase()),
            ),
            if (correct) Text(_strings.correct),
          ],
        ),
      ),
    );
  }
}
