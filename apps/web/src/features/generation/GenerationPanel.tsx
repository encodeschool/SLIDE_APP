import type { FormEventHandler } from "react";
import { LoaderCircle, Save, Sparkles } from "lucide-react";
import type { GenerationJobResponse, Locale } from "../../shared/types";

interface GenerationPanelProps {
  copy: Record<string, string>;
  prompt: string;
  language: Locale;
  slideCount: number;
  job: GenerationJobResponse | null;
  starting: boolean;
  saving: boolean;
  error: string;
  setPrompt: (prompt: string) => void;
  setLanguage: (language: Locale) => void;
  setSlideCount: (count: number) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onSaveAndOpen: () => void;
}

export function GenerationPanel({
  copy,
  prompt,
  language,
  slideCount,
  job,
  starting,
  saving,
  error,
  setPrompt,
  setLanguage,
  setSlideCount,
  onSubmit,
  onSaveAndOpen,
}: GenerationPanelProps) {
  return (
    <section id="generate" className="projects-section" aria-labelledby="generation-title">
      <div className="projects-header">
        <div><h2 id="generation-title">{copy.generationTitle}</h2><p>{copy.generationCopy}</p></div>
        <Sparkles size={20} aria-hidden="true" />
      </div>
      <form className="editor-form" onSubmit={onSubmit}>
        <label>
          <span>{copy.generationPrompt}</span>
          <textarea required maxLength={4000} rows={5} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        </label>
        <label>
          <span>{copy.generationLanguage}</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value as Locale)}>
            <option value="en">English</option>
            <option value="ru">Русский</option>
            <option value="uz">Oʻzbekcha</option>
          </select>
        </label>
        <label>
          <span>{copy.generationSlides}</span>
          <input type="number" min={1} max={20} required value={slideCount} onChange={(event) => setSlideCount(Number(event.target.value))} />
        </label>
        <button className="primary-button" type="submit" disabled={starting || saving}>
          {starting ? <LoaderCircle className="spin-icon" size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
          {starting ? copy.generationSubmitting : copy.generationSubmit}
        </button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {job && <div className="export-state" role="status">
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
