const marketplaceMaximumUploadSizeBytes = 25 * 1024 * 1024;

const marketplaceExtensionsByWorkType = <String, List<String>>{
  'presentation': ['pptx', 'pdf', 'odp'],
  'document': ['docx', 'odt', 'rtf', 'txt', 'md', 'html', 'htm', 'pdf'],
  'coursework': [
    'docx',
    'pptx',
    'xlsx',
    'odt',
    'odp',
    'ods',
    'pdf',
    'rtf',
    'txt',
    'md',
    'html',
    'htm',
    'csv',
  ],
  'worksheet': ['xlsx', 'ods', 'docx', 'odt', 'pdf', 'txt', 'md', 'csv'],
  'design': ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp'],
  'other': [
    'docx',
    'pptx',
    'xlsx',
    'odt',
    'odp',
    'ods',
    'pdf',
    'rtf',
    'txt',
    'md',
    'html',
    'htm',
    'csv',
    'png',
    'jpg',
    'jpeg',
    'webp',
    'svg',
    'gif',
    'bmp',
  ],
};

class MarketplaceUploadPolicy {
  const MarketplaceUploadPolicy._();

  static List<String> extensionsFor(String workType) =>
      marketplaceExtensionsByWorkType[workType] ?? const [];

  static bool accepts(String workType, String fileName) {
    final extension = fileName.split('.').last.toLowerCase();
    return fileName.contains('.') &&
        extensionsFor(workType).contains(extension);
  }
}
