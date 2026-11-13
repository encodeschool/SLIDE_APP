import { useEffect, useRef, useState } from "react";
import { History, type Deck, type ImageElement, type Op, type ShapeElement, type TextElement } from "../../../../packages/shared-types/src/index.ts";
import { API_URL, authorizedFetch, restoreSessionFromCookie } from "../shared/api/client";
import type {
  AuthMode,
  AuthResponse,
  ExportFormat,
  ExportJobResponse,
  GenerationJobResponse,
  Locale,
  PresentationDetail,
  PresentationSummary,
  UserProfile,
  WalletResponse,
} from "../shared/types";
import { AuthPanel } from "../features/auth/AuthPanel";
import { ProfilePanel } from "../features/auth/ProfilePanel";
import { GenerationPanel } from "../features/generation/GenerationPanel";
import type { CreationType } from "../features/generation/GenerationPanel";
import { ArtifactWorkspace } from "../features/artifacts/ArtifactWorkspace";
import type { ArtifactDocument } from "../../../../packages/shared-types/src/artifact.ts";
import { PresentationLibrary } from "../features/presentations/PresentationLibrary";
import { PresentationEditor } from "../features/presentations/PresentationEditor";
import { Marketplace } from "../features/marketplace/Marketplace";
import { WalletPanel } from "../features/wallet/WalletPanel";
import {
  ArrowUpRight,
  BookOpen,
  Boxes,
  Globe2,
  Home,
  Layers3,
  LogOut,
  Settings2,
  UserRound,
} from "lucide-react";

const en = {
    workspace: "Workspace",
    home: "Home",
    library: "My presentations",
    create: "Create with AI",
    marketplace: "Marketplace",
    purchases: "Purchases",
    account: "Account",
    accountDescription: "Manage your profile, balance, and billing activity.",
    accountBilling: "Billing and balance",
    sellerPayout: "Seller payouts",
    sellerPayoutUnavailable: "Seller payouts will be available after a verified payment provider is connected. Slideforge does not collect card numbers or security codes.",
    sellerPayoutPending: "Secure payouts are not configured yet.",
    coming: "Available in a later phase",
    foundation: "Your ideas, in their best light.",
    intro: "A considered space for building presentations. Your workspace is being connected to the Slideforge API.",
    status: "Platform status",
    api: "API foundation",
    checking: "Checking API",
    ready: "Endpoint available",
    unavailable: "API unavailable",
    docs: "API documentation",
    docsCopy: "Explore the running API contract",
    model: "Shared deck model",
    modelCopy: "Canonical JSON with tested editing operations",
    export: "Presentation export",
    exportCopy: "Editable PowerPoint with a PDF conversion path",
    roadmap: "See implementation progress",
    language: "Switch language",
    signIn: "Sign in",
    register: "Create account",
    loginTitle: "Sign in to your workspace",
    registerTitle: "Create your workspace account",
    forgotTitle: "Reset your password",
    resetTitle: "Choose a new password",
    email: "Email address",
    password: "Password",
    newPassword: "New password",
    forgotPassword: "Forgot password?",
    resendVerification: "Resend verification email",
    sendInstructions: "Send instructions",
    resetPassword: "Reset password",
    registrationSent: "If eligible, verification instructions will be sent to your email.",
    recoverySent: "If the account exists, password reset instructions will be sent.",
    verificationComplete: "Email verified. You can now sign in.",
    verificationFailed: "This verification link is invalid or expired. Request a new one.",
    passwordResetComplete: "Password reset. You can now sign in.",
    resetLinkInvalid: "This password reset link is invalid or expired. Request a new one.",
    displayName: "Your name",
    profile: "Profile",
    profileLocale: "Language preference",
    saveProfile: "Save profile",
    savingProfile: "Saving profile",
    profileSaved: "Profile updated",
    profileSaveFailed: "Could not update your profile. Please try again.",
    authLoading: "Checking your session",
    authFailed: "Unable to sign in. Check your details and try again.",
    signOut: "Sign out",
    close: "Close",
    walletBalance: "Current balance",
    walletTopUp: "Top up balance",
    walletWorks: "work credits",
    walletLoadFailed: "Could not load balance. Please refresh.",
    walletHistory: "Billing activity",
    walletHistoryLoading: "Loading transactions…",
    walletHistoryEmpty: "No transactions yet.",
    walletHistoryFailed: "Could not load billing activity. Please refresh.",
    walletTransactionTopUp: "Wallet top-up",
    walletTransactionWork: "AI work",
    walletTransactionRefund: "Work refund",
    walletTransactionPurchase: "Marketplace purchase",
    walletTransactionSandbox: "sandbox · no real payment",
    walletTransactionPending: "Processing",
    walletTransactionSettled: "Completed",
    walletTransactionRefunded: "Refunded",
    walletTransactionReference: "Receipt reference",
    walletTopUpTitle: "Add balance",
    walletTopUpCopy: "Choose a package to add work credits to your account.",
    walletPaymentMethod: "Sandbox payment method",
    walletStarterPackage: "Starter",
    walletValuePackage: "Best value",
    walletEachWork: "Per work",
    walletSandboxNotice: "Sandbox top-up — no real payment is collected.",
    walletSandboxDisabled: "Sandbox top-ups are disabled here. No payment was made.",
    walletTopUpAction: "Add package",
    walletTopUpPending: "Adding balance…",
    walletTopUpFailed: "Could not top up balance. Please try again.",
    createDraft: "New presentation",
    generationTitle: "Create with AI",
    generationCopy: "Choose a format, describe your topic and preview the scope before generating.",
    generationFormat: "Format",
    generationPresentationType: "Presentation",
    generationPrompt: "Topic and requirements",
    generationPromptPlaceholder: "Describe your topic, audience, and any requirements...",
    generationLanguage: "Output language",
    generationSlides: "Number of slides",
    generationItemCount: "Output size",
    generationSlidesUnit: "slides",
    generationSectionsUnit: "sections",
    generationQuestionsUnit: "questions",
    generationCluesUnit: "clues",
    generationTermsUnit: "terms",
    generationPreview: "Preview",
    generationPreviewTopic: "Topic",
    generationTopicPlaceholder: "Your topic will appear here",
    generationSubmit: "Generate presentation",
    generationDraftSubmit: "Generate editable draft",
    generationDraftReady: "Draft ready. You can edit it below before saving.",
    generationSubmitting: "Starting generation",
    generationQueued: "Generation queued",
    generationRunning: "Creating your presentation",
    generationSucceeded: "Your presentation is ready",
    generationFailed: "Generation failed",
    generationRequestFailed: "Could not start generation. Please try again.",
    generationSaveOpen: "Save and open",
    generationSaving: "Saving presentation",
    generationSaveFailed: "Could not save the generated presentation.",
    generationRequired: "Describe the presentation you want to create.",
    loadingProjects: "Loading your presentations",
    emptyProjects: "No presentations yet",
    emptyProjectsCopy: "Start with a blank deck and build from there.",
    lastUpdated: "Updated",
    deletePresentation: "Delete presentation",
    deleteConfirm: "Move this presentation to the archive?",
    createFailed: "Could not create the presentation. Please try again.",
    presentations: "My presentations",
    openPresentation: "Open presentation",
    openingPresentation: "Opening presentation",
    backToLibrary: "Back to presentations",
    presentationTitle: "Presentation title",
    discardChanges: "Discard unsaved changes?",
    alternativeText: "Alternative text",
    saveChanges: "Save changes",
    savingChanges: "Saving changes",
    saveFailed: "Could not save the presentation. Please try again.",
    openFailed: "Could not open the presentation. Please try again.",
    presentationSaved: "Presentation saved",
    slideCount: "slides",
    elementCount: "elements",
    slide: "Slide",
    textElements: "Text elements",
    elements: "Elements",
    textContent: "Text content",
    addText: "Add text",
    newText: "Text",
    addRectangle: "Add rectangle",
    addEllipse: "Add ellipse",
    deleteElement: "Delete selected element",
    rectangle: "Rectangle",
    ellipse: "Ellipse",
    addSlide: "Add slide",
    removeSlide: "Remove slide",
    moveSlideUp: "Move slide up",
    moveSlideDown: "Move slide down",
    position: "Position and size",
    textStyle: "Text style",
    fontSize: "Font size",
    textColor: "Text color",
    fillColor: "Fill color",
    backgroundColor: "Slide background",
    alignment: "Alignment",
    leftAlign: "Left",
    centerAlign: "Center",
    rightAlign: "Right",
    slideNotes: "Speaker notes",
    addImage: "Add image",
    invalidImage: "Choose an image under 2 MB.",
    exportPptx: "Export PPTX",
    exportPdf: "Export PDF",
    exportQueued: "Export queued",
    exportRunning: "Preparing export",
    exportFailed: "Export failed. Please try again.",
    exportReady: "Export ready",
    exportDownload: "Download",
    saveBeforeExport: "Save your changes before exporting.",
    exportRequestFailed: "Could not start the export. Please try again.",
    undo: "Undo",
    redo: "Redo",
};

const translations = {
  en,
  ru: {
    workspace: "Рабочее пространство",
    home: "Главная",
    library: "Мои презентации",
    create: "Создать с ИИ",
    marketplace: "Маркетплейс",
    purchases: "Покупки",
    account: "Аккаунт",
    accountDescription: "Управляйте профилем, балансом и историей операций.",
    accountBilling: "Баланс и платежи",
    sellerPayout: "Выплаты продавцу",
    sellerPayoutUnavailable: "Выплаты станут доступны после подключения проверенного платёжного провайдера. Slideforge не собирает номера карт и коды безопасности.",
    sellerPayoutPending: "Безопасная выплата пока не настроена.",
    coming: "Будет доступно в следующих этапах",
    foundation: "Ваши идеи в лучшем свете.",
    intro: "Продуманное пространство для презентаций. Подключение к API Slideforge уже заложено в основу.",
    status: "Состояние платформы",
    api: "Основа API",
    checking: "Проверяем API",
    ready: "Эндпоинт доступен",
    unavailable: "Нет соединения с API",
    docs: "Документация API",
    docsCopy: "Открыть контракт API",
    model: "Общая модель презентации",
    modelCopy: "Канонический JSON и проверенные операции редактирования",
    export: "Экспорт презентаций",
    exportCopy: "Редактируемый PowerPoint и преобразование в PDF",
    roadmap: "Ход разработки",
    language: "Сменить язык",
    signIn: "Войти",
    register: "Создать аккаунт",
    loginTitle: "Войдите в рабочее пространство",
    registerTitle: "Создайте аккаунт Slideforge",
    forgotTitle: "Сброс пароля",
    resetTitle: "Придумайте новый пароль",
    email: "Электронная почта",
    password: "Пароль",
    newPassword: "Новый пароль",
    forgotPassword: "Забыли пароль?",
    resendVerification: "Отправить письмо для подтверждения ещё раз",
    sendInstructions: "Отправить инструкции",
    resetPassword: "Сбросить пароль",
    registrationSent: "Если действие доступно, инструкции для подтверждения отправлены на вашу почту.",
    recoverySent: "Если аккаунт существует, инструкции для сброса пароля будут отправлены.",
    verificationComplete: "Почта подтверждена. Теперь можно войти.",
    verificationFailed: "Ссылка для подтверждения недействительна или устарела. Запросите новую.",
    passwordResetComplete: "Пароль изменён. Теперь можно войти.",
    resetLinkInvalid: "Ссылка для сброса пароля недействительна или устарела. Запросите новую.",
    displayName: "Ваше имя",
    profile: "Профиль",
    profileLocale: "Язык интерфейса",
    saveProfile: "Сохранить профиль",
    savingProfile: "Сохраняем профиль",
    profileSaved: "Профиль обновлён",
    profileSaveFailed: "Не удалось обновить профиль. Попробуйте ещё раз.",
    authLoading: "Проверяем сессию",
    authFailed: "Не удалось войти. Проверьте данные и попробуйте снова.",
    signOut: "Выйти",
    close: "Закрыть",
    walletBalance: "Текущий баланс",
    walletTopUp: "Пополнить баланс",
    walletWorks: "работ",
    walletLoadFailed: "Не удалось загрузить баланс. Обновите страницу.",
    walletHistory: "История операций",
    walletHistoryLoading: "Загружаем операции…",
    walletHistoryEmpty: "Операций пока нет.",
    walletHistoryFailed: "Не удалось загрузить историю операций. Обновите страницу.",
    walletTransactionTopUp: "Пополнение кошелька",
    walletTransactionWork: "Работа с ИИ",
    walletTransactionRefund: "Возврат за работу",
    walletTransactionPurchase: "Покупка на маркетплейсе",
    walletTransactionSandbox: "тест · реальная оплата не списывалась",
    walletTransactionPending: "Обрабатывается",
    walletTransactionSettled: "Завершено",
    walletTransactionRefunded: "Возвращено",
    walletTransactionReference: "Номер квитанции",
    walletTopUpTitle: "Пополнить баланс",
    walletTopUpCopy: "Выберите пакет, чтобы добавить работы на баланс.",
    walletPaymentMethod: "Способ тестовой оплаты",
    walletStarterPackage: "Стартовый",
    walletValuePackage: "Выгодный",
    walletEachWork: "За работу",
    walletSandboxNotice: "Тестовое пополнение — реальная оплата не списывается.",
    walletSandboxDisabled: "Тестовое пополнение отключено. Оплата не производилась.",
    walletTopUpAction: "Добавить пакет",
    walletTopUpPending: "Пополняем баланс…",
    walletTopUpFailed: "Не удалось пополнить баланс. Попробуйте ещё раз.",
    createDraft: "Новая презентация",
    generationTitle: "Создать с помощью ИИ",
    generationCopy: "Выберите формат, опишите тему и проверьте объём перед созданием.",
    generationFormat: "Формат",
    generationPresentationType: "Презентация",
    generationPrompt: "Тема и требования",
    generationPromptPlaceholder: "Опишите тему, аудиторию и требования...",
    generationLanguage: "Язык результата",
    generationSlides: "Количество слайдов",
    generationItemCount: "Объём результата",
    generationSlidesUnit: "слайдов",
    generationSectionsUnit: "разделов",
    generationQuestionsUnit: "вопросов",
    generationCluesUnit: "слов",
    generationTermsUnit: "терминов",
    generationPreview: "Предпросмотр",
    generationPreviewTopic: "Тема",
    generationTopicPlaceholder: "Здесь появится ваша тема",
    generationSubmit: "Создать презентацию",
    generationDraftSubmit: "Создать редактируемый черновик",
    generationDraftReady: "Черновик готов. Отредактируйте его ниже и сохраните.",
    generationSubmitting: "Запускаем создание",
    generationQueued: "Запрос добавлен в очередь",
    generationRunning: "Создаём презентацию",
    generationSucceeded: "Презентация готова",
    generationFailed: "Не удалось создать презентацию",
    generationRequestFailed: "Не удалось запустить создание. Попробуйте ещё раз.",
    generationSaveOpen: "Сохранить и открыть",
    generationSaving: "Сохраняем презентацию",
    generationSaveFailed: "Не удалось сохранить созданную презентацию.",
    generationRequired: "Опишите презентацию, которую хотите создать.",
    loadingProjects: "Загружаем презентации",
    emptyProjects: "Презентаций пока нет",
    emptyProjectsCopy: "Начните с пустой презентации.",
    lastUpdated: "Обновлено",
    deletePresentation: "Удалить презентацию",
    deleteConfirm: "Переместить презентацию в архив?",
    createFailed: "Не удалось создать презентацию. Попробуйте ещё раз.",
    presentations: "Мои презентации",
    openPresentation: "Открыть презентацию",
    openingPresentation: "Открываем презентацию",
    backToLibrary: "Назад к презентациям",
    presentationTitle: "Название презентации",
    discardChanges: "Отменить несохранённые изменения?",
    alternativeText: "Альтернативный текст",
    saveChanges: "Сохранить изменения",
    savingChanges: "Сохраняем изменения",
    saveFailed: "Не удалось сохранить презентацию. Попробуйте ещё раз.",
    openFailed: "Не удалось открыть презентацию. Попробуйте ещё раз.",
    presentationSaved: "Презентация сохранена",
    slideCount: "слайдов",
    elementCount: "элементов",
    slide: "Слайд",
    textElements: "Текстовые элементы",
    elements: "Элементы",
    textContent: "Содержание текста",
    addText: "Добавить текст",
    newText: "Текст",
    addRectangle: "Добавить прямоугольник",
    addEllipse: "Добавить эллипс",
    deleteElement: "Удалить выбранный элемент",
    rectangle: "Прямоугольник",
    ellipse: "Эллипс",
    addSlide: "Добавить слайд",
    removeSlide: "Удалить слайд",
    moveSlideUp: "Переместить слайд вверх",
    moveSlideDown: "Переместить слайд вниз",
    position: "Положение и размер",
    textStyle: "Стиль текста",
    fontSize: "Размер шрифта",
    textColor: "Цвет текста",
    fillColor: "Цвет заливки",
    backgroundColor: "Фон слайда",
    alignment: "Выравнивание",
    leftAlign: "Слева",
    centerAlign: "По центру",
    rightAlign: "Справа",
    slideNotes: "Заметки докладчика",
    addImage: "Добавить изображение",
    invalidImage: "Выберите изображение размером до 2 МБ.",
    exportPptx: "Экспорт PPTX",
    exportPdf: "Экспорт PDF",
    exportQueued: "Экспорт в очереди",
    exportRunning: "Подготавливаем экспорт",
    exportFailed: "Не удалось выполнить экспорт. Попробуйте ещё раз.",
    exportReady: "Экспорт готов",
    exportDownload: "Скачать",
    saveBeforeExport: "Сохраните изменения перед экспортом.",
    exportRequestFailed: "Не удалось запустить экспорт. Попробуйте ещё раз.",
    undo: "Отменить",
    redo: "Повторить",
  },
  uz: {
    ...en,
    ...{
      workspace: "Ish maydoni",
      home: "Bosh sahifa",
      library: "Taqdimotlarim",
      create: "AI bilan yaratish",
      marketplace: "Marketpleys",
      purchases: "Xaridlar",
      account: "Hisob",
      accountDescription: "Profil, balans va toʻlovlar tarixini boshqaring.",
      accountBilling: "Balans va toʻlovlar",
      sellerPayout: "Sotuvchi toʻlovlari",
      sellerPayoutUnavailable: "Sotuvchi toʻlovlari tasdiqlangan toʻlov provayderi ulangandan soʻng ishlaydi. Slideforge karta raqami yoki xavfsizlik kodlarini yigʻmaydi.",
      sellerPayoutPending: "Xavfsiz toʻlov tizimi hali sozlanmagan.",
      coming: "Keyingi bosqichda mavjud boʻladi",
      foundation: "Gʻoyalaringizni yorqin namoyish eting.",
      intro: "Taqdimotlar yaratish uchun qulay ish maydoni. Slideforge API bilan ulanish tayyorlanmoqda.",
      status: "Platforma holati",
      api: "API holati",
      checking: "API tekshirilmoqda",
      ready: "API ishlayapti",
      unavailable: "API bilan aloqa yoʻq",
      docs: "API hujjatlari",
      docsCopy: "Ishlayotgan API tavsifini koʻrish",
      model: "Umumiy taqdimot modeli",
      modelCopy: "Tekshirilgan tahrirlash amallariga ega JSON modeli",
      export: "Taqdimotni eksport qilish",
      exportCopy: "PDF formatiga aylantirish imkoniyatiga ega PowerPoint",
      roadmap: "Ishlab chiqish jarayoni",
      language: "Tilni almashtirish",
      signIn: "Kirish",
      register: "Hisob yaratish",
      loginTitle: "Ish maydoningizga kiring",
      registerTitle: "Slideforge hisobini yarating",
      forgotTitle: "Parolni tiklash",
      resetTitle: "Yangi parol oʻrnating",
      email: "Elektron pochta",
      password: "Parol",
      newPassword: "Yangi parol",
      forgotPassword: "Parol esdan chiqdimi?",
      resendVerification: "Tasdiqlash xatini qayta yuborish",
      sendInstructions: "Koʻrsatmalarni yuborish",
      resetPassword: "Parolni tiklash",
      registrationSent: "Agar hisob mos kelsa, tasdiqlash koʻrsatmalari yuboriladi.",
      recoverySent: "Agar hisob mavjud boʻlsa, tiklash koʻrsatmalari yuboriladi.",
      verificationComplete: "Elektron pochta tasdiqlandi. Endi kirishingiz mumkin.",
      verificationFailed: "Tasdiqlash havolasi notoʻgʻri yoki muddati tugagan.",
      passwordResetComplete: "Parol yangilandi. Endi kirishingiz mumkin.",
      resetLinkInvalid: "Parolni tiklash havolasi notoʻgʻri yoki muddati tugagan.",
      displayName: "Ismingiz",
      profile: "Profil",
      profileLocale: "Til sozlamasi",
      saveProfile: "Profilni saqlash",
      savingProfile: "Profil saqlanmoqda",
      profileSaved: "Profil yangilandi",
      profileSaveFailed: "Profilni yangilab boʻlmadi. Qayta urinib koʻring.",
      authLoading: "Sessiya tekshirilmoqda",
      authFailed: "Kirish amalga oshmadi. Maʼlumotlaringizni tekshiring.",
      signOut: "Chiqish",
      close: "Yopish",
      walletBalance: "Joriy balans",
      walletTopUp: "Balansni toʻldirish",
      walletWorks: "ta ish",
      walletLoadFailed: "Balansni yuklab boʻlmadi. Sahifani yangilang.",
      walletHistory: "Toʻlovlar tarixi",
      walletHistoryLoading: "Amaliyotlar yuklanmoqda…",
      walletHistoryEmpty: "Hozircha amaliyotlar yoʻq.",
      walletHistoryFailed: "Toʻlovlar tarixini yuklab boʻlmadi. Sahifani yangilang.",
      walletTransactionTopUp: "Hamyonni toʻldirish",
      walletTransactionWork: "AI ishi",
      walletTransactionRefund: "Ish uchun qaytarim",
      walletTransactionPurchase: "Marketplace xaridi",
      walletTransactionSandbox: "sinov · haqiqiy toʻlov olinmagan",
      walletTransactionPending: "Jarayonda",
      walletTransactionSettled: "Yakunlandi",
      walletTransactionRefunded: "Qaytarildi",
      walletTransactionReference: "Kvitansiya raqami",
      walletTopUpTitle: "Balansni toʻldirish",
      walletTopUpCopy: "Balansingizga ish birliklarini qoʻshish uchun paket tanlang.",
      walletPaymentMethod: "Sinov toʻlov usuli",
      walletStarterPackage: "Boshlangʻich",
      walletValuePackage: "Tejamkor",
      walletEachWork: "Bir ish narxi",
      walletSandboxNotice: "Sinov toʻlovi — haqiqiy pul yechilmaydi.",
      walletSandboxDisabled: "Bu yerda sinov rejimi oʻchiq. Toʻlov amalga oshmadi.",
      walletTopUpAction: "Paketni qoʻshish",
      walletTopUpPending: "Balans toʻldirilmoqda…",
      walletTopUpFailed: "Balansni toʻldirib boʻlmadi. Qayta urinib koʻring.",
      createDraft: "Yangi taqdimot",
      generationTitle: "AI yordamida yarating",
      generationCopy: "Formatni tanlang, mavzuni yozing va yaratishdan oldin hajmni koʻring.",
      generationFormat: "Format",
      generationPresentationType: "Taqdimot",
      generationPrompt: "Mavzu va talablar",
      generationPromptPlaceholder: "Mavzu, auditoriya va talablaringizni yozing...",
      generationLanguage: "Natija tili",
      generationSlides: "Slaydlar soni",
      generationItemCount: "Natija hajmi",
      generationSlidesUnit: "slayd",
      generationSectionsUnit: "boʻlim",
      generationQuestionsUnit: "savol",
      generationCluesUnit: "topishmoq",
      generationTermsUnit: "atama",
      generationPreview: "Koʻrinish",
      generationPreviewTopic: "Mavzu",
      generationTopicPlaceholder: "Mavzuingiz shu yerda koʻrinadi",
      generationSubmit: "Taqdimot yaratish",
      generationDraftSubmit: "Tahrirlanadigan qoralama yaratish",
      generationDraftReady: "Qoralama tayyor. Saqlashdan oldin uni quyida tahrirlashingiz mumkin.",
      generationSubmitting: "Yaratish boshlanmoqda",
      generationQueued: "Soʻrov navbatga qoʻshildi",
      generationRunning: "Taqdimot yaratilmoqda",
      generationSucceeded: "Taqdimot tayyor",
      generationFailed: "Taqdimotni yaratib boʻlmadi",
      generationRequestFailed: "Yaratishni boshlash amalga oshmadi.",
      generationSaveOpen: "Saqlash va ochish",
      generationSaving: "Taqdimot saqlanmoqda",
      generationSaveFailed: "Yaratilgan taqdimotni saqlab boʻlmadi.",
      generationRequired: "Yaratmoqchi boʻlgan taqdimotingizni tasvirlab bering.",
      loadingProjects: "Taqdimotlaringiz yuklanmoqda",
      emptyProjects: "Hozircha taqdimot yoʻq",
      emptyProjectsCopy: "Yangi boʻsh taqdimotdan boshlang.",
      lastUpdated: "Yangilangan",
      deletePresentation: "Taqdimotni oʻchirish",
      deleteConfirm: "Bu taqdimotni arxivga oʻtkazilsinmi?",
      createFailed: "Taqdimotni yaratib boʻlmadi. Qayta urinib koʻring.",
      presentations: "Taqdimotlarim",
      openPresentation: "Taqdimotni ochish",
      openingPresentation: "Taqdimot ochilmoqda",
      backToLibrary: "Taqdimotlarga qaytish",
      presentationTitle: "Taqdimot sarlavhasi",
      discardChanges: "Saqlanmagan oʻzgarishlar bekor qilinsinmi?",
      alternativeText: "Muqobil matn",
      saveChanges: "Oʻzgarishlarni saqlash",
      savingChanges: "Oʻzgarishlar saqlanmoqda",
      saveFailed: "Taqdimotni saqlab boʻlmadi. Qayta urinib koʻring.",
      openFailed: "Taqdimotni ochib boʻlmadi. Qayta urinib koʻring.",
      presentationSaved: "Taqdimot saqlandi",
      slideCount: "slayd",
      elementCount: "element",
      slide: "Slayd",
      textElements: "Matn elementlari",
      elements: "Elementlar",
      textContent: "Matn mazmuni",
      addText: "Matn qoʻshish",
      newText: "Matn",
      addRectangle: "Toʻrtburchak qoʻshish",
      addEllipse: "Ellips qoʻshish",
      deleteElement: "Tanlangan elementni oʻchirish",
      rectangle: "Toʻrtburchak",
      ellipse: "Ellips",
      addSlide: "Slayd qoʻshish",
      removeSlide: "Slaydni oʻchirish",
      moveSlideUp: "Slaydni yuqoriga surish",
      moveSlideDown: "Slaydni pastga surish",
      position: "Joylashuv va oʻlcham",
      textStyle: "Matn uslubi",
      fontSize: "Shrift oʻlchami",
      textColor: "Matn rangi",
      fillColor: "Toʻldirish rangi",
      backgroundColor: "Slayd foni",
      alignment: "Tekislash",
      leftAlign: "Chapga",
      centerAlign: "Markazga",
      rightAlign: "Oʻngga",
      slideNotes: "Taqdimotchi qaydlari",
      addImage: "Rasm qoʻshish",
      invalidImage: "2 MB dan kichik rasm tanlang.",
      exportPptx: "PPTX eksporti",
      exportPdf: "PDF eksporti",
      exportQueued: "Eksport navbatga qoʻshildi",
      exportRunning: "Eksport tayyorlanmoqda",
      exportFailed: "Eksport amalga oshmadi. Qayta urinib koʻring.",
      exportReady: "Eksport tayyor",
      exportDownload: "Yuklab olish",
      saveBeforeExport: "Eksportdan oldin oʻzgarishlarni saqlang.",
      exportRequestFailed: "Eksportni boshlash amalga oshmadi.",
      undo: "Bekor qilish",
      redo: "Qaytarish",
    },
  },
} satisfies Record<Locale, Record<string, string>>;

function App() {
  const [marketplaceActive, setMarketplaceActive] = useState(() =>
    window.location.hash === "#marketplace" || window.location.hash === "#purchases");
  const [accountActive, setAccountActive] = useState(() => window.location.hash === "#account");
  const [marketplaceInitialStage, setMarketplaceInitialStage] = useState<"shop" | "purchases">(() =>
    window.location.hash === "#purchases" ? "purchases" : "shop");
  const [marketplaceAuthOpen, setMarketplaceAuthOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>(() =>
    window.location.pathname.endsWith("/reset-password") ? "reset" : "login");
  const [authUser, setAuthUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [walletTopUpOpen, setWalletTopUpOpen] = useState(false);
  const walletRequestSequence = useRef(0);
  const presentationRequestSequence = useRef(0);
  const [authRestoring, setAuthRestoring] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [authToken] = useState(() => new URLSearchParams(window.location.search).get("token") ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileLocale, setProfileLocale] = useState<Locale>("en");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [presentations, setPresentations] = useState<PresentationSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [creatingPresentation, setCreatingPresentation] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState("");
  const [generationLanguage, setGenerationLanguage] = useState<Locale>("en");
  const [generationSlideCount, setGenerationSlideCount] = useState(6);
  const [creationType, setCreationType] = useState<CreationType>("slides");
  const [generationJob, setGenerationJob] = useState<GenerationJobResponse | null>(null);
  const [generationStarting, setGenerationStarting] = useState(false);
  const [generationSaving, setGenerationSaving] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [artifactGenerationStarting, setArtifactGenerationStarting] = useState(false);
  const [artifactDraft, setArtifactDraft] = useState<ArtifactDocument | null>(null);
  const [editorPresentation, setEditorPresentation] = useState<PresentationDetail | null>(null);
  const [editorDocument, setEditorDocument] = useState<Deck | null>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [activeSlideId, setActiveSlideId] = useState("");
  const [slideNotesDraft, setSlideNotesDraft] = useState("");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedTextDraft, setSelectedTextDraft] = useState("");
  const [editorCanUndo, setEditorCanUndo] = useState(false);
  const [editorCanRedo, setEditorCanRedo] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [editorSaved, setEditorSaved] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);
  const [exportJob, setExportJob] = useState<ExportJobResponse | null>(null);
  const [exportStarting, setExportStarting] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState("");
  const editorHistory = useRef<History | null>(null);
  const imageInput = useRef<HTMLInputElement | null>(null);
  const authVerificationStarted = useRef(false);
  const copy = translations[locale];

  useEffect(() => {
    const updateSection = () => {
      const purchases = window.location.hash === "#purchases";
      const marketplace = window.location.hash === "#marketplace" || purchases;
      const account = window.location.hash === "#account";
      setMarketplaceActive(marketplace);
      setAccountActive(account);
      setMarketplaceInitialStage(purchases ? "purchases" : "shop");
    };
    window.addEventListener("hashchange", updateSection);
    return () => window.removeEventListener("hashchange", updateSection);
  }, []);

  function requireMarketplaceAuth() {
    setAuthMode("login");
    setMarketplaceAuthOpen(true);
  }

  function applySession(session: AuthResponse) {
    if (authUser?.id !== session.user.id) {
      walletRequestSequence.current += 1;
      presentationRequestSequence.current += 1;
      setWallet(null);
      setWalletLoading(true);
      setWalletError("");
      setWalletTopUpOpen(false);
      setPresentations([]);
    }
    setMarketplaceAuthOpen(false);
    setAccessToken(session.accessToken);
    setAuthUser(session.user);
    setLocale(session.user.locale);
    setGenerationLanguage(session.user.locale);
    setProfileName(session.user.displayName);
    setProfileLocale(session.user.locale);
  }

  async function refreshWallet() {
    if (!accessToken) return;
    const requestSequence = ++walletRequestSequence.current;
    const refreshSessionIfCurrent = (session: AuthResponse) => {
      if (requestSequence === walletRequestSequence.current) applySession(session);
    };
    const expireSessionIfCurrent = () => {
      if (requestSequence === walletRequestSequence.current) clearSession();
    };
    try {
      const response = await authorizedFetch(
        "/api/v1/wallet",
        accessToken,
        {},
        refreshSessionIfCurrent,
        expireSessionIfCurrent,
      );
      if (!response.ok) throw new Error(copy.walletLoadFailed);
      const result = await response.json() as WalletResponse;
      if (requestSequence !== walletRequestSequence.current) return;
      setWallet(result);
      setWalletError("");
    } catch (error) {
      if (requestSequence !== walletRequestSequence.current) return;
      setWalletError(error instanceof Error ? error.message : copy.walletLoadFailed);
    }
  }

  async function refreshPresentations() {
    if (!accessToken) return;
    const requestSequence = ++presentationRequestSequence.current;
    setProjectsLoading(true);
    setProjectsError("");
    try {
      const response = await authorizedFetch(
        "/api/v1/presentations?page=0&size=50",
        accessToken,
        {},
        (session) => {
          if (requestSequence === presentationRequestSequence.current) applySession(session);
        },
        () => {
          if (requestSequence === presentationRequestSequence.current) clearSession();
        },
      );
      if (!response.ok) throw new Error(copy.authFailed);
      const result = await response.json() as { items: PresentationSummary[] };
      if (requestSequence !== presentationRequestSequence.current) return;
      setPresentations(result.items);
    } catch (error) {
      if (requestSequence === presentationRequestSequence.current) {
        setProjectsError(error instanceof Error ? error.message : copy.authFailed);
      }
    } finally {
      if (requestSequence === presentationRequestSequence.current) setProjectsLoading(false);
    }
  }

  function clearSession() {
    walletRequestSequence.current += 1;
    presentationRequestSequence.current += 1;
    setAccessToken(null);
    setAuthUser(null);
    setWallet(null);
    setWalletTopUpOpen(false);
    setWalletLoading(false);
    setWalletError("");
    setPresentations([]);
    setEditorPresentation(null);
    setEditorDocument(null);
    setEditorTitle("");
    setActiveSlideId("");
    setSlideNotesDraft("");
    setSelectedElementId(null);
    setSelectedTextDraft("");
    setEditorCanUndo(false);
    setEditorCanRedo(false);
    setEditorError("");
    setEditorSaved(false);
    setEditorDirty(false);
    setExportJob(null);
    setExportStarting(null);
    setExportError("");
    setGenerationJob(null);
    setGenerationStarting(false);
    setGenerationSaving(false);
    setGenerationError("");
    setArtifactGenerationStarting(false);
    setArtifactDraft(null);
    editorHistory.current = null;
  }

  function applyEditorOperation(operation: Op) {
    if (!editorHistory.current) return;
    try {
      const document = editorHistory.current.do(operation);
      setEditorDocument(document);
      setEditorCanUndo(editorHistory.current.canUndo);
      setEditorCanRedo(editorHistory.current.canRedo);
      setEditorSaved(false);
      setEditorDirty(true);
      setEditorError("");
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : copy.saveFailed);
    }
  }

  function commitSelectedText() {
    if (!editorHistory.current || !activeSlideId || !selectedElementId) return;
    const element = editorHistory.current.deck.slides
      .find((slide) => slide.id === activeSlideId)?.elements
      .find((item) => item.id === selectedElementId);
    if (element?.type === "text" && element.text !== selectedTextDraft) {
      applyEditorOperation({
        kind: "updateElement",
        slideId: activeSlideId,
        elementId: selectedElementId,
        patch: { text: selectedTextDraft },
      });
    }
  }

  function commitSlideNotes() {
    const slide = editorHistory.current?.deck.slides.find((item) => item.id === activeSlideId);
    if (slide && (slide.notes ?? "") !== slideNotesDraft) {
      applyEditorOperation({ kind: "setNotes", slideId: activeSlideId, notes: slideNotesDraft });
    }
  }

  function syncSelectedTextDraft(document: Deck) {
    const element = document.slides.find((slide) => slide.id === activeSlideId)?.elements
      .find((item) => item.id === selectedElementId);
    setSelectedTextDraft(element?.type === "text" ? element.text : "");
  }

  function undoEditor() {
    if (!editorHistory.current) return;
    commitSelectedText();
    const document = editorHistory.current.undo();
    setEditorDocument(document);
    syncSelectedTextDraft(document);
    setEditorCanUndo(editorHistory.current.canUndo);
    setEditorCanRedo(editorHistory.current.canRedo);
    setEditorSaved(false);
    setEditorDirty(true);
  }

  function redoEditor() {
    if (!editorHistory.current) return;
    syncSelectedTextDraft(editorHistory.current.deck);
    const document = editorHistory.current.redo();
    setEditorDocument(document);
    syncSelectedTextDraft(document);
    setEditorCanUndo(editorHistory.current.canUndo);
    setEditorCanRedo(editorHistory.current.canRedo);
    setEditorSaved(false);
    setEditorDirty(true);
  }

  useEffect(() => {
    let isCurrent = true;

    fetch(`${API_URL}/api/v1/status`)
      .then((response) => {
        if (!response.ok) throw new Error("API status request failed");
        return response.json() as Promise<{ application: string; status: string }>;
      })
      .then((result) => {
        if (isCurrent) setApiAvailable(result.application === "slideforge-api" && result.status === "available");
      })
      .catch(() => {
        if (isCurrent) setApiAvailable(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    if (window.location.pathname.endsWith("/reset-password")) {
      setAuthRestoring(false);
      return () => {
        isCurrent = false;
      };
    }
    restoreSessionFromCookie()
      .then((session) => {
        if (isCurrent && session) {
          applySession(session);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isCurrent) setAuthRestoring(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!window.location.pathname.endsWith("/verify-email")) return;
    if (authVerificationStarted.current) return;
    authVerificationStarted.current = true;
    let isCurrent = true;
    if (!authToken) {
      setAuthError(copy.verificationFailed);
      return () => {
        isCurrent = false;
      };
    }
    fetch(`${API_URL}/api/v1/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: authToken }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(copy.verificationFailed);
        if (isCurrent) {
          setAuthNotice(copy.verificationComplete);
          setAuthError("");
          setAuthMode("login");
          window.history.replaceState(null, "", "/");
        }
      })
      .catch(() => {
        if (isCurrent) setAuthError(copy.verificationFailed);
      });
    return () => {
      isCurrent = false;
    };
  }, [authToken, copy.verificationComplete, copy.verificationFailed]);

  useEffect(() => {
    if (!accessToken) {
      setPresentations([]);
      return;
    }
    let isCurrent = true;
    setProjectsLoading(true);
    setProjectsError("");
    authorizedFetch("/api/v1/presentations?page=0&size=50", accessToken, {}, applySession, () => {
      clearSession();
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(copy.authFailed);
        return response.json() as Promise<{ items: PresentationSummary[] }>;
      })
      .then((result) => {
        if (isCurrent) setPresentations(result.items);
      })
      .catch((error: Error) => {
        if (isCurrent) setProjectsError(error.message);
      })
      .finally(() => {
        if (isCurrent) setProjectsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [accessToken, copy.authFailed]);

  useEffect(() => {
    let isCurrent = true;
    const requestSequence = ++walletRequestSequence.current;
    if (!accessToken) {
      setWallet(null);
      setWalletError("");
      setWalletLoading(false);
      return;
    }
    setWalletLoading(true);
    authorizedFetch("/api/v1/wallet", accessToken, {}, (session) => {
      if (isCurrent && requestSequence === walletRequestSequence.current) applySession(session);
    }, () => {
      if (isCurrent && requestSequence === walletRequestSequence.current) clearSession();
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(copy.walletLoadFailed);
        return await response.json() as WalletResponse;
      })
      .then((result) => {
        if (!isCurrent || requestSequence !== walletRequestSequence.current) return;
        setWallet(result);
        setWalletError("");
      })
      .catch((error: unknown) => {
        if (!isCurrent || requestSequence !== walletRequestSequence.current) return;
        setWalletError(error instanceof Error ? error.message : copy.walletLoadFailed);
      })
      .finally(() => {
        if (isCurrent && requestSequence === walletRequestSequence.current) setWalletLoading(false);
      });
    return () => { isCurrent = false; };
  }, [accessToken, copy.walletLoadFailed]);

  useEffect(() => {
    if (!accessToken || !exportJob || (exportJob.status !== "QUEUED" && exportJob.status !== "RUNNING")) return;
    let isCurrent = true;
    let timeout: number;
    const poll = async () => {
      try {
        const response = await authorizedFetch(`/api/v1/exports/${exportJob.id}`, accessToken, {}, applySession, clearSession);
        if (!response.ok) throw new Error(copy.exportFailed);
        const updated = await response.json() as ExportJobResponse;
        if (!isCurrent) return;
        setExportJob(updated);
        if (updated.status === "QUEUED" || updated.status === "RUNNING") {
          timeout = window.setTimeout(poll, 1200);
        }
      } catch {
        if (!isCurrent) return;
        setExportError(copy.exportFailed);
        timeout = window.setTimeout(poll, 5000);
      }
    };
    timeout = window.setTimeout(poll, 1200);
    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [accessToken, copy.exportFailed, exportJob?.id, exportJob?.status]);

  useEffect(() => {
    if (!accessToken || !generationJob || (generationJob.status !== "QUEUED" && generationJob.status !== "RUNNING")) return;
    let isCurrent = true;
    let timeout: number;
    const poll = async () => {
      try {
        const response = await authorizedFetch(`/api/v1/generations/${generationJob.id}`, accessToken, {}, applySession, clearSession);
        if (!response.ok) throw new Error(copy.generationFailed);
        const updated = await response.json() as GenerationJobResponse;
        if (!isCurrent) return;
        setGenerationJob(updated);
        if (updated.status === "QUEUED" || updated.status === "RUNNING") {
          timeout = window.setTimeout(poll, 1200);
        }
      } catch {
        if (!isCurrent) return;
        setGenerationError(copy.generationFailed);
        timeout = window.setTimeout(poll, 5000);
      }
    };
    timeout = window.setTimeout(poll, 1200);
    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [accessToken, copy.generationFailed, generationJob?.id, generationJob?.status]);

  useEffect(() => {
    if (!accessToken || !generationJob || generationJob.status === "QUEUED" || generationJob.status === "RUNNING") return;
    void refreshWallet();
  }, [accessToken, generationJob?.status]);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError("");
    setAuthNotice("");
    try {
      const registering = authMode === "register";
      const body = registering ? { email, password, displayName, locale } : { email, password };
      const response = await fetch(`${API_URL}/api/v1/auth/${registering ? "register" : "login"}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (registering) {
        if (!response.ok) {
          const problem = await response.json().catch(() => null) as { detail?: string } | null;
          throw new Error(problem?.detail ?? copy.authFailed);
        }
        setAuthMode("login");
        setAuthNotice(copy.registrationSent);
        setPassword("");
        return;
      }
      const result = response.ok ? await response.json() as AuthResponse : null;
      if (!result) {
        const problem = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(problem?.detail ?? copy.authFailed);
      }
      applySession(result);
      setPassword("");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : copy.authFailed);
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function submitAuthAction(event: React.SyntheticEvent, resendVerification = false) {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError("");
    setAuthNotice("");
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/${resendVerification ? "verify/request" : "password/forgot"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error(copy.authFailed);
      setAuthNotice(resendVerification ? copy.registrationSent : copy.recoverySent);
      setAuthMode("login");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : copy.authFailed);
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function submitPasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) {
      setAuthError(copy.resetLinkInvalid);
      return;
    }
    setAuthSubmitting(true);
    setAuthError("");
    setAuthNotice("");
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: authToken, newPassword: password }),
      });
      if (!response.ok) throw new Error(copy.resetLinkInvalid);
      setPassword("");
      setAuthMode("login");
      setAuthNotice(copy.passwordResetComplete);
      window.history.replaceState(null, "", "/");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : copy.resetLinkInvalid);
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function signOut() {
    await fetch(`${API_URL}/api/v1/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    clearSession();
  }

  async function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    setProfileSaving(true);
    setProfileError("");
    setProfileSaved(false);
    try {
      const response = await authorizedFetch("/api/v1/users/me", accessToken, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: profileName, locale: profileLocale }),
      }, applySession, () => {
        clearSession();
      });
      if (!response.ok) {
        const problem = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(problem?.detail ?? copy.profileSaveFailed);
      }
      const updatedUser = await response.json() as UserProfile;
      setAuthUser(updatedUser);
      setProfileName(updatedUser.displayName);
      setProfileLocale(updatedUser.locale);
      setLocale(updatedUser.locale);
      setProfileSaved(true);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : copy.profileSaveFailed);
    } finally {
      setProfileSaving(false);
    }
  }

  async function createPresentation() {
    if (!accessToken) return;
    setCreatingPresentation(true);
    setProjectsError("");
    const title = locale === "ru" ? "Новая презентация" : "Untitled presentation";
    const deckId = crypto.randomUUID();
    const document = {
      schemaVersion: 1,
      id: deckId,
      title,
      language: locale,
      size: { width: 1280, height: 720 },
      slides: [{ id: crypto.randomUUID(), elements: [] }],
    };
    try {
      const response = await authorizedFetch("/api/v1/presentations", accessToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, language: locale, document }),
      }, applySession, () => {
        clearSession();
      });
      if (!response.ok) throw new Error(copy.createFailed);
      const created = await response.json() as PresentationSummary;
      setPresentations((current) => [created, ...current]);
    } catch {
      setProjectsError(copy.createFailed);
    } finally {
      setCreatingPresentation(false);
    }
  }

  async function submitGeneration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    setGenerationStarting(true);
    setGenerationError("");
    setGenerationJob(null);
    setArtifactDraft(null);
    try {
      const response = await authorizedFetch("/api/v1/generations", accessToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: generationPrompt.trim(),
          language: generationLanguage,
          slideCount: generationSlideCount,
        }),
      }, applySession, clearSession);
      if (!response.ok) {
        const problem = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(problem?.detail ?? copy.generationRequestFailed);
      }
      setGenerationJob(await response.json() as GenerationJobResponse);
      void refreshWallet();
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : copy.generationRequestFailed);
    } finally {
      setGenerationStarting(false);
    }
  }

  async function submitArtifactDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || creationType === "slides") return;
    setArtifactGenerationStarting(true);
    setGenerationError("");
    setGenerationJob(null);
    setArtifactDraft(null);
    try {
      const response = await authorizedFetch("/api/v1/artifacts/draft", accessToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: creationType,
          prompt: generationPrompt.trim(),
          language: generationLanguage,
          itemCount: generationSlideCount,
        }),
      }, applySession, clearSession);
      if (!response.ok) {
        const problem = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(problem?.detail ?? copy.generationRequestFailed);
      }
      const result = await response.json() as { document: ArtifactDocument };
      setArtifactDraft(result.document);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : copy.generationRequestFailed);
    } finally {
      setArtifactGenerationStarting(false);
      void refreshWallet();
    }
  }

  function submitCreation(event: React.FormEvent<HTMLFormElement>) {
    if (creationType === "slides") {
      void submitGeneration(event);
    } else {
      void submitArtifactDraft(event);
    }
  }

  async function saveAndOpenGeneratedDeck() {
    if (!accessToken || !generationJob?.document) return;
    setGenerationSaving(true);
    setGenerationError("");
    const document = generationJob.document;
    try {
      const response = await authorizedFetch("/api/v1/presentations", accessToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: document.title, language: document.language, document }),
      }, applySession, clearSession);
      if (!response.ok) {
        const problem = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(problem?.detail ?? copy.generationSaveFailed);
      }
      const created = await response.json() as PresentationDetail;
      setPresentations((current) => [created, ...current]);
      await openPresentation(created);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : copy.generationSaveFailed);
    } finally {
      setGenerationSaving(false);
    }
  }

  async function openPresentation(presentation: PresentationSummary) {
    if (!accessToken) return;
    setEditorLoading(true);
    setEditorPresentation(null);
    setEditorError("");
    setProjectsError("");
    try {
      const response = await authorizedFetch(`/api/v1/presentations/${presentation.id}`, accessToken, {}, applySession, () => {
        clearSession();
      });
      if (!response.ok) {
        const problem = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(problem?.detail ?? copy.openFailed);
      }
      const detail = await response.json() as PresentationDetail;
      editorHistory.current = new History(detail.document);
      setEditorPresentation(detail);
      setEditorDocument(detail.document);
      setEditorTitle(detail.document.title);
      setActiveSlideId(detail.document.slides[0]?.id ?? "");
      setSlideNotesDraft(detail.document.slides[0]?.notes ?? "");
      setSelectedElementId(null);
      setSelectedTextDraft("");
      setEditorCanUndo(false);
      setEditorCanRedo(false);
      setEditorDirty(false);
      setExportJob(null);
      setExportError("");
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : copy.openFailed);
    } finally {
      setEditorLoading(false);
    }
  }

  async function savePresentation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !editorPresentation || !editorDocument) return;
    commitSlideNotes();
    commitSelectedText();
    const title = editorTitle.trim();
    if (!title) {
      setEditorError(copy.saveFailed);
      return;
    }
    setEditorSaving(true);
    setEditorError("");
    setEditorSaved(false);
    try {
      const document = { ...(editorHistory.current?.deck ?? editorDocument), title };
      const response = await authorizedFetch(`/api/v1/presentations/${editorPresentation.id}`, accessToken, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: editorPresentation.currentVersion, document }),
      }, applySession, () => {
        clearSession();
      });
      if (!response.ok) {
        const problem = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(problem?.detail ?? copy.saveFailed);
      }
      const updated = await response.json() as PresentationDetail;
      if (editorHistory.current) editorHistory.current.deck = updated.document;
      setEditorPresentation(updated);
      setEditorDocument(updated.document);
      setEditorTitle(updated.document.title);
      setPresentations((current) => current.map((item) => item.id === updated.id
        ? { ...item, title: updated.title, currentVersion: updated.currentVersion, updatedAt: updated.updatedAt }
        : item));
      setEditorSaved(true);
      setEditorDirty(false);
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : copy.saveFailed);
    } finally {
      setEditorSaving(false);
    }
  }

  async function deletePresentation(presentation: PresentationSummary) {
    if (!accessToken || !window.confirm(copy.deleteConfirm)) return;
    const response = await authorizedFetch(`/api/v1/presentations/${presentation.id}`, accessToken, {
      method: "DELETE",
    }, applySession, () => {
      clearSession();
    });
    if (response.ok) {
      setPresentations((current) => current.filter((item) => item.id !== presentation.id));
    } else {
      setProjectsError(copy.authFailed);
    }
  }

  async function startExport(format: ExportFormat) {
    if (!accessToken || !editorPresentation || editorDirty) {
      if (editorDirty) setExportError(copy.saveBeforeExport);
      return;
    }
    setExportStarting(format);
    setExportError("");
    setExportJob(null);
    try {
      const response = await authorizedFetch(`/api/v1/presentations/${editorPresentation.id}/exports`, accessToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, version: editorPresentation.currentVersion }),
      }, applySession, clearSession);
      if (!response.ok) {
        const problem = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(problem?.detail ?? copy.exportRequestFailed);
      }
      setExportJob(await response.json() as ExportJobResponse);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : copy.exportRequestFailed);
    } finally {
      setExportStarting(null);
    }
  }

  async function downloadExport(job: ExportJobResponse) {
    if (!accessToken || !job.downloadUrl) return;
    try {
      const response = await authorizedFetch(job.downloadUrl, accessToken, {}, applySession, clearSession);
      if (!response.ok) throw new Error(copy.exportFailed);
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `slideforge-${job.presentationId}.${job.format}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : copy.exportFailed);
    }
  }

  function closeEditor() {
    if (editorDirty && !window.confirm(copy.discardChanges)) return;
    setEditorPresentation(null);
    setEditorDocument(null);
    editorHistory.current = null;
    setEditorError("");
    setEditorSaved(false);
    setEditorDirty(false);
  }

  const apiStatusText = apiAvailable === null
    ? copy.checking
    : apiAvailable
      ? copy.ready
      : copy.unavailable;
  const activeSlide = editorDocument?.slides.find((slide) => slide.id === activeSlideId);
  const activeSlideIndex = editorDocument?.slides.findIndex((slide) => slide.id === activeSlideId) ?? -1;
  const activeElements = activeSlide?.elements ?? [];
  const selectedElement = activeElements.find((element) => element.id === selectedElementId);
  const selectedText = selectedElement?.type === "text" ? selectedElement : undefined;

  if (authRestoring) {
    return (
      <main className="app-loading-screen" role="status" aria-live="polite">
        <div className="app-loading-card">
          <span className="app-loading-mark"><Layers3 size={24} strokeWidth={2.2} aria-hidden="true" /></span>
          <span className="app-loading-brand">slideforge</span>
          <span className="app-loading-spinner" aria-hidden="true" />
          <strong>{copy.authLoading}</strong>
          <span className="app-loading-caption">{copy.workspace}</span>
        </div>
      </main>
    );
  }

  function addTextElement() {
    if (!editorDocument || !activeSlideId) return;
    const element: TextElement = {
      id: crypto.randomUUID(),
      type: "text",
      x: editorDocument.size.width * 0.08,
      y: editorDocument.size.height * 0.12,
      w: editorDocument.size.width * 0.72,
      h: editorDocument.size.height * 0.16,
      text: copy.newText,
      style: { fontSize: 44, color: "#242a28" },
    };
    applyEditorOperation({ kind: "addElement", slideId: activeSlideId, element });
    setSelectedElementId(element.id);
    setSelectedTextDraft(element.text);
  }

  function addShapeElement(shape: ShapeElement["shape"]) {
    if (!editorDocument || !activeSlideId) return;
    const element: ShapeElement = {
      id: crypto.randomUUID(),
      type: "shape",
      shape,
      x: editorDocument.size.width * 0.34,
      y: editorDocument.size.height * 0.36,
      w: editorDocument.size.width * 0.28,
      h: editorDocument.size.height * 0.28,
      fill: "#dceee1",
    };
    applyEditorOperation({ kind: "addElement", slideId: activeSlideId, element });
    setSelectedElementId(element.id);
    setSelectedTextDraft("");
  }

  function addImageElement(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!editorDocument || !activeSlideId || !file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setEditorError(copy.invalidImage);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setEditorError(copy.invalidImage);
        return;
      }
      const width = Math.min(editorDocument.size.width * 0.5, 480);
      const height = Math.min(editorDocument.size.height * 0.5, 270);
      const element: ImageElement = {
        id: crypto.randomUUID(),
        type: "image",
        x: (editorDocument.size.width - width) / 2,
        y: (editorDocument.size.height - height) / 2,
        w: width,
        h: height,
        dataUri: reader.result,
        alt: file.name,
      };
      const currentDeck = editorHistory.current?.deck;
      if (!currentDeck) return;
      const updatedDocument = {
        ...currentDeck,
        slides: currentDeck.slides.map((slide) => slide.id === activeSlideId
          ? { ...slide, elements: [...slide.elements, element] }
          : slide),
      };
      if (new Blob([JSON.stringify(updatedDocument)]).size > 5 * 1024 * 1024) {
        setEditorError(copy.invalidImage);
        return;
      }
      applyEditorOperation({ kind: "addElement", slideId: activeSlideId, element });
      setSelectedElementId(element.id);
    };
    reader.onerror = () => setEditorError(copy.invalidImage);
    reader.readAsDataURL(file);
  }

  function selectElement(element: Deck["slides"][number]["elements"][number]) {
    commitSelectedText();
    setSelectedElementId(element.id);
    setSelectedTextDraft(element.type === "text" ? element.text : "");
  }

  function deleteSelectedElement() {
    if (!activeSlideId || !selectedElementId) return;
    commitSelectedText();
    applyEditorOperation({ kind: "removeElement", slideId: activeSlideId, elementId: selectedElementId });
    setSelectedElementId(null);
    setSelectedTextDraft("");
  }

  function addSlide() {
    if (!editorDocument) return;
    commitSlideNotes();
    commitSelectedText();
    const slide = { id: crypto.randomUUID(), elements: [] };
    applyEditorOperation({ kind: "addSlide", slide, index: editorDocument.slides.length });
    setActiveSlideId(slide.id);
    setSelectedElementId(null);
    setSelectedTextDraft("");
  }

  function removeActiveSlide() {
    if (!editorDocument || !activeSlide || editorDocument.slides.length <= 1) return;
    const nextActiveSlide = editorDocument.slides[Math.max(0, activeSlideIndex - 1)]!;
    applyEditorOperation({ kind: "removeSlide", slideId: activeSlide.id });
    setActiveSlideId(nextActiveSlide.id);
    setSelectedElementId(null);
    setSelectedTextDraft("");
  }

  function moveActiveSlide(toIndex: number) {
    if (!activeSlide || activeSlideIndex < 0) return;
    applyEditorOperation({ kind: "moveSlide", slideId: activeSlide.id, toIndex });
  }

  function updateSelectedGeometry(property: "x" | "y" | "w" | "h", value: number) {
    if (!selectedElement || !editorDocument || !activeSlideId || !Number.isFinite(value)) return;
    const maximum = property === "x" ? editorDocument.size.width - selectedElement.w
      : property === "y" ? editorDocument.size.height - selectedElement.h
        : property === "w" ? editorDocument.size.width - selectedElement.x
          : editorDocument.size.height - selectedElement.y;
    const minimum = property === "x" || property === "y" ? 0 : 1;
    const nextValue = Math.round(Math.max(minimum, Math.min(value, maximum)));
    applyEditorOperation({
      kind: "updateElement",
      slideId: activeSlideId,
      elementId: selectedElement.id,
      patch: { [property]: nextValue },
    });
  }

  function updateSelectedStyle(patch: Record<string, unknown>) {
    if (!selectedText || !activeSlideId) return;
    applyEditorOperation({
      kind: "updateElement",
      slideId: activeSlideId,
      elementId: selectedText.id,
      patch: { style: { ...selectedText.style, ...patch } },
    });
    if ("text" in patch) setSelectedTextDraft(String(patch.text));
  }

  function updateSelectedShape(fill: string) {
    if (selectedElement?.type !== "shape" || !activeSlideId) return;
    applyEditorOperation({
      kind: "updateElement",
      slideId: activeSlideId,
      elementId: selectedElement.id,
      patch: { fill },
    });
  }

  function updateSlideBackground(color: string) {
    if (!activeSlideId) return;
    applyEditorOperation({ kind: "setBackground", slideId: activeSlideId, color });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#workspace" aria-label="Slideforge workspace">
          <span className="brand-mark"><Layers3 size={21} strokeWidth={2.2} /></span>
          <span>slideforge</span>
        </a>
        <div className="workspace-label">{copy.workspace}</div>
        <nav className="side-nav" aria-label={copy.workspace}>
          <a
            className={!marketplaceActive && !accountActive ? "nav-item nav-item-active" : "nav-item"}
            href="#workspace"
            aria-current={!marketplaceActive && !accountActive ? "page" : undefined}
          >
            <Home size={17} aria-hidden="true" />
            <span>{copy.home}</span>
          </a>
          <a
            className={marketplaceActive && marketplaceInitialStage === "shop" ? "nav-item nav-item-active" : "nav-item"}
            href="#marketplace"
            aria-current={marketplaceActive && marketplaceInitialStage === "shop" ? "page" : undefined}
          >
            <Boxes size={17} aria-hidden="true" />
            <span>{copy.marketplace}</span>
          </a>
          <a
            className={marketplaceActive && marketplaceInitialStage === "purchases" ? "nav-item nav-item-active" : "nav-item"}
            href="#purchases"
            aria-current={marketplaceActive && marketplaceInitialStage === "purchases" ? "page" : undefined}
          >
            <BookOpen size={17} aria-hidden="true" />
            <span>{copy.purchases}</span>
          </a>
          <a
            className={accountActive ? "nav-item nav-item-active" : "nav-item"}
            href="#account"
            aria-current={accountActive ? "page" : undefined}
          >
            <UserRound size={17} aria-hidden="true" />
            <span>{copy.account}</span>
          </a>
        </nav>
        <div className="sidebar-footer">
          {authUser && accessToken && !accountActive && (
            <WalletPanel
              accessToken={accessToken}
              locale={locale}
              copy={copy}
              wallet={wallet}
              loading={walletLoading}
              loadError={walletError}
              dialogOpen={walletTopUpOpen}
              onDialogOpenChange={setWalletTopUpOpen}
              onWalletChange={setWallet}
              applySession={applySession}
              clearSession={clearSession}
            />
          )}
          {/* <a className="help-link" href="/ROADMAP.md">
            <CircleHelp size={16} aria-hidden="true" />
            <span>{copy.roadmap}</span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </a> */}
        </div>
      </aside>

      <main id="workspace" className="main-panel">
        <header className="topbar">
          <span className="breadcrumb">
            {copy.workspace}
            <span>/</span>
            <strong>{marketplaceActive
              ? marketplaceInitialStage === "purchases" ? copy.purchases : copy.marketplace
              : accountActive ? copy.account : copy.home}</strong>
            <div className="version-mark"><span />{authUser ? authUser.displayName : "Phase 2 · Core data"}</div>
          </span>
          <div className="mr-5">
            {authUser && (
              <button className="text-button" type="button" title={copy.signOut} aria-label={copy.signOut} onClick={signOut}>
                <LogOut size={16} aria-hidden="true" />
              </button>
            )}
            <button
              className="language-button"
              type="button"
              title={copy.language}
              aria-label={copy.language}
              onClick={() => setLocale(locale === "en" ? "ru" : locale === "ru" ? "uz" : "en")}
            >
              <Globe2 size={17} aria-hidden="true" />
              {locale.toUpperCase()}
            </button>
          </div>
        </header>

        {!marketplaceActive && !accountActive && <section className="welcome-section" aria-labelledby="welcome-title">
          <div className="eyebrow"><span className="eyebrow-dot" />{copy.status}</div>
          <h1 id="welcome-title">{copy.foundation}</h1>
          <p className="welcome-copy">{copy.intro}</p>
          <div className="status-row" role="status" aria-live="polite">
            <div className="status-glyph"><Settings2 size={18} aria-hidden="true" /></div>
            <div><strong>{copy.api}</strong><span>{apiStatusText}</span></div>
            <span className={`status-indicator ${apiAvailable === null ? "status-checking" : apiAvailable ? "" : "status-unavailable"}`} aria-label={apiStatusText} />
          </div>
        </section>}

        {!authUser && !authRestoring && (!marketplaceActive || marketplaceAuthOpen) && (
          <div className={marketplaceActive ? "market-auth-overlay" : undefined}>
            {marketplaceActive && (
              <button
                className="market-auth-close"
                type="button"
                onClick={() => setMarketplaceAuthOpen(false)}
              >
                {locale === "uz" ? "Doʻkonga qaytish" : locale === "ru" ? "Вернуться в магазин" : "Back to shop"}
              </button>
            )}
            <AuthPanel
            authMode={authMode}
            copy={copy}
            authSubmitting={authSubmitting}
            authError={authError}
            authNotice={authNotice}
            email={email}
            password={password}
            displayName={displayName}
            setAuthMode={setAuthMode}
            setAuthError={setAuthError}
            setAuthNotice={setAuthNotice}
            setEmail={setEmail}
            setPassword={setPassword}
            setDisplayName={setDisplayName}
            onSubmitAuth={submitAuth}
            onSubmitAuthAction={submitAuthAction}
            onSubmitPasswordReset={submitPasswordReset}
            />
          </div>
        )}

        {authUser && accountActive && (
          <section className="account-page" id="account" aria-labelledby="account-title">
            <div className="account-heading">
              <span className="eyebrow">{copy.account}</span>
              <h1 id="account-title">{copy.account}</h1>
              <p>{copy.accountDescription}</p>
            </div>
            <div className="account-grid">
              <ProfilePanel
                user={authUser}
                copy={copy}
                profileName={profileName}
                profileLocale={profileLocale}
                profileSaving={profileSaving}
                profileError={profileError}
                profileSaved={profileSaved}
                setProfileName={setProfileName}
                setProfileLocale={setProfileLocale}
                onSubmit={submitProfile}
              />
              <div className="account-billing">
                <h2>{copy.accountBilling}</h2>
                {accessToken && (
                  <WalletPanel
                    accessToken={accessToken}
                    locale={locale}
                    copy={copy}
                    wallet={wallet}
                    loading={walletLoading}
                    loadError={walletError}
                    dialogOpen={walletTopUpOpen}
                    onDialogOpenChange={setWalletTopUpOpen}
                    onWalletChange={setWallet}
                    applySession={applySession}
                    clearSession={clearSession}
                  />
                )}
                <section className="seller-payout-panel" aria-labelledby="seller-payout-title">
                  <div className="seller-payout-heading">
                    <h3 id="seller-payout-title">{copy.sellerPayout}</h3>
                    <span>{copy.sellerPayoutPending}</span>
                  </div>
                  <p>{copy.sellerPayoutUnavailable}</p>
                </section>
              </div>
            </div>
          </section>
        )}

        {marketplaceActive && (
          <Marketplace
            key={`${authUser?.id ?? "anonymous"}:${marketplaceInitialStage}`}
            locale={locale}
            token={accessToken}
            accountId={authUser?.id ?? null}
            initialStage={marketplaceInitialStage}
            walletBalanceTiyin={wallet?.balanceTiyin ?? null}
            presentations={presentations}
            onSession={applySession}
            onExpired={clearSession}
            onRequireAuth={requireMarketplaceAuth}
            onRequestTopUp={() => setWalletTopUpOpen(true)}
            onRefreshWallet={refreshWallet}
            onRefreshPresentations={refreshPresentations}
          />
        )}

        {authUser && !marketplaceActive && !accountActive && !editorPresentation && (
          <GenerationPanel
            copy={copy}
            locale={locale}
            workType={creationType}
            itemCount={generationSlideCount}
            prompt={generationPrompt}
            language={generationLanguage}
            job={creationType === "slides" ? generationJob : null}
            starting={generationStarting || artifactGenerationStarting}
            saving={generationSaving}
            error={generationError}
            draftReady={artifactDraft !== null}
            setWorkType={setCreationType}
            setItemCount={setGenerationSlideCount}
            setPrompt={setGenerationPrompt}
            setLanguage={setGenerationLanguage}
            onSubmit={submitCreation}
            onSaveAndOpen={saveAndOpenGeneratedDeck}
          />
        )}

        {authUser && !marketplaceActive && !accountActive && !editorPresentation && accessToken && (
          <ArtifactWorkspace
            token={accessToken}
            initialDraft={artifactDraft}
            onSession={applySession}
            onExpired={clearSession}
          />
        )}

        {authUser && !marketplaceActive && !accountActive && !editorPresentation && (
          <PresentationLibrary
            user={authUser}
            copy={copy}
            locale={locale}
            presentations={presentations}
            projectsLoading={projectsLoading}
            editorLoading={editorLoading}
            projectsError={projectsError}
            editorError={editorError}
            creating={creatingPresentation}
            onCreate={createPresentation}
            onOpen={openPresentation}
            onDelete={deletePresentation}
          />
        )}

        {authUser && !marketplaceActive && !accountActive && editorPresentation && (
          <PresentationEditor
            copy={copy}
            presentation={editorPresentation}
            document={editorDocument}
            title={editorTitle}
            activeSlideId={activeSlideId}
            activeSlide={activeSlide}
            activeSlideIndex={activeSlideIndex}
            activeElements={activeElements}
            selectedElement={selectedElement}
            selectedText={selectedText}
            selectedTextDraft={selectedTextDraft}
            slideNotesDraft={slideNotesDraft}
            canUndo={editorCanUndo}
            canRedo={editorCanRedo}
            saving={editorSaving}
            error={editorError}
            saved={editorSaved}
            dirty={editorDirty}
            exportJob={exportJob}
            exportStarting={exportStarting}
            exportError={exportError}
            imageInput={imageInput}
            onClose={closeEditor}
            onStartExport={(format) => { void startExport(format); }}
            onDownloadExport={(job) => { void downloadExport(job); }}
            onSave={savePresentation}
            onTitleChange={(title) => { setEditorTitle(title); setEditorSaved(false); setEditorDirty(true); }}
            onUndo={undoEditor}
            onRedo={redoEditor}
            onSelectSlide={(slide) => {
              commitSlideNotes();
              commitSelectedText();
              setActiveSlideId(slide.id);
              setSlideNotesDraft(slide.notes ?? "");
              setSelectedElementId(null);
              setSelectedTextDraft("");
            }}
            onAddSlide={addSlide}
            onRemoveSlide={removeActiveSlide}
            onMoveSlide={moveActiveSlide}
            onSelectElement={selectElement}
            onAddText={addTextElement}
            onAddShape={addShapeElement}
            onImageChange={addImageElement}
            onDeleteElement={deleteSelectedElement}
            onSelectedTextChange={(value) => { setSelectedTextDraft(value); setEditorSaved(false); setEditorDirty(true); }}
            onCommitSelectedText={commitSelectedText}
            onGeometryChange={updateSelectedGeometry}
            onStyleChange={updateSelectedStyle}
            onShapeChange={updateSelectedShape}
            onBackgroundChange={updateSlideBackground}
            onImageAltChange={(element, value) => {
              if (element.type !== "image") return;
              applyEditorOperation({ kind: "updateElement", slideId: activeSlideId, elementId: element.id, patch: { alt: value } });
            }}
            onSlideNotesChange={(value) => { setSlideNotesDraft(value); setEditorDirty(true); }}
            onCommitSlideNotes={commitSlideNotes}
          />
        )}

        {!authUser && <section className="foundation-section" aria-label={copy.status}>
          <a className="foundation-item" href={`${API_URL}/swagger-ui.html`} target="_blank" rel="noreferrer">
            <span className="item-icon icon-amber"><BookOpen size={19} aria-hidden="true" /></span>
            <span className="item-copy"><strong>{copy.docs}</strong><small>{copy.docsCopy}</small></span>
            <ArrowUpRight className="item-arrow" size={16} aria-hidden="true" />
          </a>
          <div className="foundation-item">
            <span className="item-icon icon-green"><Layers3 size={19} aria-hidden="true" /></span>
            <span className="item-copy"><strong>{copy.model}</strong><small>{copy.modelCopy}</small></span>
            <span className="check-mark" aria-label="Implemented"><span /></span>
          </div>
          <div className="foundation-item">
            <span className="item-icon icon-blue"><Boxes size={19} aria-hidden="true" /></span>
            <span className="item-copy"><strong>{copy.export}</strong><small>{copy.exportCopy}</small></span>
            <span className="check-mark" aria-label="Implemented"><span /></span>
          </div>
        </section>}

        <footer className="app-footer">
          <span>Slideforge <span className="footer-separator">·</span> Presentation workspace</span>
          <a href={`${API_URL}/api/v1/status`} target="_blank" rel="noreferrer">API status <ArrowUpRight size={13} /></a>
        </footer>
      </main>
    </div>
  );
}

export default App;