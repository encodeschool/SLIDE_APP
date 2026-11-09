import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:slideforge_mobile/presentations/presentation_repository.dart';

class PresentationEditorScreen extends StatefulWidget {
  const PresentationEditorScreen({
    super.key,
    required this.detail,
    required this.accessToken,
    required this.isRussian,
    required this.repository,
  });

  final PresentationDetail detail;
  final String accessToken;
  final bool isRussian;
  final PresentationRepository repository;

  @override
  State<PresentationEditorScreen> createState() =>
      _PresentationEditorScreenState();
}

class _PresentationEditorScreenState extends State<PresentationEditorScreen> {
  static const _fontFamilies = ['Arial', 'Georgia', 'Times New Roman', 'Roboto'];
  static const _palette = [
    '#242A28',
    '#FFFFFF',
    '#1976D2',
    '#D84343',
    '#388E3C',
    '#F9A825',
    '#7B1FA2',
    '#00897B',
  ];

  late final TextEditingController _titleController;
  late final TextEditingController _bodyController;
  late final TextEditingController _fontSizeController;
  late Map<String, dynamic> _document;
  late int _currentVersion;
  int _selectedSlideIndex = 0;
  String? _selectedElementId;
  bool _isSaving = false;
  bool _isReloading = false;
  bool _versionConflict = false;
  String? _error;
  String? _savedMessage;

  bool get _ru => widget.isRussian;
  List<dynamic> get _slides => _document['slides'] as List<dynamic>;
  Map<String, dynamic> get _activeSlide =>
      Map<String, dynamic>.from(_slides[_selectedSlideIndex] as Map);
  List<Map<String, dynamic>> get _elements =>
      (_activeSlide['elements'] as List<dynamic>)
          .map((element) => Map<String, dynamic>.from(element as Map))
          .toList();
  List<Map<String, dynamic>> get _textElements =>
      _elements.where((element) => element['type'] == 'text').toList();
  Map<String, dynamic>? get _selectedText {
    for (final element in _textElements) {
      if (element['id'] == _selectedElementId) return element;
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
    _document = Map<String, dynamic>.from(widget.detail.document);
    _currentVersion = widget.detail.currentVersion;
    _titleController = TextEditingController(text: widget.detail.title);
    _bodyController = TextEditingController();
    _fontSizeController = TextEditingController();
    _selectInitialText();
  }

  void _selectInitialText() {
    final first = _textElements.firstOrNull;
    _selectedElementId = first?['id'] as String?;
    _syncTextControls();
  }

  void _syncTextControls() {
    final selected = _selectedText;
    _bodyController.text = selected?['text'] as String? ?? '';
    final style = selected?['style'] as Map? ?? const {};
    _fontSizeController.text = '${style['fontSize'] ?? 32}';
  }

  String _newId(String prefix) =>
      'mobile-$prefix-${DateTime.now().microsecondsSinceEpoch}-${Random.secure().nextInt(1 << 32)}';

  void _commitText() {
    final selectedId = _selectedElementId;
    final slides = List<dynamic>.from(_slides);
    final slide = Map<String, dynamic>.from(slides[_selectedSlideIndex] as Map);
    final elements = (slide['elements'] as List<dynamic>)
        .map((element) => Map<String, dynamic>.from(element as Map))
        .toList();
    final selectedIndex = elements.indexWhere(
      (element) => element['id'] == selectedId && element['type'] == 'text',
    );
    if (selectedIndex >= 0) {
      elements[selectedIndex]['text'] = _bodyController.text;
    } else if (_bodyController.text.trim().isNotEmpty) {
      final size = Map<String, dynamic>.from(_document['size'] as Map);
      elements.add(_newTextElement(
        size,
        text: _bodyController.text,
        preset: 'paragraph',
      ));
      _selectedElementId = elements.last['id'] as String;
    }
    slide['elements'] = elements;
    slides[_selectedSlideIndex] = slide;
    _document = {..._document, 'slides': slides};
  }

  Map<String, dynamic> _newTextElement(
    Map<String, dynamic> size, {
    String text = '',
    required String preset,
  }) {
    final width = (size['width'] as num).toDouble();
    final height = (size['height'] as num).toDouble();
    final (fontSize, fontWeight, y, elementHeight) = switch (preset) {
      'title' => (52, 700, height * 0.13, height * 0.26),
      'heading' => (40, 700, height * 0.18, height * 0.22),
      'icon' => (64, 700, height * 0.28, height * 0.3),
      _ => (28, 400, height * 0.34, height * 0.48),
    };
    return {
      'id': _newId('text'),
      'type': 'text',
      'x': width * 0.06,
      'y': y,
      'w': width * 0.88,
      'h': elementHeight,
      'text': text,
      'style': {
        'fontFamily': 'Arial',
        'fontSize': fontSize,
        'fontWeight': fontWeight,
        'color': '#242A28',
        'align': 'left',
      },
    };
  }

  void _updateSelectedTextStyle(Map<String, dynamic> changes) {
    _commitText();
    final selectedId = _selectedElementId;
    final slides = List<dynamic>.from(_slides);
    final slide = Map<String, dynamic>.from(slides[_selectedSlideIndex] as Map);
    final elements = (slide['elements'] as List<dynamic>)
        .map((element) => Map<String, dynamic>.from(element as Map))
        .toList();
    final index = elements.indexWhere((element) => element['id'] == selectedId);
    if (index < 0) return;
    final element = elements[index];
    element['style'] = <String, dynamic>{
      if (element['style'] is Map) ...element['style'] as Map,
      ...changes,
    };
    elements[index] = element;
    slide['elements'] = elements;
    slides[_selectedSlideIndex] = slide;
    setState(() {
      _document = {..._document, 'slides': slides};
      _syncTextControls();
      _savedMessage = null;
    });
  }

  void _selectTextElement(String id) {
    if (_selectedElementId == id) return;
    _commitText();
    setState(() {
      _selectedElementId = id;
      _syncTextControls();
      _savedMessage = null;
    });
  }

  void _selectSlide(int index) {
    if (index == _selectedSlideIndex || index < 0 || index >= _slides.length) {
      return;
    }
    _commitText();
    setState(() {
      _selectedSlideIndex = index;
      _selectInitialText();
      _error = null;
      _savedMessage = null;
    });
  }

  void _addSlide() {
    if (_slides.length >= 150) return;
    _commitText();
    setState(() {
      final slides = List<dynamic>.from(_slides)
        ..add({'id': _newId('slide'), 'elements': <dynamic>[]});
      _document = {..._document, 'slides': slides};
      _selectedSlideIndex = slides.length - 1;
      _selectedElementId = null;
      _syncTextControls();
      _error = null;
      _savedMessage = null;
    });
  }

  void _removeSlide() {
    if (_slides.length <= 1) return;
    _commitText();
    setState(() {
      final slides = List<dynamic>.from(_slides)
        ..removeAt(_selectedSlideIndex);
      _document = {..._document, 'slides': slides};
      _selectedSlideIndex = min(_selectedSlideIndex, slides.length - 1);
      _selectInitialText();
      _error = null;
      _savedMessage = null;
    });
  }

  void _moveSlide(int offset) {
    final target = _selectedSlideIndex + offset;
    if (target < 0 || target >= _slides.length) return;
    _commitText();
    setState(() {
      final slides = List<dynamic>.from(_slides);
      final slide = slides.removeAt(_selectedSlideIndex);
      slides.insert(target, slide);
      _document = {..._document, 'slides': slides};
      _selectedSlideIndex = target;
      _error = null;
      _savedMessage = null;
    });
  }

  void _addTextPreset(String preset, {String text = ''}) {
    _commitText();
    final slides = List<dynamic>.from(_slides);
    final slide = Map<String, dynamic>.from(slides[_selectedSlideIndex] as Map);
    final elements = (slide['elements'] as List<dynamic>)
        .map((element) => Map<String, dynamic>.from(element as Map))
        .toList();
    if (elements.length >= 100) return;
    final element = _newTextElement(
      Map<String, dynamic>.from(_document['size'] as Map),
      text: text,
      preset: preset,
    );
    elements.add(element);
    slide['elements'] = elements;
    slides[_selectedSlideIndex] = slide;
    setState(() {
      _document = {..._document, 'slides': slides};
      _selectedElementId = element['id'] as String;
      _syncTextControls();
      _savedMessage = null;
    });
  }

  Future<void> _addImage() async {
    try {
      final image = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 2400,
        maxHeight: 2400,
        imageQuality: 88,
      );
      if (image == null || !mounted) return;
      final bytes = await image.readAsBytes();
      if (bytes.length > 3 * 1024 * 1024) {
        setState(
          () => _error = _ru
              ? 'Изображение слишком большое (максимум 3 МБ).'
              : 'Image is too large (maximum 3 MB).',
        );
        return;
      }
      _commitText();
      final slides = List<dynamic>.from(_slides);
      final slide = Map<String, dynamic>.from(slides[_selectedSlideIndex] as Map);
      final elements = (slide['elements'] as List<dynamic>)
          .map((element) => Map<String, dynamic>.from(element as Map))
          .toList();
      if (elements.length >= 100) return;
      final mime = switch (image.mimeType) {
        'image/png' => 'image/png',
        'image/webp' => 'image/webp',
        'image/gif' => 'image/gif',
        _ => 'image/jpeg',
      };
      final size = Map<String, dynamic>.from(_document['size'] as Map);
      final width = (size['width'] as num).toDouble();
      final height = (size['height'] as num).toDouble();
      elements.add({
        'id': _newId('image'),
        'type': 'image',
        'x': width * 0.2,
        'y': height * 0.25,
        'w': width * 0.6,
        'h': height * 0.5,
        'dataUri': 'data:$mime;base64,${base64Encode(bytes)}',
        'alt': image.name,
      });
      slide['elements'] = elements;
      slides[_selectedSlideIndex] = slide;
      final updatedDocument = {..._document, 'slides': slides};
      if (utf8.encode(jsonEncode(updatedDocument)).length > 5 * 1024 * 1024) {
        setState(
          () => _error = _ru
              ? 'Размер презентации превышает лимит сервера 5 МБ.'
              : 'The presentation exceeds the server 5 MB limit.',
        );
        return;
      }
      setState(() {
        _document = updatedDocument;
        _savedMessage = null;
        _error = null;
      });
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = _ru
              ? 'Не удалось добавить изображение.'
              : 'Could not add the image.',
        );
      }
    }
  }

  void _setBackground(String color) {
    final slides = List<dynamic>.from(_slides);
    final slide = Map<String, dynamic>.from(slides[_selectedSlideIndex] as Map);
    slide['background'] = <String, dynamic>{'color': color};
    slides[_selectedSlideIndex] = slide;
    setState(() {
      _document = {..._document, 'slides': slides};
      _savedMessage = null;
    });
  }

  Future<void> _chooseColor({
    required String title,
    required String initialColor,
    required ValueChanged<String> onSelected,
  }) async {
    final controller = TextEditingController(text: initialColor);
    final chosen = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: _palette
                  .map(
                    (color) => InkWell(
                      key: Key('color-option-$color'),
                      onTap: () => Navigator.pop(context, color),
                      child: CircleAvatar(
                        backgroundColor: _color(color),
                        radius: 17,
                        child: color == initialColor
                            ? const Icon(Icons.check, size: 18)
                            : null,
                      ),
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 12),
            TextField(
              key: const Key('custom-color-field'),
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Hex color',
                hintText: '#336699',
              ),
              textCapitalization: TextCapitalization.characters,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(_ru ? 'Отмена' : 'Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final value = controller.text.trim();
              if (RegExp(r'^#[0-9a-fA-F]{6}$').hasMatch(value)) {
                Navigator.pop(context, value.toUpperCase());
              }
            },
            child: Text(_ru ? 'Применить' : 'Apply'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (chosen != null) onSelected(chosen);
  }

  Color _color(String value, {Color fallback = const Color(0xff242a28)}) {
    final normalized = value.replaceFirst('#', '');
    if (!RegExp(r'^[0-9a-fA-F]{6}$').hasMatch(normalized)) return fallback;
    return Color(int.parse('ff$normalized', radix: 16));
  }

  Map<String, dynamic> _documentWithEdits(String title) {
    _commitText();
    return {..._document, 'title': title};
  }

  Future<void> _save() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      setState(
        () => _error = _ru
            ? 'Введите название презентации.'
            : 'Enter a presentation title.',
      );
      return;
    }
    setState(() {
      _isSaving = true;
      _error = null;
      _versionConflict = false;
      _savedMessage = null;
    });
    try {
      final updatedDocument = _documentWithEdits(title);
      final saved = await widget.repository.save(
        widget.accessToken,
        widget.detail.id,
        _currentVersion,
        updatedDocument,
      );
      if (!mounted) return;
      setState(() {
        _document = Map<String, dynamic>.from(saved.document);
        _currentVersion = saved.currentVersion;
        _selectedSlideIndex = min(_selectedSlideIndex, _slides.length - 1);
        _titleController.text = saved.title;
        _selectInitialText();
        _savedMessage = _ru ? 'Изменения сохранены' : 'Changes saved';
      });
    } on PresentationException catch (exception) {
      if (mounted) {
        setState(() {
          _error = exception.message;
          _versionConflict = exception.code == 'VERSION_CONFLICT';
        });
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = _ru
              ? 'Не удалось сохранить изменения. Попробуйте ещё раз.'
              : 'Could not save changes. Please try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _reloadLatest() async {
    setState(() {
      _isReloading = true;
      _error = null;
    });
    try {
      final latest = await widget.repository.read(
        widget.accessToken,
        widget.detail.id,
      );
      if (!mounted) return;
      setState(() {
        _document = Map<String, dynamic>.from(latest.document);
        _currentVersion = latest.currentVersion;
        _selectedSlideIndex = min(_selectedSlideIndex, _slides.length - 1);
        _titleController.text = latest.title;
        _selectInitialText();
        _versionConflict = false;
        _savedMessage = _ru
            ? 'Загружена последняя версия. Несохранённые изменения удалены.'
            : 'Latest version loaded. Unsaved changes were discarded.';
      });
    } on PresentationException catch (exception) {
      if (mounted) setState(() => _error = exception.message);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = _ru
              ? 'Не удалось загрузить последнюю версию.'
              : 'Could not load the latest version.',
        );
      }
    } finally {
      if (mounted) setState(() => _isReloading = false);
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _bodyController.dispose();
    _fontSizeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final textElements = _textElements;
    final selected = _selectedText;
    final style = selected?['style'] as Map? ?? const {};
    final background = _activeSlide['background'] as Map? ?? const {};
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_ru ? 'Редактор презентации' : 'Presentation editor'),
            Text(
              _ru ? 'Версия $_currentVersion' : 'Version $_currentVersion',
              style: Theme.of(context).textTheme.labelSmall,
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            key: const Key('save-presentation'),
            onPressed: _isSaving ? null : _save,
            icon: _isSaving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.save_outlined),
            label: Text(_ru ? 'Сохранить' : 'Save'),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
            TextField(
              key: const Key('editor-title-field'),
              controller: _titleController,
              maxLength: 200,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                labelText: _ru ? 'Название презентации' : 'Presentation title',
                border: const OutlineInputBorder(),
              ),
            ),
            Row(
              children: [
                Expanded(
                  child: Text(
                    _ru ? 'Слайды' : 'Slides',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                IconButton(
                  key: const Key('move-slide-up'),
                  tooltip: _ru ? 'Переместить раньше' : 'Move slide earlier',
                  onPressed: _selectedSlideIndex > 0 ? () => _moveSlide(-1) : null,
                  icon: const Icon(Icons.arrow_upward),
                ),
                IconButton(
                  key: const Key('move-slide-down'),
                  tooltip: _ru ? 'Переместить позже' : 'Move slide later',
                  onPressed: _selectedSlideIndex < _slides.length - 1
                      ? () => _moveSlide(1)
                      : null,
                  icon: const Icon(Icons.arrow_downward),
                ),
                IconButton(
                  key: const Key('remove-slide'),
                  tooltip: _ru ? 'Удалить слайд' : 'Remove slide',
                  onPressed: _slides.length > 1 ? _removeSlide : null,
                  icon: const Icon(Icons.remove_circle_outline),
                ),
                IconButton(
                  key: const Key('add-slide'),
                  tooltip: _ru ? 'Добавить слайд' : 'Add slide',
                  onPressed: _slides.length < 150 ? _addSlide : null,
                  icon: const Icon(Icons.add_circle_outline),
                ),
              ],
            ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: List<Widget>.generate(_slides.length, (index) {
                final number = index + 1;
                return ChoiceChip(
                  key: Key('slide-tab-$number'),
                  label: Text(_ru ? 'Слайд $number' : 'Slide $number'),
                  selected: index == _selectedSlideIndex,
                  onSelected: (_) => _selectSlide(index),
                );
              }),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(
                _error!,
                key: const Key('editor-error'),
                style: TextStyle(color: colors.error),
              ),
            ],
            if (_versionConflict) ...[
              const SizedBox(height: 8),
              OutlinedButton.icon(
                key: const Key('reload-latest-version'),
                onPressed: _isReloading ? null : _reloadLatest,
                icon: _isReloading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.refresh),
                label: Text(
                  _ru
                      ? 'Загрузить последнюю версию (отменить мои изменения)'
                      : 'Reload latest version (discard my changes)',
                ),
              ),
            ],
            if (_savedMessage != null) ...[
              const SizedBox(height: 8),
              Text(
                _savedMessage!,
                key: const Key('editor-saved'),
                style: TextStyle(color: colors.primary),
              ),
            ],
            const SizedBox(height: 8),
            TextField(
              key: const Key('editor-slide-text-field'),
              controller: _bodyController,
              minLines: 3,
              maxLines: 8,
              textCapitalization: TextCapitalization.sentences,
              onChanged: (_) => setState(() => _savedMessage = null),
              decoration: InputDecoration(
                labelText: _ru ? 'Текст элемента' : 'Element text',
                hintText: _ru ? 'Введите текст' : 'Enter text',
                alignLabelWithHint: true,
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            _buildSlidePreview(),
            const SizedBox(height: 12),
            Text(
              _ru ? 'Добавить на слайд' : 'Add to slide',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            Wrap(
              spacing: 8,
              children: [
                _actionChip(
                  key: const Key('add-title-text'),
                  icon: Icons.title,
                  label: _ru ? 'Заголовок' : 'Title',
                  onPressed: () => _addTextPreset('title'),
                ),
                _actionChip(
                  key: const Key('add-heading-text'),
                  icon: Icons.format_size,
                  label: _ru ? 'Подзаголовок' : 'Heading',
                  onPressed: () => _addTextPreset('heading'),
                ),
                _actionChip(
                  key: const Key('add-paragraph-text'),
                  icon: Icons.notes,
                  label: _ru ? 'Абзац' : 'Paragraph',
                  onPressed: () => _addTextPreset('paragraph'),
                ),
                _actionChip(
                  key: const Key('add-icon-text'),
                  icon: Icons.emoji_emotions_outlined,
                  label: _ru ? 'Значок' : 'Icon',
                  onPressed: _chooseIcon,
                ),
                _actionChip(
                  key: const Key('add-image'),
                  icon: Icons.image_outlined,
                  label: _ru ? 'Изображение' : 'Image',
                  onPressed: _addImage,
                ),
              ],
            ),
            if (textElements.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                _ru ? 'Текстовые элементы' : 'Text elements',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              ...textElements.map(
                (element) => ListTile(
                  dense: true,
                  key: Key('text-element-${element['id']}'),
                  selected: element['id'] == _selectedElementId,
                  leading: const Icon(Icons.text_fields),
                  title: Text(
                    (element['text'] as String? ?? '').trim().isEmpty
                        ? (_ru ? 'Пустой текст' : 'Empty text')
                        : (element['text'] as String).replaceAll('\n', ' '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  onTap: () => _selectTextElement(element['id'] as String),
                ),
              ),
            ],
            const SizedBox(height: 8),
            _buildTextStyleControls(style, selected != null),
            const SizedBox(height: 12),
            Card(
              child: ListTile(
                key: const Key('slide-background-control'),
                leading: const Icon(Icons.wallpaper_outlined),
                title: Text(_ru ? 'Фон слайда' : 'Slide background'),
                subtitle: Text(
                  (background['color'] as String?) ?? '#FFFFFF',
                ),
                trailing: CircleAvatar(
                  backgroundColor: _color(
                    (background['color'] as String?) ?? '#FFFFFF',
                    fallback: Colors.white,
                  ),
                  radius: 15,
                ),
                onTap: () => _chooseColor(
                  title: _ru ? 'Цвет фона' : 'Background color',
                  initialColor: (background['color'] as String?) ?? '#FFFFFF',
                  onSelected: _setBackground,
                ),
              ),
            ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _actionChip({
    required Key key,
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
  }) => ActionChip(
    key: key,
    avatar: Icon(icon, size: 18),
    label: Text(label),
    onPressed: onPressed,
  );

  Widget _buildTextStyleControls(Map<dynamic, dynamic> style, bool enabled) {
    final color = style['color'] as String? ?? '#242A28';
    final font = style['fontFamily'] as String? ?? 'Arial';
    final align = style['align'] as String? ?? 'left';
    return Card(
      elevation: 0,
      color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(
        alpha: 0.45,
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _ru ? 'Стиль текста' : 'Text style',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: DropdownButtonFormField<String>(
                    key: const Key('font-family-control'),
                    initialValue: _fontFamilies.contains(font) ? font : 'Arial',
                    decoration: InputDecoration(
                      labelText: _ru ? 'Шрифт' : 'Font family',
                      isDense: true,
                    ),
                    items: _fontFamilies
                        .map(
                          (family) => DropdownMenuItem(
                            value: family,
                            child: Text(family),
                          ),
                        )
                        .toList(),
                    onChanged: enabled
                        ? (value) {
                            if (value != null) {
                              _updateSelectedTextStyle({'fontFamily': value});
                            }
                          }
                        : null,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: TextField(
                    key: const Key('font-size-control'),
                    controller: _fontSizeController,
                    enabled: enabled,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: InputDecoration(
                      labelText: _ru ? 'Размер' : 'Size',
                      suffixText: 'px',
                      isDense: true,
                    ),
                    onSubmitted: _applyFontSize,
                    onTapOutside: (_) => _applyFontSize(
                      _fontSizeController.text,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                IconButton.filledTonal(
                  key: const Key('bold-text'),
                  tooltip: _ru ? 'Полужирный' : 'Bold',
                  isSelected: (style['fontWeight'] as num? ?? 400) >= 600,
                  onPressed: enabled
                      ? () => _updateSelectedTextStyle({
                          'fontWeight':
                              (style['fontWeight'] as num? ?? 400) >= 600
                                  ? 400
                                  : 700,
                        })
                      : null,
                  icon: const Icon(Icons.format_bold),
                ),
                IconButton.filledTonal(
                  key: const Key('italic-text'),
                  tooltip: _ru ? 'Курсив' : 'Italic',
                  isSelected: style['italic'] == true,
                  onPressed: enabled
                      ? () => _updateSelectedTextStyle({
                          'italic': style['italic'] != true,
                        })
                      : null,
                  icon: const Icon(Icons.format_italic),
                ),
                IconButton.filledTonal(
                  key: const Key('underline-text'),
                  tooltip: _ru ? 'Подчёркнутый' : 'Underline',
                  isSelected: style['underline'] == true,
                  onPressed: enabled
                      ? () => _updateSelectedTextStyle({
                          'underline': style['underline'] != true,
                        })
                      : null,
                  icon: const Icon(Icons.format_underline),
                ),
                ToggleButtons(
                  key: const Key('text-alignment-control'),
                  isSelected: [
                    align == 'left',
                    align == 'center',
                    align == 'right',
                  ],
                  onPressed: enabled
                      ? (index) => _updateSelectedTextStyle({
                          'align': ['left', 'center', 'right'][index],
                        })
                      : null,
                  children: const [
                    Icon(Icons.format_align_left),
                    Icon(Icons.format_align_center),
                    Icon(Icons.format_align_right),
                  ],
                ),
                OutlinedButton.icon(
                  key: const Key('text-color-control'),
                  onPressed: enabled
                      ? () => _chooseColor(
                          title: _ru ? 'Цвет текста' : 'Text color',
                          initialColor: color,
                          onSelected: (value) =>
                              _updateSelectedTextStyle({'color': value}),
                        )
                      : null,
                  icon: Icon(Icons.palette_outlined, color: _color(color)),
                  label: Text(_ru ? 'Цвет' : 'Color'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _applyFontSize(String value) {
    final fontSize = double.tryParse(value);
    if (fontSize != null && fontSize >= 8 && fontSize <= 120) {
      _updateSelectedTextStyle({'fontSize': fontSize});
    } else {
      _fontSizeController.text =
          '${_selectedText?['style']?['fontSize'] ?? 32}';
    }
  }

  Future<void> _chooseIcon() async {
    const icons = ['★', '✓', '➜', '●', '◆', '♥', '✦', '!'];
    final icon = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(
          alignment: WrapAlignment.center,
          children: icons
              .map(
                (value) => IconButton(
                  key: Key('icon-option-$value'),
                  iconSize: 32,
                  onPressed: () => Navigator.pop(context, value),
                  icon: Text(value),
                ),
              )
              .toList(),
        ),
      ),
    );
    if (icon != null) _addTextPreset('icon', text: icon);
  }

  Widget _buildSlidePreview() {
    final size = Map<String, dynamic>.from(_document['size'] as Map);
    final width = (size['width'] as num).toDouble();
    final height = (size['height'] as num).toDouble();
    final elements = _elements;
    final background = _activeSlide['background'] as Map? ?? const {};
    return AspectRatio(
      key: const Key('slide-preview'),
      aspectRatio: width / height,
      child: Container(
        clipBehavior: Clip.hardEdge,
        decoration: BoxDecoration(
          color: _color(
            background['color'] as String? ?? '#FFFFFF',
            fallback: Colors.white,
          ),
          border: Border.all(color: Theme.of(context).dividerColor),
          borderRadius: BorderRadius.circular(8),
        ),
        child: LayoutBuilder(
          builder: (context, constraints) => Stack(
            children: [
              for (final element in elements)
                Positioned(
                  left: (element['x'] as num).toDouble() / width *
                      constraints.maxWidth,
                  top: (element['y'] as num).toDouble() / height *
                      constraints.maxHeight,
                  width: (element['w'] as num).toDouble() / width *
                      constraints.maxWidth,
                  height: (element['h'] as num).toDouble() / height *
                      constraints.maxHeight,
                  child: _previewElement(
                    element,
                    constraints.maxWidth / width,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _previewElement(Map<String, dynamic> element, double scale) {
    if (element['type'] == 'image') {
      final uri = element['dataUri'] as String? ?? '';
      final comma = uri.indexOf(',');
      if (comma >= 0) {
        try {
          return Image.memory(
            base64Decode(uri.substring(comma + 1)),
            fit: BoxFit.contain,
            errorBuilder: (_, _, _) => const Icon(Icons.broken_image_outlined),
          );
        } catch (_) {
          return const Icon(Icons.broken_image_outlined);
        }
      }
    }
    if (element['type'] == 'shape') {
      final isEllipse = element['shape'] == 'ellipse';
      return Container(
        decoration: BoxDecoration(
          color: _color(
            element['fill'] as String? ?? '#1976D2',
            fallback: Colors.blue,
          ),
          shape: isEllipse ? BoxShape.circle : BoxShape.rectangle,
        ),
      );
    }
    if (element['type'] != 'text') return const SizedBox.shrink();
    final id = element['id'] as String;
    final style = element['style'] as Map? ?? const {};
    return GestureDetector(
      key: Key('preview-text-$id'),
      onTap: () => _selectTextElement(id),
      child: Container(
        decoration: id == _selectedElementId
            ? BoxDecoration(border: Border.all(color: Colors.blue, width: 1))
            : null,
        alignment: Alignment.topLeft,
        child: Text(
          element['text'] as String? ?? '',
          textAlign: switch (style['align']) {
            'center' => TextAlign.center,
            'right' => TextAlign.right,
            _ => TextAlign.left,
          },
          overflow: TextOverflow.clip,
          style: TextStyle(
            fontFamily: style['fontFamily'] as String? ?? 'Arial',
            fontSize: ((style['fontSize'] as num?)?.toDouble() ?? 28) * scale,
            fontStyle: style['italic'] == true
                ? FontStyle.italic
                : FontStyle.normal,
            decoration: style['underline'] == true
                ? TextDecoration.underline
                : TextDecoration.none,
            fontWeight: FontWeight.values[
              (((style['fontWeight'] as num?)?.toInt() ?? 400) ~/ 100)
                  .clamp(1, 9) -
                  1
            ],
            color: _color(style['color'] as String? ?? '#242A28'),
          ),
        ),
      ),
    );
  }
}
