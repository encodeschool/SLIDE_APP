import { Layers3, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import type { Locale, PresentationSummary, UserProfile } from "../../shared/types";

interface PresentationLibraryProps {
  user: UserProfile;
  copy: Record<string, string>;
  locale: Locale;
  presentations: PresentationSummary[];
  projectsLoading: boolean;
  editorLoading: boolean;
  projectsError: string;
  editorError: string;
  creating: boolean;
  onCreate: () => void;
  onOpen: (presentation: PresentationSummary) => void;
  onDelete: (presentation: PresentationSummary) => void;
}

export function PresentationLibrary({
  user,
  copy,
  locale,
  presentations,
  projectsLoading,
  editorLoading,
  projectsError,
  editorError,
  creating,
  onCreate,
  onOpen,
  onDelete,
}: PresentationLibraryProps) {
  return (
    <section id="presentations" className="projects-section" aria-labelledby="projects-title">
      <div className="projects-header">
        <div><h2 id="projects-title">{copy.presentations}</h2><p>{user.email}</p></div>
        <button className="primary-button" type="button" onClick={onCreate} disabled={creating}>
          {creating ? <LoaderCircle className="spin-icon" size={16} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
          {copy.createDraft}
        </button>
      </div>
      {projectsLoading && <p className="project-state" role="status"><LoaderCircle className="spin-icon" size={16} aria-hidden="true" />{copy.loadingProjects}</p>}
      {editorLoading && <p className="project-state" role="status"><LoaderCircle className="spin-icon" size={16} aria-hidden="true" />{copy.openingPresentation}</p>}
      {projectsError && <p className="form-error" role="alert">{projectsError}</p>}
      {editorError && <p className="form-error" role="alert">{editorError}</p>}
      {!projectsLoading && presentations.length === 0 && (
        <div className="empty-projects"><Layers3 size={21} aria-hidden="true" /><strong>{copy.emptyProjects}</strong><span>{copy.emptyProjectsCopy}</span></div>
      )}
      {presentations.length > 0 && (
        <ul className="project-list">
          {presentations.map((presentation) => (
            <li className="project-row" key={presentation.id}>
              <span className="project-glyph"><Layers3 size={17} aria-hidden="true" /></span>
              <span className="project-title"><strong>{presentation.title}</strong><small>{copy.lastUpdated} {new Date(presentation.updatedAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US")}</small></span>
              <span className="project-version">v{presentation.currentVersion}</span>
              <button className="icon-button open-presentation-button" type="button" title={copy.openPresentation} aria-label={`${copy.openPresentation}: ${presentation.title}`} onClick={() => onOpen(presentation)}>
                <Pencil size={16} aria-hidden="true" />
              </button>
              <button className="icon-button" type="button" title={copy.deletePresentation} aria-label={`${copy.deletePresentation}: ${presentation.title}`} onClick={() => onDelete(presentation)}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
