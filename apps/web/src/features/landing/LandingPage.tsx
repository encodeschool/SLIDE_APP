import { useCallback, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  Globe2,
  Layers3,
  LayoutTemplate,
  MousePointer2,
  Palette,
  Presentation,
  ShoppingBag,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import type { AuthMode, Locale } from "../../shared/types";
import { landingCopy } from "../../i18n/landing";
import brandMark from "../../assets/slideforge-mark.svg";
import { AppsShowcase } from "./AppsShowcase";
import { usePublicPageMotion } from "./usePublicPageMotion";

interface LandingPageProps {
  locale: Locale;
  onAuth: (mode: AuthMode) => void;
  onToggleLocale: () => void;
}



const features = [
  { icon: WandSparkles, title: "aiTitle", copy: "aiCopy" },
  { icon: MousePointer2, title: "editorTitle", copy: "editorCopy" },
  { icon: BookOpen, title: "exportTitle", copy: "exportCopy" },
] as const;

export function LandingPage({ locale, onAuth, onToggleLocale }: LandingPageProps) {
  const copy = landingCopy[locale];
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [introLoading, setIntroLoading] = useState(true);
  const finishIntro = useCallback(() => setIntroLoading(false), []);

  usePublicPageMotion(rootRef, finishIntro);

  return (
    <div className="landing-page" ref={rootRef}>
      <header className="landing-header">
        <a className="landing-brand" href="/" aria-label={copy.home}>
          <img src={brandMark} alt="" />
          <span>slideforge</span>
        </a>
        <nav className="landing-nav" aria-label={copy.mainNavigation}>
          <a href="#landing-features">{copy.navFeatures}</a>
          <a href="#product-web">{copy.navWeb}</a>
          <a href="#product-admin">{copy.navAdmin}</a>
          <a href="#product-mobile">{copy.navMobile}</a>
          <a href="/marketplace">{copy.navMarketplace}</a>
          <a href="#landing-how">{copy.navHow}</a>
        </nav>
        <div className="landing-header-actions">
          <a className="landing-marketplace-link" href="/marketplace">
            <ShoppingBag size={15} aria-hidden="true" />
            {copy.navMarketplace}
          </a>
          <button className="landing-language" type="button" onClick={onToggleLocale} aria-label={copy.switchLanguage}>
            <Globe2 size={16} aria-hidden="true" />{locale.toUpperCase()}
          </button>
          <button className="landing-signin" type="button" onClick={() => onAuth("login")}>{copy.signIn}</button>
          <button className="landing-header-cta" type="button" onClick={() => onAuth("register")}>
            {copy.getStarted}<ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy" data-hero>
            <span className="landing-eyebrow"><span />{copy.eyebrow}</span>
            <h1>{copy.headline}</h1>
            <p>{copy.intro}</p>
            <div className="landing-hero-actions">
              <button className="landing-primary-button" type="button" onClick={() => onAuth("register")}>
                {copy.startFree}<ArrowRight size={17} aria-hidden="true" />
              </button>
              <a className="landing-secondary-button" href="#landing-how">
                <span><ArrowDown size={15} aria-hidden="true" /></span>{copy.seeHow}
              </a>
            </div>
            <div className="landing-trust-line"><Check size={15} aria-hidden="true" />{copy.noCard}</div>
          </div>

          <div className="landing-visual" data-reveal aria-label={copy.editorPreview}>
            <div className="landing-visual-orbit landing-visual-orbit-one" />
            <div className="landing-visual-orbit landing-visual-orbit-two" />
            <div className="landing-editor-window">
              <div className="landing-editor-bar">
                <div className="landing-window-dots"><i /><i /><i /></div>
                <span>{copy.slideLabel}</span>
                <span className="landing-editor-share"><Check size={12} /> {copy.saved}</span>
              </div>
              <div className="landing-editor-body">
                <aside className="landing-editor-rail">
                  <img src={brandMark} alt="" />
                  <span className="landing-rail-active"><LayoutTemplate size={16} /></span>
                  <span><Layers3 size={16} /></span>
                  <span><Palette size={16} /></span>
                </aside>
                <div className="landing-editor-canvas-area">
                  <div className="landing-canvas-label">{copy.canvasLabel}</div>
                  <div className="landing-slide">
                    <span className="landing-slide-kicker">{copy.slideKicker}</span>
                    <span className="landing-slide-index">01 / 06</span>
                    <div className="landing-slide-copy">
                      <strong>{copy.slideHeadline}</strong>
                      <span />
                      <small>{copy.slideSubline}</small>
                    </div>
                    <div className="landing-slide-shape landing-slide-shape-one" />
                    <div className="landing-slide-shape landing-slide-shape-two" />
                    <div className="landing-slide-photo"><Presentation size={32} /></div>
                  </div>
                  <div className="landing-slide-thumbnails"><span className="selected" /><span /><span /><span /></div>
                </div>
              </div>
            </div>
            <div className="landing-float-card landing-float-ai">
              <span><Sparkles size={16} /></span>
              <div><small>Slideforge AI</small><strong>{copy.toolbarLabel}</strong></div>
            </div>
            <div className="landing-float-card landing-float-ready">
              <span><Check size={15} /></span>
              <div><strong>{copy.miniTwo}</strong><small>PPTX · PDF</small></div>
            </div>
          </div>
          <a className="landing-scroll-hint" href="#landing-features">{copy.navFeatures}<ArrowDown size={14} /></a>
        </section>

        <section className="landing-proof" aria-label={copy.statsLabel} data-reveal>
          <span>{copy.statsLabel}</span>
          <div><strong>01</strong>{copy.statOne}</div>
          <div><strong>02</strong>{copy.statTwo}</div>
          <div><strong>03</strong>{copy.statThree}</div>
        </section>

        <section className="landing-features" id="landing-features">
          <div className="landing-section-heading" data-reveal>
            <div>
              <span className="landing-eyebrow"><span />{copy.featureEyebrow}</span>
              <h2>{copy.featureTitle}</h2>
            </div>
            <p>{copy.featureIntro}</p>
          </div>
          <div className="landing-feature-grid">
            {features.map(({ icon: Icon, title, copy: description }, index) => (
              <article className="landing-feature-card" key={title} data-reveal>
                <span className={`landing-feature-icon landing-feature-icon-${index + 1}`}><Icon size={20} strokeWidth={1.8} /></span>
                <span className="landing-feature-number">0{index + 1}</span>
                <h3>{copy[title]}</h3>
                <p>{copy[description]}</p>
                <span className="landing-feature-rule" />
              </article>
            ))}
          </div>
        </section>

        <AppsShowcase locale={locale} />

        <section className="landing-workflow" id="landing-how">
          <div className="landing-workflow-heading" data-reveal>
            <span className="landing-eyebrow"><span />{copy.workflowEyebrow}</span>
            <h2>{copy.workflowTitle}</h2>
          </div>
          <div className="landing-steps">
            <article data-reveal><span className="landing-step-number">01</span><div><h3>{copy.stepOne}</h3><p>{copy.stepOneCopy}</p></div></article>
            <article data-reveal><span className="landing-step-number">02</span><div><h3>{copy.stepTwo}</h3><p>{copy.stepTwoCopy}</p></div></article>
            <article data-reveal><span className="landing-step-number">03</span><div><h3>{copy.stepThree}</h3><p>{copy.stepThreeCopy}</p></div></article>
          </div>
        </section>

        <section className="landing-cta" data-reveal>
          <div className="landing-cta-mark"><img src={brandMark} alt="" /></div>
          <div><h2>{copy.ctaTitle}</h2><p>{copy.ctaCopy}</p></div>
          <button className="landing-primary-button" type="button" onClick={() => onAuth("register")}>
            {copy.ctaButton}<ArrowRight size={17} aria-hidden="true" />
          </button>
        </section>

      </main>

      <footer className="landing-footer">
        <a className="landing-brand" href="/" aria-label={copy.home}>
          <img src={brandMark} alt="" /><span>slideforge</span>
        </a>
        <span>{copy.footerLine}</span>
        <a href="#product-web">{copy.navWeb}<ArrowRight size={14} aria-hidden="true" /></a>
      </footer>
      <nav className="landing-mobile-actions" aria-label={copy.mainNavigation}>
        <a className="landing-mobile-marketplace" href="/marketplace">
          <ShoppingBag size={17} aria-hidden="true" />
          <span>{copy.navMarketplace}</span>
        </a>
        <button className="landing-mobile-signin" type="button" onClick={() => onAuth("login")}>
          {copy.signIn}
        </button>
        <button className="landing-mobile-start" type="button" onClick={() => onAuth("register")}>
          {copy.getStarted}
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      </nav>
      {introLoading && (
        <div className="public-page-loader" role="status" aria-live="polite">
          <div className="public-loader-card">
            <img src={brandMark} alt="" />
            <strong>slideforge</strong>
            <span className="public-loader-progress" aria-hidden="true"><span /></span>
            <small>{copy.eyebrow}</small>
          </div>
        </div>
      )}
    </div>
  );
}
