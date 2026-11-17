import { useRef, useState } from "react";
import type { ChangeEventHandler, DragEvent as ReactDragEvent, FormEventHandler, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";
import {
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Circle,
  Download,
  LayoutTemplate,
  ImagePlus,
  LoaderCircle,
  Plus,
  Save,
  Square,
  Star,
  Type,
  Trash2,
  Undo2,
  Redo2,
} from "lucide-react";
import type { Deck, ShapeElement } from "../../../../../packages/shared-types/src/index.ts";
import type { ExportFormat, ExportJobResponse, PresentationDetail } from "../../shared/types";

type Element = Deck["slides"][number]["elements"][number];
type SlidePoint = { x: number; y: number };
type EditorIcon = "star" | "check" | "arrow";

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
  onAddText: (position?: SlidePoint) => void;
  onAddShape: (shape: ShapeElement["shape"], position?: SlidePoint) => void;
  onAddIcon: (icon: EditorIcon, position?: SlidePoint) => void;
  onImageDrop: (file: File, position: SlidePoint) => void;
  onImageChange: ChangeEventHandler<HTMLInputElement>;
  onDeleteElement: () => void;
  onSelectedTextChange: (value: string) => void;
  onCommitSelectedText: () => void;
  onGeometryChange: (property: "x" | "y" | "w" | "h", value: number, elementId?: string) => void;
  onStyleChange: (patch: Record<string, unknown>) => void;
  onShapeChange: (fill: string) => void;
  onBackgroundChange: (color: string) => void;
  onThemeChange: (theme: { background: string; text: string; fontBody: string }) => void;
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
  onAddIcon,
  onImageChange,
  onImageDrop,
  onDeleteElement,
  onSelectedTextChange,
  onCommitSelectedText,
  onGeometryChange,
  onStyleChange,
  onShapeChange,
  onBackgroundChange,
  onThemeChange,
  onImageAltChange,
  onSlideNotesChange,
  onCommitSlideNotes,
}: PresentationEditorProps) {
  const isExportBusy = exportStarting !== null || exportJob?.status === "QUEUED" || exportJob?.status === "RUNNING";
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [canvasDropActive, setCanvasDropActive] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const elementDrag = useRef<{
    elementId: string;
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    canvasWidth: number;
    canvasHeight: number;
  } | null>(null);

  function startElementDrag(event: ReactPointerEvent<HTMLButtonElement>, element: Element) {
    if (!document || !event.isPrimary || event.button !== 0) return;
    const canvas = event.currentTarget.closest(".editor-canvas");
    const bounds = canvas?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;

    onSelectElement(element);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add("slide-element-dragging");
    elementDrag.current = {
      elementId: element.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: element.x,
      originY: element.y,
      canvasWidth: bounds.width,
      canvasHeight: bounds.height,
    };
  }

  function moveElementDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = elementDrag.current;
    if (!document || !drag || drag.pointerId !== event.pointerId) return;
    const element = activeSlide?.elements.find((item) => item.id === drag.elementId);
    if (!element) return;

    const x = Math.max(0, Math.min(
      document.size.width - element.w,
      drag.originX + (event.clientX - drag.startX) / drag.canvasWidth * document.size.width,
    ));
    const y = Math.max(0, Math.min(
      document.size.height - element.h,
      drag.originY + (event.clientY - drag.startY) / drag.canvasHeight * document.size.height,
    ));
    event.currentTarget.style.left = `${x / document.size.width * 100}%`;
    event.currentTarget.style.top = `${y / document.size.height * 100}%`;
  }

  function finishElementDrag(event: ReactPointerEvent<HTMLButtonElement>, element: Element, commit: boolean) {
    const drag = elementDrag.current;
    if (!document || !drag || drag.pointerId !== event.pointerId) return;
    elementDrag.current = null;
    event.currentTarget.classList.remove("slide-element-dragging");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!commit) {
      event.currentTarget.style.left = `${drag.originX / document.size.width * 100}%`;
      event.currentTarget.style.top = `${drag.originY / document.size.height * 100}%`;
      return;
    }

    const deltaX = (event.clientX - drag.startX) / drag.canvasWidth * document.size.width;
    const deltaY = (event.clientY - drag.startY) / drag.canvasHeight * document.size.height;
    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
    onGeometryChange("x", drag.originX + deltaX, element.id);
    onGeometryChange("y", drag.originY + deltaY, element.id);
  }

  function elementDragProps(element: Element) {
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => startElementDrag(event, element),
      onPointerMove: moveElementDrag,
      onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => finishElementDrag(event, element, true),
      onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => finishElementDrag(event, element, false),
      onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
        const property = event.key === "ArrowLeft" || event.key === "ArrowRight" ? "x"
          : event.key === "ArrowUp" || event.key === "ArrowDown" ? "y" : null;
        if (!property) return;
        event.preventDefault();
        const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
        onSelectElement(element);
        onGeometryChange(property, element[property] + direction * (event.shiftKey ? 10 : 1), element.id);
      },
    };
  }

  function getCanvasPoint(clientX: number, clientY: number): SlidePoint | null {
    if (!document) return null;
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
    return {
      x: Math.max(0, Math.min(document.size.width, (clientX - bounds.left) / bounds.width * document.size.width)),
      y: Math.max(0, Math.min(document.size.height, (clientY - bounds.top) / bounds.height * document.size.height)),
    };
  }

  function handleToolDragStart(event: ReactDragEvent<HTMLButtonElement>, tool: string) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-slideforge-tool", tool);
  }

  function handleCanvasDragOver(event: ReactDragEvent<HTMLElement>) {
    const types = Array.from(event.dataTransfer.types);
    if (!types.includes("Files") && !types.includes("application/x-slideforge-tool")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setCanvasDropActive(true);
  }

  function handleCanvasDrop(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault();
    setCanvasDropActive(false);
    const point = getCanvasPoint(event.clientX, event.clientY);
    if (!point) return;

    const file = event.dataTransfer.files[0];
    if (file) {
      onImageDrop(file, point);
      return;
    }

    const tool = event.dataTransfer.getData("application/x-slideforge-tool");
    switch (tool) {
      case "text":
        onAddText(point);
        break;
      case "rectangle":
        onAddShape("rect", point);
        break;
      case "ellipse":
        onAddShape("ellipse", point);
        break;
      case "star":
      case "check":
      case "arrow":
        onAddIcon(tool, point);
        break;
    }
  }

  return (
    <section className="editor-section editor-fullscreen" aria-labelledby="editor-title">
      <h2 className="visually-hidden" id="editor-title">{copy.presentationTitle}</h2>
      <header className="editor-header editor-topbar">
        <button className="text-button editor-back" type="button" onClick={onClose}>
          <ArrowLeft size={16} aria-hidden="true" /><span>{copy.backToLibrary}</span>
        </button>
        <form className="editor-form editor-title-form" onSubmit={onSave}>
          <label className="visually-hidden" htmlFor="presentation-title-input">{copy.presentationTitle}</label>
          <input id="presentation-title-input" style={{width: "auto"}} maxLength={200} required value={title} onChange={(event) => onTitleChange(event.target.value)} />
          <button className="primary-button editor-save-button" type="submit" disabled={saving}>
            {saving ? <LoaderCircle className="spin-icon" size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
            <span>{saving ? copy.savingChanges : copy.saveChanges}</span>
          </button>
          {saved && <span className="profile-success editor-save-status" role="status">{copy.presentationSaved}</span>}
        </form>
        <div className="editor-topbar-actions">
          {document && (
            <div className="editor-history-actions">
              <button className="icon-button" type="button" title={copy.undo} aria-label={copy.undo} disabled={!canUndo} onMouseDown={(event) => event.preventDefault()} onClick={onUndo}><Undo2 size={17} aria-hidden="true" /></button>
              <button className="icon-button" type="button" title={copy.redo} aria-label={copy.redo} disabled={!canRedo} onMouseDown={(event) => event.preventDefault()} onClick={onRedo}><Redo2 size={17} aria-hidden="true" /></button>
            </div>
          )}
          <span className="project-version">v{presentation.currentVersion}</span>
          <div className="export-actions">
            <button className="secondary-button" type="button" disabled={dirty || isExportBusy} title={dirty ? copy.saveBeforeExport : copy.exportPptx} onClick={() => onStartExport("pptx")}>
              {exportStarting === "pptx" ? <LoaderCircle className="spin-icon" size={15} aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}<span>{copy.exportPptx}</span>
            </button>
            <button className="secondary-button" type="button" disabled={dirty || isExportBusy} title={dirty ? copy.saveBeforeExport : copy.exportPdf} onClick={() => onStartExport("pdf")}>
              {exportStarting === "pdf" ? <LoaderCircle className="spin-icon" size={15} aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}<span>{copy.exportPdf}</span>
            </button>
          </div>
        </div>
      </header>
      {(error || exportError || dirty || exportJob) && (
        <div className="editor-status-strip">
          {error && <p className="form-error" role="alert">{error}</p>}
          {exportError && <p className="form-error" role="alert">{exportError}</p>}
          {dirty && <span className="export-hint">{copy.saveBeforeExport}</span>}
          {exportJob && <div className="export-state" role="status">
            <span>{exportJob.status === "QUEUED" ? copy.exportQueued : exportJob.status === "RUNNING" ? copy.exportRunning : exportJob.status === "FAILED" ? copy.exportFailed : copy.exportReady}</span>
            {exportJob.status === "SUCCEEDED" && <button className="text-button" type="button" onClick={() => onDownloadExport(exportJob)}><Download size={15} aria-hidden="true" />{copy.exportDownload} {exportJob.format.toUpperCase()}</button>}
          </div>}
        </div>
      )}
      {document && activeSlide && (
        <div className="editor-workspace">
          <aside className="slide-navigation" aria-label={copy.slideCount}>
            <div className="editor-overview" aria-label={copy.presentations}>
              <span><strong>{document.slides.length}</strong>{copy.slideCount}</span>
              <span><strong>{document.slides.reduce((total, slide) => total + slide.elements.length, 0)}</strong>{copy.elementCount}</span>
              <span>{presentation.language.toUpperCase()}</span>
            </div>
            <nav className="slide-strip" aria-label={copy.slideCount}>
              {document.slides.map((slide, index) => (
                <button className={`slide-tab ${slide.id === activeSlideId ? "slide-tab-active" : ""}`} type="button" key={slide.id} aria-current={slide.id === activeSlideId ? "page" : undefined} onClick={() => { setEditingTextId(null); onSelectSlide(slide); }}>
                  <span aria-hidden="true" className="slide-thumbnail" style={{ background: slide.background?.color ?? document.theme?.background ?? "#ffffff" }}>
                    {slide.elements.slice(0, 5).map((element) => (
                      <i key={element.id} className={`slide-thumbnail-element thumbnail-${element.type}`} style={{
                        left: `${element.x / document.size.width * 100}%`,
                        top: `${element.y / document.size.height * 100}%`,
                        width: `${element.w / document.size.width * 100}%`,
                        height: `${element.h / document.size.height * 100}%`,
                        background: element.type === "shape" ? element.fill : undefined,
                        color: element.type === "text" ? element.style?.color ?? document.theme?.text : undefined,
                        fontFamily: element.type === "text" ? element.style?.fontFamily ?? document.theme?.fontBody : undefined,
                      }}>{element.type === "text" ? element.text : ""}</i>
                    ))}
                  </span>
                  <small><b>{String(index + 1).padStart(2, "0")}</b>{copy.slide} {index + 1}</small>
                </button>
              ))}
            </nav>
            <div className="slide-actions">
              <button className="primary-button add-slide-button" type="button" title={copy.addSlide} onClick={onAddSlide}><Plus size={16} aria-hidden="true" /><span>{copy.addSlide}</span></button>
              <div className="slide-order-actions">
                <button className="icon-button" type="button" title={copy.moveSlideUp} aria-label={copy.moveSlideUp} disabled={activeSlideIndex <= 0} onClick={() => onMoveSlide(activeSlideIndex - 1)}><ArrowUp size={16} aria-hidden="true" /></button>
                <button className="icon-button" type="button" title={copy.moveSlideDown} aria-label={copy.moveSlideDown} disabled={activeSlideIndex < 0 || activeSlideIndex >= document.slides.length - 1} onClick={() => onMoveSlide(activeSlideIndex + 1)}><ArrowDown size={16} aria-hidden="true" /></button>
                <button className="icon-button remove-element-button" type="button" title={copy.removeSlide} aria-label={copy.removeSlide} disabled={document.slides.length <= 1} onClick={onRemoveSlide}><Trash2 size={16} aria-hidden="true" /></button>
              </div>
            </div>
          </aside>
          <section
            className={`slide-stage ${canvasDropActive ? "slide-stage-drop-active" : ""}`}
            aria-label={`${copy.slide} ${document.slides.findIndex((slide) => slide.id === activeSlideId) + 1}`}
            onDragOver={handleCanvasDragOver}
            onDragLeave={(event) => {
              const nextTarget = event.relatedTarget;
              if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) setCanvasDropActive(false);
            }}
            onDrop={handleCanvasDrop}
          >
            <div ref={canvasRef} className="editor-canvas" style={{ aspectRatio: `${document.size.width} / ${document.size.height}`, background: activeSlide.background?.color ?? document.theme?.background ?? "#ffffff" }}>
              {activeSlide.elements.map((element) => {
                const position = {
                  left: `${element.x / document.size.width * 100}%`,
                  top: `${element.y / document.size.height * 100}%`,
                  width: `${element.w / document.size.width * 100}%`,
                  height: `${element.h / document.size.height * 100}%`,
                };
                if (element.type === "text") {
                  const textStyle = { ...position, fontFamily: element.style?.fontFamily ?? document.theme?.fontBody, fontSize: `${(element.style?.fontSize ?? 28) / 12.8}cqw`, fontWeight: element.style?.fontWeight, color: element.style?.color ?? document.theme?.text ?? "#242a28", textAlign: element.style?.align ?? "left" } as const;
                  if (editingTextId === element.id) {
                    return <textarea className="slide-text-editing slide-element-selected" key={element.id} aria-label={copy.textContent} autoFocus value={selectedTextDraft} style={textStyle} onChange={(event) => onSelectedTextChange(event.target.value)} onBlur={() => { onCommitSelectedText(); setEditingTextId(null); }} onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        onCommitSelectedText();
                        setEditingTextId(null);
                      }
                    }} />;
                  }
                  return <button className={`slide-text-element ${element.id === selectedElement?.id ? "slide-element-selected" : ""}`} type="button" key={element.id} style={textStyle} {...elementDragProps(element)} onClick={() => { onSelectElement(element); setEditingTextId(element.id); }}>{element.text}</button>;
                }
                if (element.type === "shape") {
                  return <button className={`slide-shape-element ${element.id === selectedElement?.id ? "slide-element-selected" : ""}`} type="button" key={element.id} aria-label={element.shape === "ellipse" ? copy.ellipse : copy.rectangle} style={{ ...position, background: element.fill, border: element.stroke ? `1px solid ${element.stroke}` : "1px solid transparent", borderRadius: element.shape === "ellipse" ? "50%" : 0 }} {...elementDragProps(element)} onClick={() => { setEditingTextId(null); onSelectElement(element); }} />;
                }
                return <button className={`slide-image-element ${element.id === selectedElement?.id ? "slide-element-selected" : ""}`} type="button" key={element.id} aria-label={element.alt || copy.elements} style={position} {...elementDragProps(element)} onClick={() => { setEditingTextId(null); onSelectElement(element); }}><img src={element.dataUri} alt="" /></button>;
              })}
              {canvasDropActive && <div className="canvas-drop-overlay" aria-hidden="true">{copy.dropImageHint}</div>}
            </div>
          </section>
          <aside className="element-inspector editor-tools-panel" aria-label={copy.tools}>
            <div className="inspector-heading"><h3>{copy.tools}</h3></div>
            <div className="editor-tool-grid">
              <button className="editor-tool-button" type="button" draggable onDragStart={(event) => handleToolDragStart(event, "text")} title={copy.addText} onClick={() => onAddText()}><Type size={17} aria-hidden="true" /><span>{copy.addText}</span></button>
              <button className="editor-tool-button" type="button" draggable onDragStart={(event) => handleToolDragStart(event, "rectangle")} title={copy.addRectangle} onClick={() => onAddShape("rect")}><Square size={16} aria-hidden="true" /><span>{copy.addRectangle}</span></button>
              <button className="editor-tool-button" type="button" draggable onDragStart={(event) => handleToolDragStart(event, "ellipse")} title={copy.addEllipse} onClick={() => onAddShape("ellipse")}><Circle size={16} aria-hidden="true" /><span>{copy.addEllipse}</span></button>
              <button className="editor-tool-button" type="button" draggable onDragStart={(event) => handleToolDragStart(event, "star")} title={copy.iconStar} onClick={() => onAddIcon("star")}><Star size={16} aria-hidden="true" /><span>{copy.iconStar}</span></button>
              <button className="editor-tool-button" type="button" draggable onDragStart={(event) => handleToolDragStart(event, "check")} title={copy.iconCheck} onClick={() => onAddIcon("check")}><Check size={16} aria-hidden="true" /><span>{copy.iconCheck}</span></button>
              <button className="editor-tool-button" type="button" draggable onDragStart={(event) => handleToolDragStart(event, "arrow")} title={copy.iconArrow} onClick={() => onAddIcon("arrow")}><ArrowRight size={16} aria-hidden="true" /><span>{copy.iconArrow}</span></button>
              <button className="editor-tool-button" type="button" title={copy.addImage} onClick={() => imageInput.current?.click()}><ImagePlus size={16} aria-hidden="true" /><span>{copy.addImage}</span></button>
              <input ref={imageInput} className="hidden-file-input" type="file" accept="image/*" onChange={onImageChange} />
            </div>
            <div className="element-list-heading">
              <h4>{copy.elements}</h4>
              <button className="icon-button remove-element-button" type="button" title={copy.deleteElement} aria-label={copy.deleteElement} disabled={!selectedElement} onClick={onDeleteElement}><Trash2 size={16} aria-hidden="true" /></button>
            </div>
            <div className="element-list">
              {activeElements.map((element, index) => (
                <button className={`element-list-item ${element.id === selectedElement?.id ? "element-list-item-active" : ""}`} type="button" key={element.id} onClick={() => { setEditingTextId(null); onSelectElement(element); }}>
                  <span>{element.type === "text" ? copy.textElements : element.type === "shape" ? element.shape === "ellipse" ? copy.ellipse : copy.rectangle : copy.elements} {index + 1}</span>
                  <small>{element.type === "text" ? element.text || copy.newText : element.type === "shape" ? element.fill : element.alt || copy.elements}</small>
                </button>
              ))}
            </div>
            <fieldset className="element-properties theme-properties">
              <legend><LayoutTemplate size={14} aria-hidden="true" />{copy.theme}</legend>
              <label className="element-property-wide"><span>{copy.theme}</span><select aria-label={copy.theme} className="full-width-control" value={document.theme?.background === "#edf4f8" ? "ocean" : document.theme?.background === "#f4ece7" ? "sunset" : document.theme?.background === "#f5f0e8" ? "warm" : document.theme?.background === "#f4f6ef" ? "sage" : document.theme ? "custom" : "sage"} onChange={(event) => {
                const themes = {
                  sage: { background: "#f4f6ef", text: "#27362d", fontBody: "Arial" },
                  ocean: { background: "#edf4f8", text: "#203749", fontBody: "Georgia" },
                  sunset: { background: "#f4ece7", text: "#49332c", fontBody: "Georgia" },
                  warm: { background: "#f5f0e8", text: "#292b36", fontBody: "Georgia" },
                };
                onThemeChange(themes[event.target.value as keyof typeof themes]);
              }}>
                <option value="custom" disabled>{copy.themeCustom}</option><option value="sage">{copy.themeSage}</option><option value="ocean">{copy.themeOcean}</option><option value="sunset">{copy.themeSunset}</option><option value="warm">{copy.themeWarm}</option>
              </select></label>
            </fieldset>
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
                <label className="element-property-wide"><span>{copy.fontFamily}</span><select className="full-width-control" value={selectedText.style?.fontFamily ?? document.theme?.fontBody ?? "Arial"} onChange={(event) => onStyleChange({ fontFamily: event.target.value })}>
                  {Array.from(new Set([selectedText.style?.fontFamily ?? document.theme?.fontBody ?? "Arial", "Arial", "Georgia", "Inter", "Lato", "Manrope", "Montserrat", "Roboto", "Times New Roman", "Verdana"])).map((font) => <option value={font} key={font}>{font}</option>)}
                </select></label>
                <label className="element-property-wide"><span>{copy.customFontFamily}</span><input className="full-width-control" type="text" maxLength={80} defaultValue={selectedText.style?.fontFamily ?? document.theme?.fontBody ?? "Arial"} key={`${selectedText.id}-font-family-${selectedText.style?.fontFamily ?? document.theme?.fontBody ?? "Arial"}`} onBlur={(event) => {
                  const fontFamily = event.currentTarget.value.trim();
                  if (fontFamily && fontFamily !== (selectedText.style?.fontFamily ?? document.theme?.fontBody ?? "Arial")) onStyleChange({ fontFamily });
                }} /></label>
                <label><span>{copy.fontSize}</span><input type="number" min={8} max={120} defaultValue={selectedText.style?.fontSize ?? 28} key={`${selectedText.id}-font-${selectedText.style?.fontSize ?? 28}`} onBlur={(event) => { const fontSize = event.currentTarget.valueAsNumber; if (fontSize >= 8 && fontSize <= 120) onStyleChange({ fontSize }); }} /></label>
                <label><span>{copy.textColor}</span><input type="color" value={selectedText.style?.color?.startsWith("#") ? selectedText.style.color : document.theme?.text?.startsWith("#") ? document.theme.text : "#242a28"} onChange={(event) => onStyleChange({ color: event.target.value })} /></label>
                <label><span>{copy.alignment}</span><select value={selectedText.style?.align ?? "left"} onChange={(event) => onStyleChange({ align: event.target.value })}><option value="left">{copy.leftAlign}</option><option value="center">{copy.centerAlign}</option><option value="right">{copy.rightAlign}</option></select></label>
              </fieldset>
            )}
            {selectedElement?.type === "shape" && <label className="text-editor-field"><span>{copy.fillColor}</span><input type="color" value={selectedElement.fill.startsWith("#") ? selectedElement.fill : "#dceee1"} onChange={(event) => onShapeChange(event.target.value)} /></label>}
            {selectedElement?.type === "image" && <label className="text-editor-field"><span>{copy.alternativeText}</span><input value={selectedElement.alt ?? ""} maxLength={200} onChange={(event) => onImageAltChange(selectedElement, event.target.value)} /></label>}
            {activeSlide && <label className="text-editor-field"><span>{copy.backgroundColor}</span><input type="color" value={activeSlide.background?.color?.startsWith("#") ? activeSlide.background.color : document.theme?.background ?? "#ffffff"} onChange={(event) => onBackgroundChange(event.target.value)} /></label>}
            <label className="text-editor-field"><span>{copy.slideNotes}</span><textarea value={slideNotesDraft} onChange={(event) => onSlideNotesChange(event.target.value)} onBlur={onCommitSlideNotes} /></label>
          </aside>
        </div>
      )}
    </section>
  );
}
