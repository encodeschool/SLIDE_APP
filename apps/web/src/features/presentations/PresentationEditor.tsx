import type { ChangeEventHandler, FormEventHandler, RefObject } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Circle,
  Download,
  ImagePlus,
  LoaderCircle,
  Plus,
  Save,
  Square,
  Trash2,
  Undo2,
  Redo2,
} from "lucide-react";
import type { Deck, ShapeElement } from "../../../../../packages/shared-types/src/index.ts";
import type { ExportFormat, ExportJobResponse, PresentationDetail } from "../../shared/types";

type Element = Deck["slides"][number]["elements"][number];

interface PresentationEditorProps {
  copy: Record<string, string>;
  presentation: PresentationDetail;
  document: Deck | null;
  title: string;
  activeSlideId: string;
  activeSlide: Deck["slides"][number] | undefined;
  activeSlideIndex: number;
  activeElements: Element[];
  selectedElement: Element | undefined;
  selectedText: Extract<Element, { type: "text" }> | undefined;
  selectedTextDraft: string;
  slideNotesDraft: string;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  error: string;
  saved: boolean;
  dirty: boolean;
  exportJob: ExportJobResponse | null;
  exportStarting: ExportFormat | null;
  exportError: string;
  imageInput: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onStartExport: (format: ExportFormat) => void;
  onDownloadExport: (job: ExportJobResponse) => void;
  onSave: FormEventHandler<HTMLFormElement>;
  onTitleChange: (title: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectSlide: (slide: Deck["slides"][number]) => void;
  onAddSlide: () => void;
  onRemoveSlide: () => void;
  onMoveSlide: (index: number) => void;
  onSelectElement: (element: Element) => void;
  onAddText: () => void;
  onAddShape: (shape: ShapeElement["shape"]) => void;
  onImageChange: ChangeEventHandler<HTMLInputElement>;
  onDeleteElement: () => void;
  onSelectedTextChange: (value: string) => void;
  onCommitSelectedText: () => void;
  onGeometryChange: (property: "x" | "y" | "w" | "h", value: number) => void;
  onStyleChange: (patch: Record<string, unknown>) => void;
  onShapeChange: (fill: string) => void;
  onBackgroundChange: (color: string) => void;
  onImageAltChange: (element: Element, value: string) => void;
  onSlideNotesChange: (value: string) => void;
  onCommitSlideNotes: () => void;
}

export function PresentationEditor({
  copy,
  presentation,
  document,
  title,
  activeSlideId,
  activeSlide,
  activeSlideIndex,
  activeElements,
  selectedElement,
  selectedText,
  selectedTextDraft,
  slideNotesDraft,
  canUndo,
  canRedo,
  saving,
  error,
  saved,
  dirty,
  exportJob,
  exportStarting,
  exportError,
  imageInput,
  onClose,
  onStartExport,
  onDownloadExport,
  onSave,
  onTitleChange,
  onUndo,
  onRedo,
  onSelectSlide,
  onAddSlide,
  onRemoveSlide,
  onMoveSlide,
  onSelectElement,
  onAddText,
  onAddShape,
  onImageChange,
  onDeleteElement,
  onSelectedTextChange,
  onCommitSelectedText,
  onGeometryChange,
  onStyleChange,
  onShapeChange,
  onBackgroundChange,
  onImageAltChange,
  onSlideNotesChange,
  onCommitSlideNotes,
}: PresentationEditorProps) {
  const isExportBusy = exportStarting !== null || exportJob?.status === "QUEUED" || exportJob?.status === "RUNNING";

  return (
    <section className="editor-section" aria-labelledby="editor-title">
      <div className="editor-header">
        <button className="text-button editor-back" type="button" onClick={onClose}>
          <ArrowLeft size={16} aria-hidden="true" />{copy.backToLibrary}
        </button>
        <div className="export-actions">
          <span className="project-version">v{presentation.currentVersion}</span>
          <button className="secondary-button" type="button" disabled={dirty || isExportBusy} title={dirty ? copy.saveBeforeExport : copy.exportPptx} onClick={() => onStartExport("pptx")}>
            {exportStarting === "pptx" ? <LoaderCircle className="spin-icon" size={15} aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}{copy.exportPptx}
          </button>
          <button className="secondary-button" type="button" disabled={dirty || isExportBusy} title={dirty ? copy.saveBeforeExport : copy.exportPdf} onClick={() => onStartExport("pdf")}>
            {exportStarting === "pdf" ? <LoaderCircle className="spin-icon" size={15} aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}{copy.exportPdf}
          </button>
        </div>
      </div>
      <h2 id="editor-title">{copy.presentationTitle}</h2>
      <form className="editor-form" onSubmit={onSave}>
        <label>
          <span>{copy.presentationTitle}</span>
          <input maxLength={200} required value={title} onChange={(event) => onTitleChange(event.target.value)} />
        </label>
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? <LoaderCircle className="spin-icon" size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
          {saving ? copy.savingChanges : copy.saveChanges}
        </button>
        {saved && <span className="profile-success" role="status">{copy.presentationSaved}</span>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
      {exportError && <p className="form-error" role="alert">{exportError}</p>}
      {dirty && <p className="export-hint">{copy.saveBeforeExport}</p>}
      {exportJob && <div className="export-state" role="status">
        <span>{exportJob.status === "QUEUED" ? copy.exportQueued : exportJob.status === "RUNNING" ? copy.exportRunning : exportJob.status === "FAILED" ? copy.exportFailed : copy.exportReady}</span>
        {exportJob.status === "SUCCEEDED" && <button className="text-button" type="button" onClick={() => onDownloadExport(exportJob)}><Download size={15} aria-hidden="true" />{copy.exportDownload} {exportJob.format.toUpperCase()}</button>}
      </div>}
      <div className="editor-overview" aria-label={copy.presentations}>
        <span>{document?.slides.length ?? 0} {copy.slideCount}</span>
        <span>{document?.slides.reduce((total, slide) => total + slide.elements.length, 0) ?? 0} {copy.elementCount}</span>
        <span>{presentation.language.toUpperCase()}</span>
      </div>
      {document && (
        <div className="editor-toolbar">
          <button className="icon-button" type="button" title={copy.undo} aria-label={copy.undo} disabled={!canUndo} onMouseDown={(event) => event.preventDefault()} onClick={onUndo}><Undo2 size={17} aria-hidden="true" /></button>
          <button className="icon-button" type="button" title={copy.redo} aria-label={copy.redo} disabled={!canRedo} onMouseDown={(event) => event.preventDefault()} onClick={onRedo}><Redo2 size={17} aria-hidden="true" /></button>
        </div>
      )}
      {document && activeSlide && (
        <div className="editor-workspace">
          <div className="slide-navigation">
            <nav className="slide-strip" aria-label={copy.slideCount}>
              {document.slides.map((slide, index) => (
                <button className={`slide-tab ${slide.id === activeSlideId ? "slide-tab-active" : ""}`} type="button" key={slide.id} aria-current={slide.id === activeSlideId ? "page" : undefined} onClick={() => onSelectSlide(slide)}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <small>{copy.slide} {index + 1}</small>
                </button>
              ))}
            </nav>
            <div className="slide-actions">
              <button className="icon-button add-text-button" type="button" title={copy.addSlide} aria-label={copy.addSlide} onClick={onAddSlide}><Plus size={16} aria-hidden="true" /></button>
              <button className="icon-button" type="button" title={copy.moveSlideUp} aria-label={copy.moveSlideUp} disabled={activeSlideIndex <= 0} onClick={() => onMoveSlide(activeSlideIndex - 1)}><ArrowUp size={16} aria-hidden="true" /></button>
              <button className="icon-button" type="button" title={copy.moveSlideDown} aria-label={copy.moveSlideDown} disabled={activeSlideIndex < 0 || activeSlideIndex >= document.slides.length - 1} onClick={() => onMoveSlide(activeSlideIndex + 1)}><ArrowDown size={16} aria-hidden="true" /></button>
              <button className="icon-button remove-element-button" type="button" title={copy.removeSlide} aria-label={copy.removeSlide} disabled={document.slides.length <= 1} onClick={onRemoveSlide}><Trash2 size={16} aria-hidden="true" /></button>
            </div>
          </div>
          <section className="slide-stage" aria-label={`${copy.slide} ${document.slides.findIndex((slide) => slide.id === activeSlideId) + 1}`}>
            <div className="editor-canvas" style={{ aspectRatio: `${document.size.width} / ${document.size.height}`, background: activeSlide.background?.color ?? document.theme?.background ?? "#ffffff" }}>
              {activeSlide.elements.map((element) => {
                const position = {
                  left: `${element.x / document.size.width * 100}%`,
                  top: `${element.y / document.size.height * 100}%`,
                  width: `${element.w / document.size.width * 100}%`,
                  height: `${element.h / document.size.height * 100}%`,
                };
                if (element.type === "text") {
                  return <button className={`slide-text-element ${element.id === selectedElement?.id ? "slide-element-selected" : ""}`} type="button" key={element.id} style={{ ...position, fontFamily: element.style?.fontFamily, fontSize: `${(element.style?.fontSize ?? 28) / 12.8}cqw`, fontWeight: element.style?.fontWeight, color: element.style?.color ?? "#242a28", textAlign: element.style?.align ?? "left" }} onClick={() => onSelectElement(element)}>{element.text}</button>;
                }
                if (element.type === "shape") {
                  return <button className={`slide-shape-element ${element.id === selectedElement?.id ? "slide-element-selected" : ""}`} type="button" key={element.id} aria-label={element.shape === "ellipse" ? copy.ellipse : copy.rectangle} style={{ ...position, background: element.fill, border: element.stroke ? `1px solid ${element.stroke}` : "1px solid transparent", borderRadius: element.shape === "ellipse" ? "50%" : 0 }} onClick={() => onSelectElement(element)} />;
                }
                return <button className={`slide-image-element ${element.id === selectedElement?.id ? "slide-element-selected" : ""}`} type="button" key={element.id} aria-label={element.alt || copy.elements} style={position} onClick={() => onSelectElement(element)}><img src={element.dataUri} alt="" /></button>;
              })}
            </div>
          </section>
          <aside className="element-inspector" aria-label={copy.elements}>
            <div className="inspector-heading"><h3>{copy.elements}</h3></div>
            <div className="element-actions">
              <button className="icon-button add-text-button" type="button" title={copy.addText} aria-label={copy.addText} onClick={onAddText}><Plus size={17} aria-hidden="true" /></button>
              <button className="icon-button add-text-button" type="button" title={copy.addRectangle} aria-label={copy.addRectangle} onClick={() => onAddShape("rect")}><Square size={16} aria-hidden="true" /></button>
              <button className="icon-button add-text-button" type="button" title={copy.addEllipse} aria-label={copy.addEllipse} onClick={() => onAddShape("ellipse")}><Circle size={16} aria-hidden="true" /></button>
              <button className="icon-button add-text-button" type="button" title={copy.addImage} aria-label={copy.addImage} onClick={() => imageInput.current?.click()}><ImagePlus size={16} aria-hidden="true" /></button>
              <input ref={imageInput} className="hidden-file-input" type="file" accept="image/*" onChange={onImageChange} />
              <button className="icon-button remove-element-button" type="button" title={copy.deleteElement} aria-label={copy.deleteElement} disabled={!selectedElement} onClick={onDeleteElement}><Trash2 size={16} aria-hidden="true" /></button>
            </div>
            <div className="element-list">
              {activeElements.map((element, index) => (
                <button className={`element-list-item ${element.id === selectedElement?.id ? "element-list-item-active" : ""}`} type="button" key={element.id} onClick={() => onSelectElement(element)}>
                  <span>{element.type === "text" ? copy.textElements : element.type === "shape" ? element.shape === "ellipse" ? copy.ellipse : copy.rectangle : copy.elements} {index + 1}</span>
                  <small>{element.type === "text" ? element.text || copy.newText : element.type === "shape" ? element.fill : element.alt || copy.elements}</small>
                </button>
              ))}
            </div>
            {selectedText && <label className="text-editor-field"><span>{copy.textContent}</span><textarea value={selectedTextDraft} onChange={(event) => onSelectedTextChange(event.target.value)} onBlur={onCommitSelectedText} /></label>}
            {selectedElement && (
              <fieldset className="element-properties">
                <legend>{copy.position}</legend>
                <div className="geometry-grid">
                  {(["x", "y", "w", "h"] as const).map((property) => (
                    <label key={property}>
                      <span>{property.toUpperCase()}</span>
                      <input type="number" min={property === "x" || property === "y" ? 0 : 1} defaultValue={selectedElement[property]} key={`${selectedElement.id}-${property}-${selectedElement[property]}`} onBlur={(event) => onGeometryChange(property, event.currentTarget.valueAsNumber)} />
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {selectedText && (
              <fieldset className="element-properties">
                <legend>{copy.textStyle}</legend>
                <label><span>{copy.fontSize}</span><input type="number" min={8} max={120} defaultValue={selectedText.style?.fontSize ?? 28} key={`${selectedText.id}-font-${selectedText.style?.fontSize ?? 28}`} onBlur={(event) => { const fontSize = event.currentTarget.valueAsNumber; if (fontSize >= 8 && fontSize <= 120) onStyleChange({ fontSize }); }} /></label>
                <label><span>{copy.textColor}</span><input type="color" value={selectedText.style?.color?.startsWith("#") ? selectedText.style.color : "#242a28"} onChange={(event) => onStyleChange({ color: event.target.value })} /></label>
                <label><span>{copy.alignment}</span><select value={selectedText.style?.align ?? "left"} onChange={(event) => onStyleChange({ align: event.target.value })}><option value="left">{copy.leftAlign}</option><option value="center">{copy.centerAlign}</option><option value="right">{copy.rightAlign}</option></select></label>
              </fieldset>
            )}
            {selectedElement?.type === "shape" && <label className="text-editor-field"><span>{copy.fillColor}</span><input type="color" value={selectedElement.fill.startsWith("#") ? selectedElement.fill : "#dceee1"} onChange={(event) => onShapeChange(event.target.value)} /></label>}
            {selectedElement?.type === "image" && <label className="text-editor-field"><span>{copy.alternativeText}</span><input value={selectedElement.alt ?? ""} maxLength={200} onChange={(event) => onImageAltChange(selectedElement, event.target.value)} /></label>}
            {activeSlide && <label className="text-editor-field"><span>{copy.backgroundColor}</span><input type="color" value={activeSlide.background?.color?.startsWith("#") ? activeSlide.background.color : "#ffffff"} onChange={(event) => onBackgroundChange(event.target.value)} /></label>}
            <label className="text-editor-field"><span>{copy.slideNotes}</span><textarea value={slideNotesDraft} onChange={(event) => onSlideNotesChange(event.target.value)} onBlur={onCommitSlideNotes} /></label>
          </aside>
        </div>
      )}
    </section>
  );
}
