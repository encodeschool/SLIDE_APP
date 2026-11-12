const marketplaceDemoCategories = <Map<String, dynamic>>[
  {'slug': 'business', 'name': 'Business', 'nameRu': 'Бизнес', 'nameUz': 'Biznes'},
  {'slug': 'education', 'name': 'Education', 'nameRu': 'Образование', 'nameUz': 'Ta’lim'},
  {'slug': 'marketing', 'name': 'Marketing', 'nameRu': 'Маркетинг', 'nameUz': 'Marketing'},
  {'slug': 'technology', 'name': 'Technology', 'nameRu': 'Технологии', 'nameUz': 'Texnologiya'},
  {'slug': 'other', 'name': 'Other', 'nameRu': 'Другое', 'nameUz': 'Boshqa'},
];

const marketplaceDemoExamples = <Map<String, dynamic>>[
  {'title': 'Investor pitch deck', 'titleRu': 'Презентация для инвесторов', 'titleUz': 'Investorlar uchun taqdimot', 'description': 'A polished, editable startup funding presentation.', 'category': 'business', 'sellerName': 'Northstar Studio', 'priceTiyin': 1250000},
  {'title': 'Learning roadmap', 'titleRu': 'План обучения', 'titleUz': 'Ta’lim yoʻl xaritasi', 'description': 'A clear curriculum plan for a modern learning program.', 'category': 'education', 'sellerName': 'BrightPath', 'priceTiyin': 850000},
  {'title': 'Brand launch strategy', 'titleRu': 'Стратегия запуска бренда', 'titleUz': 'Brendni ishga tushirish strategiyasi', 'description': 'A practical launch plan with campaign milestones.', 'category': 'marketing', 'sellerName': 'Mosaic Creative', 'priceTiyin': 990000},
  {'title': 'Product analytics', 'titleRu': 'Аналитика продукта', 'titleUz': 'Mahsulot tahlili', 'description': 'A concise product metrics and insights deck.', 'category': 'technology', 'sellerName': 'Signal Works', 'priceTiyin': 1150000},
  {'title': 'Quarterly business review', 'titleRu': 'Квартальный обзор бизнеса', 'titleUz': 'Choraklik biznes hisoboti', 'description': 'An executive-ready review for quarterly results.', 'category': 'business', 'sellerName': 'Northstar Studio', 'priceTiyin': 750000},
  {'title': 'Classroom workshop', 'titleRu': 'Учебный семинар', 'titleUz': 'Sinf mashgʻuloti', 'description': 'A friendly workshop deck for interactive learning.', 'category': 'education', 'sellerName': 'BrightPath', 'priceTiyin': 650000},
  {'title': 'Social campaign planner', 'titleRu': 'План кампании в соцсетях', 'titleUz': 'Ijtimoiy tarmoq kampaniyasi rejasi', 'description': 'Plan channels, creative, and campaign outcomes.', 'category': 'marketing', 'sellerName': 'Mosaic Creative', 'priceTiyin': 720000},
  {'title': 'Cloud migration plan', 'titleRu': 'План миграции в облако', 'titleUz': 'Bulutga koʻchirish rejasi', 'description': 'A technology migration plan with phased delivery.', 'category': 'technology', 'sellerName': 'Signal Works', 'priceTiyin': 1350000},
  {'title': 'Project proposal', 'titleRu': 'Проектное предложение', 'titleUz': 'Loyiha taklifi', 'description': 'A reusable structure for planning new initiatives.', 'category': 'other', 'sellerName': 'Studio Atlas', 'priceTiyin': 540000},
  {'title': 'Market research report', 'titleRu': 'Отчёт об исследовании рынка', 'titleUz': 'Bozor tadqiqoti hisoboti', 'description': 'A clean, data-focused market research story.', 'category': 'business', 'sellerName': 'Studio Atlas', 'priceTiyin': 920000},
  {'title': 'Training program', 'titleRu': 'Программа обучения', 'titleUz': 'Trening dasturi', 'description': 'An editable training deck for growing teams.', 'category': 'education', 'sellerName': 'BrightPath', 'priceTiyin': 780000},
  {'title': 'Customer journey map', 'titleRu': 'Карта пути клиента', 'titleUz': 'Mijoz yoʻli xaritasi', 'description': 'Map customer touchpoints and experience insights.', 'category': 'marketing', 'sellerName': 'Mosaic Creative', 'priceTiyin': 890000},
];

List<Map<String, dynamic>> getMarketplaceDemoProducts(bool russian, bool uzbek) =>
    List.generate(marketplaceDemoExamples.length, (index) {
      final example = marketplaceDemoExamples[index];
      return {
        ...example,
        'title': uzbek
            ? example['titleUz']
            : russian
                ? example['titleRu']
                : example['title'],
        'listingId': 'demo-listing-${index + 1}',
        'listingVersionId': 'demo-version-${index + 1}',
        'sellerId': 'demo-seller-${index % 4 + 1}',
        'version': 1,
        'currency': 'UZS',
        'publishedAt': '2026-01-01T00:00:00Z',
        'licenseTerms': 'Demo license: editable for your own projects. No resale or redistribution of the source file.',
        'previewSlides': [
          {
            'slideNumber': 1,
            'title': uzbek
                ? example['titleUz']
                : russian
                ? example['titleRu']
                : example['title'],
            'text': [example['description']],
            'backgroundColor': '#F3F5F1',
            'accentColor': '#28765D',
          },
          {
            'slideNumber': 2,
            'title': uzbek
                ? 'Asosiy gʻoya'
                : russian
                ? 'Главная идея'
                : 'The big idea',
            'text': [example['description']],
            'backgroundColor': '#F4F0E8',
            'accentColor': '#8A6945',
          },
          {
            'slideNumber': 3,
            'title': uzbek
                ? 'Keyingi qadamlar'
                : russian
                ? 'Следующие шаги'
                : 'What comes next',
            'text': [
              uzbek
                  ? 'Tahrirlanadigan slaydlar bilan boshlang.'
                  : russian
                  ? 'Начните с редактируемых слайдов.'
                  : 'Start with ready-to-edit slides.',
            ],
            'backgroundColor': '#EDF1F5',
            'accentColor': '#526C89',
          },
        ],
      };
    });
