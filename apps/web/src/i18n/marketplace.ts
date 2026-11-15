import type { Locale } from "./locale";

export const marketplaceCategoryFallbacks: Record<Locale, Record<string, string>> = {
  en: { business: "Business", education: "Education", marketing: "Marketing", technology: "Technology", other: "Other" },
  ru: { business: "Бизнес", education: "Образование", marketing: "Маркетинг", technology: "Технологии", other: "Другое" },
  uz: { business: "Biznes", education: "Taʼlim", marketing: "Marketing", technology: "Texnologiya", other: "Boşqa" },
};

export const categoryNames = {
  en: { shop: "Presentation marketplace", intro: "Discover and sell editable presentations.", category: "Category", all: "All categories", search: "Search presentations", add: "Add to cart", added: "Added", remove: "Remove", cart: "Cart", checkout: "Checkout", payment: "Payment", continue: "Continue", pay: "Pay for order", sandbox: "Sandbox payment", sandboxInfo: "Sandbox payments only; confirmation is disabled unless an operator enables them.", total: "Order total", signInToPay: "Sign in to continue to payment", secureNote: "Your account session is protected; payment details are handled by the payment provider.", emptyCart: "Your cart is empty.", empty: "No published presentations yet.", seller: "Seller", license: "License terms", details: "View details", back: "Back to marketplace", more: "Load 10 more", signIn: "Sign in to checkout", sell: "Sell a presentation", choose: "Choose a presentation", price: "Price (UZS)", description: "Listing description", terms: "License terms", publish: "Publish listing", myListings: "My listings", published: "Listing published", saved: "Preference saved", pending: "Order created but payment is pending. Sandbox confirmation is disabled; no purchase was completed.", complete: "Purchase complete", error: "Could not complete the request. Please try again.", noDecks: "Create a presentation before publishing.", demo: "Demo catalog — sample items only. Purchases are not available in demo mode.", demoPaid: "Demo only: no order or payment was created." },
  ru: { shop: "Маркетплейс презентаций", intro: "Покупайте и продавайте редактируемые презентации.", category: "Категория", all: "Все категории", search: "Поиск презентаций", add: "В корзину", added: "Добавлено", remove: "Удалить", cart: "Корзина", checkout: "Оформление", payment: "Оплата", continue: "Продолжить", pay: "Оплатить заказ", sandbox: "Тестовая оплата", sandboxInfo: "Тестовый режим; подтверждение отключено, пока оператор его не включит.", total: "Итого", signInToPay: "Войдите, чтобы перейти к оплате", secureNote: "Сессия защищена; платёжные данные обрабатываются платёжным провайдером.", emptyCart: "Корзина пока пуста.", empty: "Пока нет опубликованных презентаций.", seller: "Продавец", license: "Условия лицензии", details: "Подробнее", back: "Назад в маркетплейс", more: "Загрузить ещё 10", signIn: "Войдите для оформления", sell: "Продать презентацию", choose: "Выберите презентацию", price: "Цена (UZS)", description: "Описание объявления", terms: "Условия лицензии", publish: "Опубликовать", myListings: "Мои объявления", published: "Объявление опубликовано", saved: "Настройка сохранена", pending: "Заказ создан, оплата ожидает подтверждения. Тестовая оплата отключена; покупка не завершена.", complete: "Покупка завершена", error: "Не удалось выполнить запрос. Попробуйте ещё раз.", noDecks: "Сначала создайте презентацию.", demo: "Демо-каталог — примеры. Покупки недоступны в демо-режиме.", demoPaid: "Демо: заказ и платёж не создавались." },
  uz: { shop: "Taqdimotlar marketpleysi", intro: "Tahrirlanadigan taqdimotlarni köring va soting.", category: "Turkum", all: "Barça turkumlar", search: "Taqdimotlarni qidiriş", add: "Savatga qöşiş", added: "Qöşildi", remove: "Öçiriş", cart: "Savat", checkout: "Buyurtmani rasmiylaştiriş", payment: "Tölov", continue: "Davom etiş", pay: "Buyurtma uçun tölaş", sandbox: "Sinov tölovi", sandboxInfo: "Faqat sinov tölovlari; operator yoqmagunça tasdiqlaş işlamaydi.", total: "Jami", signInToPay: "Tölov uçun tizimga kiring", secureNote: "Hisob sessiyangiz himoyalangan; tölov maʼlumotlarini provayder qayta işlaydi.", emptyCart: "Savatingiz böş.", empty: "Hozirça çop etilgan taqdimotlar yöq.", seller: "Sotuvçi", license: "Litsenziya şartlari", details: "Batafsil", back: "Marketpleysga qaytiş", more: "Yana 10 tasini yuklaş", signIn: "Xarid uçun tizimga kiring", sell: "Taqdimot sotiş", choose: "Taqdimotni tanlang", price: "Narxi (UZS)", description: "Eʼlon tavsifi", terms: "Litsenziya şartlari", publish: "Eʼlon qiliş", myListings: "Eʼlonlarim", published: "Eʼlon çop etildi", saved: "Sozlama saqlandi", pending: "Buyurtma yaratildi, lekin tölov tasdiqlanmadi. Sinov tölovi öçiq; xarid yakunlanmadi.", complete: "Xarid yakunlandi", error: "Sörovni bajarib bölmadi. Qayta urinib köring.", noDecks: "Avval taqdimot yarating.", demo: "Namoyiş katalogi — namunaviy mahsulotlar. Xaridlar mavjud emas.", demoPaid: "Namoyiş: buyurtma va tölov yaratilmagan." },
};

export const publishDialogCopy = {
  en: {
    prompt: "Publish an editable presentation you own. You can also prepare a file-work listing, but uploads and buyer delivery are not available yet.",
    close: "Close",
    workType: "Work type",
    presentation: "Editable presentation",
    document: "Document",
    coursework: "Coursework",
    worksheet: "Worksheet",
    design: "Design or artwork",
    other: "Other work",
    filePrompt: "Choose or drop one file in any format",
    localOnly: "Local selection only: this file stays in your browser and is not uploaded or listed. Secure storage and buyer delivery are not implemented.",
    fileSelected: "Selected locally",
    fileTooLarge: "Choose a file smaller than 25 MB.",
    fileSize: "Size",
    choose: "Choose an owned presentation",
    blockedPublish: "File-work publishing is unavailable until secure upload, storage, and buyer delivery are implemented.",
  },
  ru: {
    prompt: "Опубликуйте принадлежащую вам редактируемую презентацию или подготовьте объявление для файла. Загрузка и передача файлов покупателям пока недоступны.",
    close: "Закрыть",
    workType: "Тип работы",
    presentation: "Редактируемая презентация",
    document: "Документ",
    coursework: "Курсовая работа",
    worksheet: "Рабочий лист",
    design: "Дизайн или иллюстрация",
    other: "Другая работа",
    filePrompt: "Выберите или перетащите файл любого формата",
    localOnly: "Только локальный выбор: файл остаётся в браузере и не загружается и не публикуется. Защищённое хранилище и передача покупателю не реализованы.",
    fileSelected: "Выбран локально",
    fileTooLarge: "Выберите файл размером менее 25 МБ.",
    fileSize: "Размер",
    choose: "Выберите свою презентацию",
    blockedPublish: "Публикация файловых работ недоступна до реализации защищённой загрузки, хранения и передачи покупателю.",
  },
  uz: {
    prompt: "Özingizga tegişli tahrirlanadigan taqdimotni eʼlon qiling yoki faylli eʼlonni tayyorlang. Fayl yuklaş va xaridorga yetkaziş hozirça mavjud emas.",
    close: "Yopiş",
    workType: "Iş turi",
    presentation: "Tahrirlanadigan taqdimot",
    document: "Hujjat",
    coursework: "Kurs işi",
    worksheet: "Iş varaqasi",
    design: "Dizayn yoki rasm",
    other: "Boşqa iş",
    filePrompt: "Istalgan formatdagi faylni tanlang yoki şu yerga taşlang",
    localOnly: "Faqat mahalliy tanlov: fayl brauzeringizda qoladi, yuklanmaydi va eʼlon qilinmaydi. Himoyalangan saqlaş va xaridorga yetkaziş amalga oşirilmagan.",
    fileSelected: "Mahalliy tanlandi",
    fileTooLarge: "25 MB dan kiçik faylni tanlang.",
    fileSize: "Hajmi",
    choose: "Özingizga tegişli taqdimotni tanlang",
    blockedPublish: "Himoyalangan yuklaş, saqlaş va xaridorga yetkaziş amalga oşmagunça faylli işlarni eʼlon qilib bölmaydi.",
  },
} satisfies Record<Locale, {
  prompt: string;
  close: string;
  workType: string;
  presentation: string;
  document: string;
  coursework: string;
  worksheet: string;
  design: string;
  other: string;
  filePrompt: string;
  localOnly: string;
  fileSelected: string;
  fileTooLarge: string;
  fileSize: string;
  choose: string;
  blockedPublish: string;
}>;

export const browseLabels = {
  en: {
    bannerTitle: "Ideas, ready for their next chapter.",
    bannerSubtitle: "Find a polished starting point for your next presentation.",
    searchAction: "Search",
    filters: "Filters",
    sort: "Sort by",
    latest: "Recently added",
    priceLow: "Price: low to high",
    priceHigh: "Price: high to low",
    minPrice: "Minimum · UZS",
    maxPrice: "Maximum · UZS",
    apply: "Apply filters",
    reset: "Reset",
    invalidRange: "Enter a valid price range.",
    purchases: "My purchases",
    noPurchases: "Your completed purchases will appear here.",
    openPurchase: "Open presentation",
    ready: "Purchased and ready to use",
    loading: "Loading purchases…",
    liveUnavailable: "Live payment methods are not connected yet.",
    liveMethods: "Not available yet",
    walletBalance: "Wallet balance",
    payFromBalance: "Pay from balance",
    topUpBalance: "Top up balance",
    insufficientBalance: "Your balance is too low. Add funds to finish this purchase.",
    sandboxWalletNotice: "Top-ups are simulated in sandbox mode. No real payment is made.",
  },
  ru: {
    bannerTitle: "Идеи для вашей следующей главы.",
    bannerSubtitle: "Найдите основу для сильной презентации.",
    searchAction: "Поиск",
    filters: "Фильтры",
    sort: "Сортировка",
    latest: "Сначала новые",
    priceLow: "Сначала дешевле",
    priceHigh: "Сначала дороже",
    minPrice: "Минимум · UZS",
    maxPrice: "Максимум · UZS",
    apply: "Применить фильтры",
    reset: "Сбросить",
    invalidRange: "Укажите корректный диапазон цены.",
    purchases: "Мои покупки",
    noPurchases: "Здесь появятся завершённые покупки.",
    openPurchase: "Открыть презентацию",
    ready: "Покупка доступна",
    loading: "Загрузка покупок…",
    liveUnavailable: "Онлайн-оплата пока не подключена.",
    liveMethods: "Пока недоступно",
    walletBalance: "Баланс кошелька",
    payFromBalance: "Оплатить с баланса",
    topUpBalance: "Пополнить баланс",
    insufficientBalance: "Недостаточно средств. Пополните баланс, чтобы завершить покупку.",
    sandboxWalletNotice: "Пополнение симулируется в тестовом режиме. Реальная оплата не выполняется.",
  },
  uz: {
    bannerTitle: "Keyingi ğoyangiz uçun ilhom.",
    bannerSubtitle: "Yangi taqdimotingiz uçun tayyor asosni toping.",
    searchAction: "Qidiriş",
    filters: "Filtrlar",
    sort: "Saralaş",
    latest: "Yangi qöşilganlar",
    priceLow: "Arzonidan qimmatiga",
    priceHigh: "Qimmatidan arzoniga",
    minPrice: "Eng kam · UZS",
    maxPrice: "Eng köp · UZS",
    apply: "Filtrlarni qöllaş",
    reset: "Tozalaş",
    invalidRange: "Töğri narx oraliğini kiriting.",
    purchases: "Xaridlarim",
    noPurchases: "Yakunlangan xaridlaringiz şu yerda körinadi.",
    openPurchase: "Taqdimotni oçiş",
    ready: "Xarid foydalanişga tayyor",
    loading: "Xaridlar yuklanmoqda…",
    liveUnavailable: "Onlayn tölov usullari hali ulanmagan.",
    liveMethods: "Hozirça mavjud emas",
    walletBalance: "Hamyon balansi",
    payFromBalance: "Balansdan tölaş",
    topUpBalance: "Balansni töldiriş",
    insufficientBalance: "Balansda mablağ yetarli emas. Xaridni yakunlaş uçun balansni töldiring.",
    sandboxWalletNotice: "Balans sinov rejimida töldiriladi. Haqiqiy tölov olinmaydi.",
  },
};

export const purchaseActionLabels = {
  en: {
    slideUnit: "slides",
    previewCount: "Previewing {visible} of {total} slides",
    lockedSlides: "{count} more slides are locked",
    lockedNote: "Purchase to unlock the complete presentation and downloads.",
    purchaseToUnlock: "Purchase to unlock",
    downloadPptx: "Download PPTX",
    downloadPdf: "Download PDF",
    exporting: "Preparing download…",
    exportReady: "Download started. A copy is saved in My presentations.",
    exportFailed: "Could not prepare the download. Please try again.",
    exportTimedOut: "This export is taking longer than expected. Check Purchases again shortly.",
  },
  ru: {
    slideUnit: "слайдов",
    previewCount: "Предпросмотр: {visible} из {total} слайдов",
    lockedSlides: "Ещё {count} слайдов закрыты",
    lockedNote: "Купите презентацию, чтобы открыть все слайды и скачивание.",
    purchaseToUnlock: "Купить и открыть",
    downloadPptx: "Скачать PPTX",
    downloadPdf: "Скачать PDF",
    exporting: "Готовим файл…",
    exportReady: "Скачивание началось. Копия сохранена в разделе презентаций.",
    exportFailed: "Не удалось подготовить файл. Попробуйте ещё раз.",
    exportTimedOut: "Экспорт занимает больше времени. Проверьте покупки чуть позже.",
  },
  uz: {
    slideUnit: "slayd",
    previewCount: "{total} slayddan {visible} tasi körsatilmoqda",
    lockedSlides: "Yana {count} ta slayd qulflangan",
    lockedNote: "Barça slaydlar va fayllarni oçiş uçun taqdimotni xarid qiling.",
    purchaseToUnlock: "Xarid qilib oçiş",
    downloadPptx: "PPTX yuklab oliş",
    downloadPdf: "PDF yuklab oliş",
    exporting: "Fayl tayyorlanmoqda…",
    exportReady: "Yuklab oliş boşlandi. Nusxa taqdimotlaringizga saqlandi.",
    exportFailed: "Faylni tayyorlab bölmadi. Qayta urinib köring.",
    exportTimedOut: "Eksport uzoqroq davom etmoqda. Xaridlar bölimini keyinroq tekşiring.",
  },
};
