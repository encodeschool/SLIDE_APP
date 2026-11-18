import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:slideforge_mobile/i18n/mobile_localizations.dart';
import 'package:slideforge_mobile/marketplace/marketplace_upload_policy.dart';

class MarketplaceUploadDraft {
  const MarketplaceUploadDraft({
    required this.title,
    required this.workType,
    required this.priceTiyin,
    required this.description,
    required this.licenseTerms,
    required this.category,
    required this.file,
    required this.fileSize,
  });

  final String title;
  final String workType;
  final int priceTiyin;
  final String description;
  final String licenseTerms;
  final String category;
  final PlatformFile file;
  final int fileSize;
}

class MarketplaceUploadListingDialog extends StatefulWidget {
  const MarketplaceUploadListingDialog({
    super.key,
    required this.localizations,
    required this.categories,
    required this.categoryLabel,
  });

  final MobileLocalizations localizations;
  final List<Map<String, dynamic>> categories;
  final String Function(String slug) categoryLabel;

  @override
  State<MarketplaceUploadListingDialog> createState() =>
      _MarketplaceUploadListingDialogState();
}

class _MarketplaceUploadListingDialogState
    extends State<MarketplaceUploadListingDialog> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _price = TextEditingController(text: '10000');
  final _description = TextEditingController();
  final _licenseTerms = TextEditingController();
  String _workType = 'other';
  String? _category;
  PlatformFile? _file;
  int? _fileSize;
  String? _fileError;
  bool _pickingFile = false;

  String _text(String english, String russian, String uzbek) =>
      widget.localizations.text(english, russian, uzbek);

  @override
  void initState() {
    super.initState();
    _category =
        widget.categories.isEmpty
            ? null
            : widget.categories.first['slug'] as String;
  }

  @override
  void dispose() {
    _title.dispose();
    _price.dispose();
    _description.dispose();
    _licenseTerms.dispose();
    super.dispose();
  }

  Future<void> _pickFile() async {
    setState(() {
      _pickingFile = true;
      _fileError = null;
    });
    try {
      final file = await FilePicker.pickFile(
        type: FileType.custom,
        allowedExtensions: MarketplaceUploadPolicy.extensionsFor(_workType),
      );
      if (!mounted || file == null) return;
      final fileSize = await file.length();
      if (!mounted) return;
      if (fileSize == null) {
        setState(() {
          _file = null;
          _fileSize = null;
          _fileError = _text(
            'Could not read the selected file.',
            'Не удалось прочитать выбранный файл.',
            'Tanlangan faylni oʻqib boʻlmadi.',
          );
        });
        return;
      }
      if (fileSize == 0) {
        setState(() {
          _file = null;
          _fileSize = null;
          _fileError = _text(
            'Choose a non-empty file.',
            'Выберите непустой файл.',
            'Boʻsh boʻlmagan faylni tanlang.',
          );
        });
        return;
      }
      if (fileSize > marketplaceMaximumUploadSizeBytes) {
        setState(() {
          _file = null;
          _fileSize = null;
          _fileError = _text(
            'Files must be 25 MB or smaller.',
            'Размер файла не должен превышать 25 МБ.',
            'Fayl hajmi 25 MB dan oshmasligi kerak.',
          );
        });
        return;
      }
      if (!MarketplaceUploadPolicy.accepts(_workType, file.name)) {
        setState(() {
          _file = null;
          _fileSize = null;
          _fileError = _text(
            'This format is not supported for the selected work type.',
            'Этот формат не поддерживается для выбранного типа работы.',
            'Tanlangan ish turi uchun bu format qoʻllab-quvvatlanmaydi.',
          );
        });
        return;
      }
      setState(() {
        _file = file;
        _fileSize = fileSize;
        _fileError = null;
      });
    } catch (_) {
      if (mounted) {
        setState(
          () =>
              _fileError = _text(
                'Could not open the file picker. Try again.',
                'Не удалось открыть выбор файла. Попробуйте ещё раз.',
                'Fayl tanlash oynasini ochib boʻlmadi. Qayta urinib koʻring.',
              ),
        );
      }
    } finally {
      if (mounted) setState(() => _pickingFile = false);
    }
  }

  String _workTypeLabel(String workType) => switch (workType) {
    'presentation' => _text('Presentation', 'Презентация', 'Taqdimot'),
    'document' => _text('Document', 'Документ', 'Hujjat'),
    'coursework' => _text('Coursework', 'Курсовая работа', 'Kurs ishi'),
    'worksheet' => _text('Worksheet', 'Рабочая тетрадь', 'Iş daftari'),
    'design' => _text('Design', 'Дизайн', 'Dizayn'),
    _ => _text('Other work', 'Другая работа', 'Boshqa iş'),
  };

  String? _required(String? value) =>
      value == null || value.trim().isEmpty
          ? _text('Required', 'Обязательное поле', 'Toʻldirish shart')
          : null;

  String? _priceValidator(String? value) {
    final requiredError = _required(value);
    if (requiredError != null) return requiredError;
    final amount = double.tryParse(value!.trim().replaceAll(',', '.'));
    if (amount == null ||
        !amount.isFinite ||
        amount <= 0 ||
        amount > 90000000000000) {
      return _text(
        'Enter a valid price.',
        'Введите корректную цену.',
        'Toʻgʻri narx kiriting.',
      );
    }
    return null;
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    final amount = double.tryParse(_price.text.trim().replaceAll(',', '.'));
    if (amount == null) return;
    if (_file == null) {
      setState(
        () =>
            _fileError = _text(
              'Choose a file to upload.',
              'Выберите файл для загрузки.',
              'Yuklash uchun fayl tanlang.',
            ),
      );
      return;
    }
    final category = _category;
    if (category == null ||
        !widget.categories.any((item) => item['slug'] == category)) {
      return;
    }

    Navigator.of(context).pop(
      MarketplaceUploadDraft(
        title: _title.text.trim(),
        workType: _workType,
        priceTiyin: (amount * 100).round(),
        description: _description.text.trim(),
        licenseTerms: _licenseTerms.text.trim(),
        category: category,
        file: _file!,
        fileSize: _fileSize!,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final supportedFiles = MarketplaceUploadPolicy.extensionsFor(
      _workType,
    ).map((value) => '.$value').join(', ');
    return Dialog(
      key: const ValueKey('marketplace-upload-dialog'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: 480,
          maxHeight: MediaQuery.sizeOf(context).height * .9,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 12, 12),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: colors.primaryContainer,
                      borderRadius: BorderRadius.circular(15),
                    ),
                    child: Icon(
                      Icons.publish_rounded,
                      color: colors.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _text(
                            'Upload work to sell',
                            'Загрузить работу',
                            'Iş yuklash',
                          ),
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _text(
                            'Add details and choose a file to publish.',
                            'Заполните данные и выберите файл для публикации.',
                            'Maʼlumotlarni kiriting va faylni tanlang.',
                          ),
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: colors.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: _text('Close', 'Закрыть', 'Yopish'),
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
            ),
            Flexible(
              child: Form(
                key: _formKey,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 18),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextFormField(
                        key: const ValueKey('marketplace-upload-title'),
                        controller: _title,
                        maxLength: 200,
                        decoration: InputDecoration(
                          labelText: _text('Title', 'Название', 'Sarlavha'),
                        ),
                        validator: _required,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        key: ValueKey(
                          'marketplace-upload-work-type-$_workType',
                        ),
                        initialValue: _workType,
                        decoration: InputDecoration(
                          labelText: _text(
                            'Work type',
                            'Тип работы',
                            'Iş türü',
                          ),
                        ),
                        items:
                            marketplaceExtensionsByWorkType.keys
                                .map(
                                  (type) => DropdownMenuItem(
                                    value: type,
                                    child: Text(_workTypeLabel(type)),
                                  ),
                                )
                                .toList(),
                        onChanged: (value) {
                          if (value == null) return;
                          setState(() {
                            _workType = value;
                            if (_file != null &&
                                !MarketplaceUploadPolicy.accepts(
                                  value,
                                  _file!.name,
                                )) {
                              _file = null;
                              _fileSize = null;
                            }
                            _fileError = null;
                          });
                        },
                      ),
                      const SizedBox(height: 12),
                      if (widget.categories.isEmpty)
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            _text(
                              'No active categories are available.',
                              'Нет активных категорий.',
                              'Faol turkumlar mavjud emas.',
                            ),
                            style: TextStyle(color: colors.error),
                          ),
                        )
                      else
                        DropdownButtonFormField<String>(
                          initialValue: _category,
                          decoration: InputDecoration(
                            labelText: _text('Category', 'Категория', 'Turkum'),
                          ),
                          items:
                              widget.categories
                                  .map(
                                    (category) => DropdownMenuItem(
                                      value: category['slug'] as String,
                                      child: Text(
                                        widget.categoryLabel(
                                          category['slug'] as String,
                                        ),
                                      ),
                                    ),
                                  )
                                  .toList(),
                          onChanged:
                              (value) => setState(() => _category = value),
                        ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _price,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration: InputDecoration(
                          labelText: _text(
                            'Price (UZS)',
                            'Цена (UZS)',
                            'Narxi (UZS)',
                          ),
                        ),
                        validator: _priceValidator,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _description,
                        maxLength: 20000,
                        maxLines: 3,
                        decoration: InputDecoration(
                          labelText: _text('Description', 'Описание', 'Tavsif'),
                        ),
                        validator: _required,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _licenseTerms,
                        maxLength: 20000,
                        maxLines: 3,
                        decoration: InputDecoration(
                          labelText: _text(
                            'License terms',
                            'Условия лицензии',
                            'Litsenziya şartlari',
                          ),
                        ),
                        validator: _required,
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: colors.surfaceContainerLow,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: colors.outlineVariant),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _text(
                                'File to publish',
                                'Файл для публикации',
                                'Nashr qilinadigan fayl',
                              ),
                              style: Theme.of(context).textTheme.titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _text(
                                'Supported files: $supportedFiles · maximum 25 MB',
                                'Форматы: $supportedFiles · максимум 25 МБ',
                                'Formatlar: $supportedFiles · ko‘pi 25 MB',
                              ),
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(color: colors.onSurfaceVariant),
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                key: const ValueKey(
                                  'marketplace-upload-choose-file',
                                ),
                                onPressed: _pickingFile ? null : _pickFile,
                                icon:
                                    _pickingFile
                                        ? const SizedBox.square(
                                          dimension: 18,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                          ),
                                        )
                                        : const Icon(Icons.attach_file_rounded),
                                label: Text(
                                  _file?.name ??
                                      _text(
                                        'Choose file',
                                        'Выбрать файл',
                                        'Fayl tanlash',
                                      ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ),
                            if (_fileError != null) ...[
                              const SizedBox(height: 8),
                              Text(
                                _fileError!,
                                style: TextStyle(color: colors.error),
                              ),
                            ],
                            if (_file != null) ...[
                              const SizedBox(height: 6),
                              Text(
                                '${((_fileSize ?? 0) / (1024 * 1024)).toStringAsFixed(2)} MB',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(color: colors.onSurfaceVariant),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 18),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: Text(_text('Cancel', 'Отмена', 'Bekor qilish')),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed:
                          widget.categories.isEmpty || _pickingFile
                              ? null
                              : _submit,
                      icon: const Icon(Icons.publish_rounded),
                      label: Text(
                        _text('Publish', 'Опубликовать', 'Nashr qilish'),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
