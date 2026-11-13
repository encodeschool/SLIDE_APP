import type { FormEventHandler } from "react";
import { FileText, LoaderCircle, Save, Sparkles } from "lucide-react";
import type { ArtifactType } from "../../../../../packages/shared-types/src/artifact.ts";
import type { GenerationJobResponse, Locale } from "../../shared/types";

export type CreationType = "slides" | ArtifactType;

interface GenerationPanelProps {
  copy: Record<string, string>;
  locale: Locale;
  workType: CreationType;
  itemCount: number;
  prompt: string;
  language: Locale;
  job: GenerationJobResponse | null;
  starting: boolean;
  saving: boolean;
  error: string;
  draftReady: boolean;
  setWorkType: (type: CreationType) => void;
  setItemCount: (count: number) => void;
  setPrompt: (prompt: string) => void;
  setLanguage: (language: Locale) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onSaveAndOpen: () => void;
}

export function GenerationPanel({
  copy,
  locale,
  workType,
  itemCount,
  prompt,
  language,
  job,
  starting,
  saving,
  error,
  draftReady,
  setWorkType,
  setItemCount,
  setPrompt,
  setLanguage,
  onSubmit,
  onSaveAndOpen,
}: GenerationPanelProps) {
  const isPresentation = workType === "slides";
  const locked = starting || Boolean(job && (job.status === "QUEUED" || job.status === "RUNNING"));
  const typeNames: Record<ArtifactType, [string, string, string]> = {
    essay: ["Essay", "Эссе", "Esse"],
    "independent-work": ["Independent work", "Самостоятельная работа", "Mustaqil ish"],
    coursework: ["Coursework", "Курсовая работа", "Kurs ishi"],
    dissertation: ["Dissertation", "Диссертация", "Dissertatsiya"],
    "research-article": ["Research article", "Научная статья", "Ilmiy maqola"],
    quiz: ["Quiz", "Тест", "Test"],
    crossword: ["Crossword", "Кроссворд", "Krossvord"],
    "thesis-abstract": ["Thesis abstract", "Тезисы", "Tezis"],
    glossary: ["Glossary", "Глоссарий", "Glossariy"],
    "argumentative-essay": ["Argumentative essay", "Аргументативное эссе", "Argumentativ esse"],
  };
  const localeIndex = locale === "ru" ? 1 : locale === "uz" ? 2 : 0;
  const formatName = isPresentation ? copy.generationPresentationType : typeNames[workType][localeIndex];
  const fileFormat = isPresentation ? "PPTX" : "DOCX";
  const itemName = isPresentation
    ? copy.generationSlidesUnit
    : workType === "quiz" ? copy.generationQuestionsUnit
      : workType === "crossword" ? copy.generationCluesUnit
        : workType === "glossary" ? copy.generationTermsUnit : copy.generationSectionsUnit;
  const languageName = language === "ru" ? "Русский" : language === "uz" ? "Oʻzbekcha" : "English";

  return (
    <section id="generate" className="projects-section" aria-labelledby="generation-title">
      <div className="projects-header">
        <div><h2 id="generation-title">{copy.generationTitle}</h2><p>{copy.generationCopy}</p></div>
        <Sparkles size={20} aria-hidden="true" />
      </div>
      <form className="editor-form generation-form" onSubmit={onSubmit}>
        <div className="generation-fields">
          <label>
            <span>{copy.generationPrompt}</span>
            <textarea
              disabled={locked}
              required
              maxLength={4000}
              rows={6}
              placeholder={copy.generationPromptPlaceholder}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </label>
          <button className="primary-button" type="submit" disabled={locked || saving}>
            {starting ? <LoaderCircle className="spin-icon" size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
            {starting ? copy.generationSubmitting : isPresentation ? copy.generationSubmit : copy.generationDraftSubmit}
          </button>
        </div>
        <aside className="generation-preview" aria-label={copy.generationPreview} aria-live="polite">
          <div className="generation-preview-heading">
            <span className="eyebrow">{copy.generationPreview}</span>
            <span className="generation-format-badge">{fileFormat}</span>
          </div>
          {isPresentation ? (
            <div className="generation-slide-preview">
              <div className="generation-slide-cover">
                <span className="generation-slide-number">01</span>
                <span className="generation-slide-orb" aria-hidden="true" />
                <div className="generation-slide-cover-copy">
                  <p>{prompt.trim() || copy.generationTopicPlaceholder}</p>
                  <span aria-hidden="true" />
                </div>
              </div>
              <ol className="generation-slide-thumbnails" aria-hidden="true">
                {Array.from({ length: itemCount }, (_, index) => {
                  const isCover = index === 0 || index === itemCount - 1;
                  const layout = index % 4;
                  return (
                    <li
                      className={`generation-slide-thumb${isCover ? " generation-slide-thumb-cover" : ""}`}
                      key={index}
                    >
                      {isCover ? (
                        <span className="generation-slide-thumb-center">
                          <span />
                          <span />
                        </span>
                      ) : (
                        <span className={`generation-slide-thumb-content generation-slide-thumb-layout-${layout}`}>
                          <span className="generation-slide-thumb-title" />
                          <span className="generation-slide-thumb-body">
                            {layout === 1 ? (
                              <span className="generation-slide-thumb-bullets">
                                <span />
                                <span />
                                <span />
                              </span>
                            ) : layout === 2 ? (
                              <span className="generation-slide-thumb-columns">
                                <span />
                                <span />
                              </span>
                            ) : layout === 3 ? (
                              <span className="generation-slide-thumb-bars">
                                <span />
                                <span />
                                <span />
                                <span />
                              </span>
                            ) : (
                              <span className="generation-slide-thumb-lines">
                                <span />
                                <span />
                                <span />
                              </span>
                            )}
                          </span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : (
            <div className="generation-page-wrap">
              <span className="generation-page-shadow generation-page-shadow-back" aria-hidden="true" />
              <span className="generation-page-shadow generation-page-shadow-front" aria-hidden="true" />
              <div className="generation-page">
                <span className="generation-page-line generation-page-line-long" aria-hidden="true" />
                <span className="generation-page-line generation-page-line-short" aria-hidden="true" />
                <span className="generation-page-icon" aria-hidden="true"><FileText size={20} /></span>
                <p className="generation-page-format">{formatName}</p>
                <p className="generation-page-topic-label">{copy.generationPreviewTopic}</p>
                <p className="generation-page-topic">{prompt.trim() || copy.generationTopicPlaceholder}</p>
                <div className="generation-page-lines" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <p className="generation-page-meta">{languageName} · {itemCount} {itemName}</p>
              </div>
            </div>
          )}
          {isPresentation && (
            <p className="generation-preview-caption">{formatName} · {itemCount} {itemName} · {languageName}</p>
          )}
        </aside>
        <div className="generation-settings">
          <label>
            <span>{copy.generationFormat}</span>
            <select value={workType} disabled={locked} onChange={(event) => setWorkType(event.target.value as CreationType)}>
              <option value="slides">{copy.generationPresentationType}</option>
              {Object.entries(typeNames).map(([type, names]) => (
                <option key={type} value={type}>{names[localeIndex]}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{copy.generationLanguage}</span>
            <select value={language} disabled={locked} onChange={(event) => setLanguage(event.target.value as Locale)}>
              <option value="en">English</option>
              <option value="ru">Русский</option>
              <option value="uz">Oʻzbekcha</option>
            </select>
          </label>
          <label>
            <span>{isPresentation ? copy.generationSlides : copy.generationItemCount}</span>
            <input type="number" min={1} max={20} required disabled={locked} value={itemCount} onChange={(event) => setItemCount(Number(event.target.value))} />
          </label>
        </div>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {draftReady && !isPresentation && <div className="export-state" role="status">{copy.generationDraftReady}</div>}
      {job && isPresentation && <div className="export-state" role="status">
        {job.status === "QUEUED" ? copy.generationQueued
          : job.status === "RUNNING" ? copy.generationRunning
            : job.status === "FAILED" ? (job.failureMessage ?? copy.generationFailed)
              : copy.generationSucceeded}
        {job.status === "SUCCEEDED" && job.document && (
          <button className="text-button" type="button" disabled={saving} onClick={onSaveAndOpen}>
            {saving ? <LoaderCircle className="spin-icon" size={15} aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
            {saving ? copy.generationSaving : copy.generationSaveOpen}
          </button>
        )}
      </div>}
    </section>
  );
}
