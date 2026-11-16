import { useState } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole, ShoppingBag, Tag } from "lucide-react";
import type { Locale } from "../../shared/types";
import type { PreviewSlide } from "./marketplaceTypes";
import { carouselLabels } from "../../i18n/carousel";

interface Props {
  title: string;
  slides?: PreviewSlide[];
  locale: Locale;
  compact?: boolean;
  categoryTag?: string;
  slideCount?: number;
  lockedLabel?: string;
  lockedMessage?: string;
  purchaseLabel?: string;
  onPurchase?: () => void;
}



function color(value: string | undefined, fallback: string) {
  return value && /^#[\da-f]{6}$/i.test(value) ? value : fallback;
}

export function SlidePreviewCarousel({
  title,
  slides,
  locale,
  compact = false,
  categoryTag,
  slideCount,
  lockedLabel,
  lockedMessage,
  purchaseLabel,
  onPurchase,
}: Props) {
  const [index, setIndex] = useState(0);
  const previewSlides = slides?.slice(0, 2) ?? [];
  const visibleSlides = previewSlides.length
    ? previewSlides
    : [{ slideNumber: 1, title, text: [], backgroundColor: "#F3F5F1", accentColor: "#28765D" }];
  const totalSlideCount = typeof slideCount === "number" && Number.isSafeInteger(slideCount) && slideCount > 0
    ? Math.max(slideCount, visibleSlides.length)
    : visibleSlides.length;
  const lockedSlideCount = Math.max(0, totalSlideCount - visibleSlides.length);
  const hasLockedSlide = lockedSlideCount > 0 && Boolean(lockedLabel);
  const carouselLength = visibleSlides.length + (hasLockedSlide ? 1 : 0);
  const activeIndex = Math.min(index, carouselLength - 1);
  const isLockedSlide = hasLockedSlide && activeIndex >= visibleSlides.length;
  const slide = visibleSlides[Math.min(activeIndex, visibleSlides.length - 1)];
  const t = carouselLabels[locale];

  function move(direction: -1 | 1) {
    setIndex((current) => (current + direction + carouselLength) % carouselLength);
  }

  return (
    <figure className={`market-slide-preview${compact ? " market-slide-preview-compact" : ""}`}>
      {isLockedSlide ? (
        <div className="market-slide-canvas market-slide-locked" aria-live="polite">
          {categoryTag && <span className="market-slide-category-tag"><Tag size={11} aria-hidden="true" />{categoryTag}</span>}
          <span className="market-slide-locked-icon"><LockKeyhole size={compact ? 20 : 26} aria-hidden="true" /></span>
          <small>{t.preview} · {visibleSlides.length + 1}–{totalSlideCount}</small>
          <strong>{lockedLabel}</strong>
          {lockedMessage && <p>{lockedMessage}</p>}
          {onPurchase && purchaseLabel && (
            <button
              className="secondary-button market-slide-unlock"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onPurchase();
              }}
            >
              <ShoppingBag size={14} aria-hidden="true" />
              {purchaseLabel}
            </button>
          )}
        </div>
      ) : (
        <div
          className="market-slide-canvas"
          style={{
            backgroundColor: color(slide.backgroundColor, "#F3F5F1"),
            borderColor: `${color(slide.accentColor, "#28765D")}33`,
          }}
          aria-live="polite"
        >
          {categoryTag && <span className="market-slide-category-tag"><Tag size={11} aria-hidden="true" />{categoryTag}</span>}
          <span className="market-slide-accent" style={{ backgroundColor: color(slide.accentColor, "#28765D") }} />
          <small>{t.preview} · {slide.slideNumber || activeIndex + 1}</small>
          <strong>{slide.title || title}</strong>
          {slide.text.slice(0, 3).map((line, lineIndex) => <p key={`${activeIndex}-${lineIndex}`}>{line}</p>)}
        </div>
      )}
      {carouselLength > 1 && (
        <figcaption className="market-slide-controls">
          <button type="button" aria-label={t.previous} onClick={(event) => { event.stopPropagation(); move(-1); }}><ArrowLeft size={15} /></button>
          <span>{isLockedSlide ? `${visibleSlides.length + 1}–${totalSlideCount}` : slide.slideNumber || activeIndex + 1} / {totalSlideCount}</span>
          <div className="market-slide-dots" aria-hidden="true">
            {visibleSlides.map((item, dotIndex) => (
              <span className={dotIndex === activeIndex ? "active" : ""} key={item.slideNumber} />
            ))}
            {hasLockedSlide && <span className={`market-slide-lock-dot${isLockedSlide ? " active" : ""}`}><LockKeyhole size={8} /></span>}
          </div>
          <button type="button" aria-label={t.next} onClick={(event) => { event.stopPropagation(); move(1); }}><ArrowRight size={15} /></button>
        </figcaption>
      )}
    </figure>
  );
}
