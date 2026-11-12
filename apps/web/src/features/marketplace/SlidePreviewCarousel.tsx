import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Locale } from "../../shared/types";
import type { PreviewSlide } from "./marketplaceTypes";

interface Props {
  title: string;
  slides?: PreviewSlide[];
  locale: Locale;
  compact?: boolean;
}

const labels = {
  en: { preview: "Slide preview", previous: "Previous slide", next: "Next slide" },
  ru: { preview: "Предпросмотр слайдов", previous: "Предыдущий слайд", next: "Следующий слайд" },
  uz: { preview: "Slayd koʻrinishi", previous: "Oldingi slayd", next: "Keyingi slayd" },
};

function color(value: string | undefined, fallback: string) {
  return value && /^#[\da-f]{6}$/i.test(value) ? value : fallback;
}

export function SlidePreviewCarousel({ title, slides, locale, compact = false }: Props) {
  const [index, setIndex] = useState(0);
  const visibleSlides = slides?.length
    ? slides
    : [{ slideNumber: 1, title, text: [], backgroundColor: "#F3F5F1", accentColor: "#28765D" }];
  const activeIndex = Math.min(index, visibleSlides.length - 1);
  const slide = visibleSlides[activeIndex];
  const t = labels[locale];

  function move(direction: -1 | 1) {
    setIndex((current) => (current + direction + visibleSlides.length) % visibleSlides.length);
  }

  return (
    <figure className={`market-slide-preview${compact ? " market-slide-preview-compact" : ""}`}>
      <div
        className="market-slide-canvas"
        style={{
          backgroundColor: color(slide.backgroundColor, "#F3F5F1"),
          borderColor: `${color(slide.accentColor, "#28765D")}33`,
        }}
        aria-live="polite"
      >
        <span className="market-slide-accent" style={{ backgroundColor: color(slide.accentColor, "#28765D") }} />
        <small>{t.preview} · {slide.slideNumber || activeIndex + 1}</small>
        <strong>{slide.title || title}</strong>
        {slide.text.slice(0, 3).map((line, lineIndex) => <p key={`${activeIndex}-${lineIndex}`}>{line}</p>)}
      </div>
      {visibleSlides.length > 1 && (
        <figcaption className="market-slide-controls">
          <button type="button" aria-label={t.previous} onClick={() => move(-1)}><ArrowLeft size={15} /></button>
          <span>{activeIndex + 1} / {visibleSlides.length}</span>
          <div className="market-slide-dots" aria-hidden="true">
            {visibleSlides.map((item, dotIndex) => (
              <span className={dotIndex === activeIndex ? "active" : ""} key={item.slideNumber} />
            ))}
          </div>
          <button type="button" aria-label={t.next} onClick={() => move(1)}><ArrowRight size={15} /></button>
        </figcaption>
      )}
    </figure>
  );
}
