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
import { AuthPage } from "../features/auth/AuthPage";
import { ProfilePanel } from "../features/auth/ProfilePanel";
import { GenerationPanel } from "../features/generation/GenerationPanel";
import type { CreationType } from "../features/generation/GenerationPanel";
import { ArtifactWorkspace } from "../features/artifacts/ArtifactWorkspace";
import type { ArtifactDocument } from "../../../../packages/shared-types/src/artifact.ts";
import { PresentationLibrary } from "../features/presentations/PresentationLibrary";
import { PresentationEditor } from "../features/presentations/PresentationEditor";
import { Marketplace } from "../features/marketplace/Marketplace";
import { StorefrontPage } from "../features/marketplace/StorefrontPage";
import { WalletPanel } from "../features/wallet/WalletPanel";
import { LandingPage } from "../features/landing/LandingPage";
import brandMark from "../assets/slideforge-mark.svg";
import { translations } from "../i18n/messages";
import { nextLocale, readLocalePreference, saveLocalePreference } from "../i18n";
import {
  ArrowUpRight,
  BookOpen,
  Boxes,
  Globe2,
  Home,
  LogOut,
  Settings2,
  UserRound,
} from "lucide-react";



function App() {
  const [marketplaceActive, setMarketplaceActive] = useState(() =>
    window.location.hash === "#marketplace" || window.location.hash === "#purchases");
  const [accountActive, setAccountActive] = useState(() => window.location.hash === "#account");
  const [marketplaceInitialStage, setMarketplaceInitialStage] = useState<"shop" | "purchases">(() =>
    window.location.hash === "#purchases" ? "purchases" : "shop");
  const [marketplaceCartCount, setMarketplaceCartCount] = useState(0);
  const [marketplaceCartOpenRequest, setMarketplaceCartOpenRequest] = useState(0);
  const [locale, setLocale] = useState<Locale>(readLocalePreference);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>(() =>
    window.location.pathname.endsWith("/reset-password") ? "reset" : "login");
  const [landingAuthOpen, setLandingAuthOpen] = useState(() =>
    window.location.pathname.endsWith("/reset-password"));
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
  const [profileLocale, setProfileLocale] = useState<Locale>(readLocalePreference);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [presentations, setPresentations] = useState<PresentationSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [creatingPresentation, setCreatingPresentation] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState("");
  const [generationLanguage, setGenerationLanguage] = useState<Locale>(readLocalePreference);
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

  function changeLocale(next: Locale) {
    setLocale(next);
    saveLocalePreference(next);
  }

  function toggleLocale() {
    changeLocale(nextLocale(locale));
  }

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
    setLandingAuthOpen(true);
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
    setLandingAuthOpen(false);
    setAccessToken(session.accessToken);
    setAuthUser(session.user);
    changeLocale(session.user.locale);
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
      changeLocale(updatedUser.locale);
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
    const title = copy.newPresentation;
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
          <span className="app-loading-mark"><img src={brandMark} alt="" /></span>
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

  function updateSelectedGeometry(property: "x" | "y" | "w" | "h", value: number, elementId = selectedElement?.id) {
    if (!elementId || !editorDocument || !activeSlideId || !Number.isFinite(value)) return;
    const element = activeSlide?.elements.find((item) => item.id === elementId);
    if (!element) return;
    const maximum = property === "x" ? editorDocument.size.width - element.w
      : property === "y" ? editorDocument.size.height - element.h
        : property === "w" ? editorDocument.size.width - element.x
          : editorDocument.size.height - element.y;
    const minimum = property === "x" || property === "y" ? 0 : 1;
    const nextValue = Math.round(Math.max(minimum, Math.min(value, maximum)));
    applyEditorOperation({
      kind: "updateElement",
      slideId: activeSlideId,
      elementId,
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

  const authPanel = (
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
  );

  const showPublicLanding = !authUser
    && !landingAuthOpen
    && !accountActive
    && window.location.pathname === "/"
    && !authRestoring;
  const showStorefront = window.location.pathname.replace(/\/+$/, "") === "/marketplace"
    && !landingAuthOpen
    && !authRestoring;

  if (showPublicLanding) {
    return (
      <LandingPage
        locale={locale}
        onAuth={(mode) => {
          setAuthError("");
          setAuthNotice("");
          setAuthMode(mode);
          setLandingAuthOpen(true);
        }}
        onToggleLocale={toggleLocale}
      />
    );
  }

  if (showStorefront) {
    return (
      <StorefrontPage
        locale={locale}
        authenticated={authUser !== null}
        workspaceLabel={copy.workspace}
        cartCount={marketplaceCartCount}
        onOpenCart={() => setMarketplaceCartOpenRequest((current) => current + 1)}
        onAuth={(mode) => {
          setAuthError("");
          setAuthNotice("");
          setAuthMode(mode);
          setLandingAuthOpen(true);
        }}
        onToggleLocale={toggleLocale}
      >
        <Marketplace
          key={`${authUser?.id ?? "anonymous"}:shop`}
          locale={locale}
          token={accessToken}
          accountId={authUser?.id ?? null}
          initialStage="shop"
          walletBalanceTiyin={wallet?.balanceTiyin ?? null}
          presentations={presentations}
          onSession={applySession}
          onExpired={clearSession}
          onRequireAuth={requireMarketplaceAuth}
          onRequestTopUp={() => setWalletTopUpOpen(true)}
          onRefreshWallet={refreshWallet}
          onRefreshPresentations={refreshPresentations}
          cartInNavigation
          cartOpenRequest={marketplaceCartOpenRequest}
          onCartOpenHandled={() => setMarketplaceCartOpenRequest(0)}
          onCartCountChange={setMarketplaceCartCount}
        />
      </StorefrontPage>
    );
  }

  if (!authUser) {
    return (
      <AuthPage>
        {authRestoring ? (
          <div className="standalone-auth-loading" role="status" aria-live="polite">
            <span className="public-loader-progress" aria-hidden="true"><span /></span>
            <strong>{copy.authLoading}</strong>
          </div>
        ) : authPanel}
      </AuthPage>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#workspace" aria-label={copy.workspaceAria}>
          <span className="brand-mark"><img src={brandMark} alt="" /></span>
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
              onClick={toggleLocale}
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
                    historyExpanded
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
            locale={locale}
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



        <footer className="app-footer">
          <span>Slideforge <span className="footer-separator">·</span> {copy.workspaceFooter}</span>
          <a href={`${API_URL}/api/v1/status`} target="_blank" rel="noreferrer">API status <ArrowUpRight size={13} /></a>
        </footer>
      </main>
    </div>
  );
}

export default App;