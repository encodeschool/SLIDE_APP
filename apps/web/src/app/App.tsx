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
} from "../shared/types";
import { AuthPanel } from "../features/auth/AuthPanel";
import { ProfilePanel } from "../features/auth/ProfilePanel";
import { GenerationPanel } from "../features/generation/GenerationPanel";
import { PresentationLibrary } from "../features/presentations/PresentationLibrary";
import { PresentationEditor } from "../features/presentations/PresentationEditor";
import {
  ArrowUpRight,
  BookOpen,
  Boxes,
  CircleHelp,
  Globe2,
  Layers3,
  LoaderCircle,
  Library,
  LockKeyhole,
  LogOut,
  Settings2,
  Sparkles,
} from "lucide-react";

const translations = {
  en: {
    workspace: "Workspace",
    library: "My presentations",
    create: "Create with AI",
    marketplace: "Marketplace",
    purchases: "Purchases",
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
    createDraft: "New presentation",
    generationTitle: "Create a presentation with AI",
    generationCopy: "Describe the presentation you need. Your prompt is used only to create slide content.",
    generationPrompt: "Presentation brief",
    generationLanguage: "Presentation language",
    generationSlides: "Number of slides",
    generationSubmit: "Generate presentation",
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
  },
  ru: {
    workspace: "Рабочее пространство",
    library: "Мои презентации",
    create: "Создать с ИИ",
    marketplace: "Маркетплейс",
    purchases: "Покупки",
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
    createDraft: "Новая презентация",
    generationTitle: "Создать презентацию с ИИ",
    generationCopy: "Опишите нужную презентацию. Запрос используется только для создания содержимого слайдов.",
    generationPrompt: "Описание презентации",
    generationLanguage: "Язык презентации",
    generationSlides: "Количество слайдов",
    generationSubmit: "Создать презентацию",
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
} satisfies Record<Locale, Record<string, string>>;

const disabledSections = [
  { icon: Library, labelKey: "library" },
  { icon: Sparkles, labelKey: "create" },
  { icon: Boxes, labelKey: "marketplace" },
  { icon: BookOpen, labelKey: "purchases" },
] as const;

function App() {
  const [locale, setLocale] = useState<Locale>("en");
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>(() =>
    window.location.pathname.endsWith("/reset-password") ? "reset" : "login");
  const [authUser, setAuthUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
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
  const [generationJob, setGenerationJob] = useState<GenerationJobResponse | null>(null);
  const [generationStarting, setGenerationStarting] = useState(false);
  const [generationSaving, setGenerationSaving] = useState(false);
  const [generationError, setGenerationError] = useState("");
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

  function applySession(session: AuthResponse) {
    setAccessToken(session.accessToken);
    setAuthUser(session.user);
    setLocale(session.user.locale);
    setGenerationLanguage(session.user.locale);
    setProfileName(session.user.displayName);
    setProfileLocale(session.user.locale);
  }

  function clearSession() {
    setAccessToken(null);
    setAuthUser(null);
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
    if (window.location.pathname.endsWith("/reset-password")
      || window.location.pathname.endsWith("/verify-email")) {
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
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : copy.generationRequestFailed);
    } finally {
      setGenerationStarting(false);
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
          {disabledSections.map(({ icon: Icon, labelKey }) => authUser && (labelKey === "library" || labelKey === "create") ? (
            <a className="nav-item" href={labelKey === "library" ? "#presentations" : "#generate"} key={labelKey}>
              <Icon size={17} aria-hidden="true" />
              <span>{copy[labelKey]}</span>
            </a>
          ) : (
            <button className="nav-item" disabled title={copy.coming} key={labelKey}>
              <Icon size={17} aria-hidden="true" />
              <span>{copy[labelKey]}</span>
              <LockKeyhole className="nav-lock" size={13} aria-hidden="true" />
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="version-mark"><span />{authUser ? authUser.displayName : "Phase 2 · Core data"}</div>
          <a className="help-link" href="/ROADMAP.md">
            <CircleHelp size={16} aria-hidden="true" />
            <span>{copy.roadmap}</span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
      </aside>

      <main id="workspace" className="main-panel">
        <header className="topbar">
          <span className="breadcrumb">{copy.workspace}<span>/</span><strong>{copy.status}</strong></span>
          <button
            className="language-button"
            type="button"
            title={copy.language}
            aria-label={copy.language}
            onClick={() => setLocale(locale === "en" ? "ru" : "en")}
          >
            <Globe2 size={17} aria-hidden="true" />
            {locale.toUpperCase()}
          </button>
          {authUser && (
            <button className="language-button signout-button" type="button" title={copy.signOut} aria-label={copy.signOut} onClick={signOut}>
              <LogOut size={16} aria-hidden="true" />
            </button>
          )}
        </header>

        <section className="welcome-section" aria-labelledby="welcome-title">
          <div className="eyebrow"><span className="eyebrow-dot" />{copy.status}</div>
          <h1 id="welcome-title">{copy.foundation}</h1>
          <p className="welcome-copy">{copy.intro}</p>
          <div className="status-row" role="status" aria-live="polite">
            <div className="status-glyph"><Settings2 size={18} aria-hidden="true" /></div>
            <div><strong>{copy.api}</strong><span>{apiStatusText}</span></div>
            <span className={`status-indicator ${apiAvailable === null ? "status-checking" : apiAvailable ? "" : "status-unavailable"}`} aria-label={apiStatusText} />
          </div>
        </section>

        {!authUser && !authRestoring && (
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
        )}

        {authRestoring && <p className="session-loading" role="status"><LoaderCircle className="spin-icon" size={16} aria-hidden="true" />{copy.authLoading}</p>}

        {authUser && (
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
        )}

        {authUser && !editorPresentation && (
          <GenerationPanel
            copy={copy}
            prompt={generationPrompt}
            language={generationLanguage}
            slideCount={generationSlideCount}
            job={generationJob}
            starting={generationStarting}
            saving={generationSaving}
            error={generationError}
            setPrompt={setGenerationPrompt}
            setLanguage={setGenerationLanguage}
            setSlideCount={setGenerationSlideCount}
            onSubmit={submitGeneration}
            onSaveAndOpen={saveAndOpenGeneratedDeck}
          />
        )}

        {authUser && !editorPresentation && (
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

        {authUser && editorPresentation && (
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