import type { ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CircleHelp,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Layers3,
  Library,
  LockKeyhole,
  MoreHorizontal,
  Palette,
  Presentation,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import type { Locale } from "../../shared/types";
import { showcaseCopy } from "../../i18n/showcase";

interface AppsShowcaseProps {
  locale: Locale;
}



export function AppsShowcase({ locale }: AppsShowcaseProps) {
  const copy = showcaseCopy[locale];

  return (
    <section className="apps-showcase" aria-labelledby="apps-showcase-title">
      <header className="apps-showcase-heading" data-reveal>
        <div>
          <span className="landing-eyebrow"><span />{copy.eyebrow}</span>
          <h2 id="apps-showcase-title">{copy.title}</h2>
        </div>
        <p>{copy.intro}</p>
      </header>

      <section className="apps-product-row" id="product-web" data-apps-row>
        <div className="apps-product-copy" data-apps-copy>
          <span className="apps-product-label">{copy.webLabel}</span>
          <h2>{copy.webTitle}</h2>
          <p>{copy.webCopy}</p>
          <ProductPoints points={[copy.webPointOne, copy.webPointTwo, copy.webPointThree]} />
        </div>
        <WebStudioPreview copy={copy} />
      </section>

      <section className="apps-product-row apps-product-row-reverse" id="product-admin" data-apps-row>
        <div className="apps-product-copy" data-apps-copy>
          <span className="apps-product-label">{copy.adminLabel}</span>
          <h2>{copy.adminTitle}</h2>
          <p>{copy.adminCopy}</p>
          <ProductPoints points={[copy.adminPointOne, copy.adminPointTwo, copy.adminPointThree]} />
          <a className="landing-secondary-button apps-admin-link" href="https://slides-admin.encode.uz" target="_blank" rel="noreferrer">
            {copy.adminLink}<ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
        <AdminPreview copy={copy} />
      </section>

      <section className="apps-product-row apps-mobile-row" id="product-mobile" data-apps-row>
        <div className="apps-product-copy" data-apps-copy>
          <span className="apps-product-label">{copy.mobileLabel}</span>
          <h2>{copy.mobileTitle}</h2>
          <p>{copy.mobileCopy}</p>
          <ProductPoints points={[copy.mobilePointOne, copy.mobilePointTwo, copy.mobilePointThree]} />
        </div>
        <MobilePreview copy={copy} />
      </section>
    </section>
  );
}

function ProductPoints({ points }: { points: string[] }) {
  return (
    <ul className="apps-product-points">
      {points.map((point) => <li key={point}><Check size={15} aria-hidden="true" />{point}</li>)}
    </ul>
  );
}

function PromoFrame({ label, sampleData, children }: { label: string; sampleData: string; children: ReactNode }) {
  return (
    <figure className="apps-promo-figure" data-apps-preview>
      <div className="apps-browser-frame">
        <div className="apps-browser-chrome">
          <div className="landing-window-dots"><i /><i /><i /></div>
          <span>{label}</span>
          <small className="apps-sample-note">{sampleData}</small>
          <MoreHorizontal size={16} aria-hidden="true" />
        </div>
        {children}
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function WebStudioPreview({ copy }: { copy: Record<string, string> }) {
  return (
    <PromoFrame label={copy.screenWeb} sampleData={copy.sampleData}>
      <div className="apps-web-screen">
        <aside className="apps-web-sidebar">
          <span className="apps-screen-brand"><Sparkles size={16} /></span>
          <span className="apps-screen-active"><LayoutDashboard size={15} />{copy.browserSlides}</span>
          <span><FolderOpen size={15} />{copy.browserLibrary}</span>
          <span><Palette size={15} />{copy.browserStyle}</span>
          <span><Settings2 size={15} />{copy.browserSettings}</span>
        </aside>
        <div className="apps-web-main">
          <div className="apps-web-topbar">
            <strong>{copy.browserProject}</strong>
            <span><Check size={12} />{copy.browserSaved}</span>
            <button type="button" aria-label={copy.createSlide}><Plus size={14} /></button>
          </div>
          <div className="apps-web-workspace">
            <div className="apps-slide-strip">
              <span className="apps-slide-selected">01</span><span>02</span><span>03</span><span>04</span>
            </div>
            <div className="apps-slide-stage">
              <div className="apps-slide-art">
                <span>{copy.browserCanvas}</span>
                <div><strong>{copy.browserHeadline}</strong><i /><small>{copy.browserSubline}</small></div>
                <b /><em />
              </div>
            </div>
            <div className="apps-inspector">
              <span><Layers3 size={12} aria-hidden="true" />{copy.browserLayers}</span>
              <div /><div /><div />
            </div>
          </div>
        </div>
      </div>
    </PromoFrame>
  );
}

function AdminPreview({ copy }: { copy: Record<string, string> }) {
  return (
    <PromoFrame label={copy.screenAdmin} sampleData={copy.sampleData}>
      <div className="apps-admin-screen">
        <aside className="apps-admin-sidebar">
          <span className="apps-admin-brand"><ShieldCheck size={16} />slideforge</span>
          <span className="apps-admin-selected"><LayoutDashboard size={14} />{copy.adminOverview}</span>
          <span><UsersRound size={14} />{copy.adminMenuUsers}</span>
          <span><BookOpen size={14} />{copy.adminMenuMarketplace}</span>
          <span><Settings2 size={14} />{copy.adminMenuSettings}</span>
          <span className="apps-admin-secure"><LockKeyhole size={12} />{copy.adminRoleProtected}</span>
        </aside>
        <div className="apps-admin-main">
          <div className="apps-admin-top"><span>Workspace / {copy.adminOverview}</span><span className="apps-admin-avatar">A</span></div>
          <div className="apps-admin-heading"><div><strong>{copy.adminWelcome}</strong><span>{copy.adminSummary}</span></div><button type="button"><Plus size={13} />{copy.adminInvite}</button></div>
          <div className="apps-admin-metrics">
            <div><span>{copy.adminUsers}</span><strong>2,480</strong><small>↗ 12.8%</small><i><UsersRound size={16} /></i></div>
            <div><span>{copy.adminListings}</span><strong>184</strong><small>↗ 8.2%</small><i><BookOpen size={16} /></i></div>
            <div><span>{copy.adminOrders}</span><strong>326</strong><small>↗ 5.4%</small><i><BarChart3 size={16} /></i></div>
          </div>
          <div className="apps-admin-activity">
            <strong>{copy.adminActivity}</strong>
            <div className="apps-admin-table-head"><span>{copy.adminUserColumn}</span><span>{copy.adminStatusColumn}</span><span>{copy.adminRoleColumn}</span></div>
            <div><span><b>JD</b>Jordan Davis</span><span className="apps-status-pill">{copy.adminVerified}</span><span>{copy.adminCustomer}</span></div>
            <div><span><b>MK</b>Morgan Kim</span><span className="apps-status-pill">{copy.adminActive}</span><span>{copy.adminCustomer}</span></div>
          </div>
        </div>
      </div>
    </PromoFrame>
  );
}

function MobilePreview({ copy }: { copy: Record<string, string> }) {
  return (
    <figure className="apps-promo-figure apps-mobile-figure" data-apps-preview>
      <div className="apps-phone-frame">
        <div className="apps-phone-island" />
        <div className="apps-phone-screen">
          <div className="apps-phone-header"><span>slideforge</span><span className="apps-phone-avatar">S</span></div>
          <p className="apps-phone-greeting">{copy.mobileGreeting}</p>
          <h3>{copy.mobileSubheading}</h3>
          <div className="apps-phone-create"><span><Sparkles size={16} /></span><div><strong>{copy.ctaButton}</strong><small>{copy.mobileAiLabel}</small></div><ArrowRight size={14} /></div>
          <div className="apps-phone-section"><strong>{copy.mobileRecent}</strong><Search size={14} /></div>
          <div className="apps-phone-work apps-phone-deck"><span><Presentation size={17} /></span><div><strong>{copy.mobileDeck}</strong><small>{copy.mobileSlideCount}</small></div><MoreHorizontal size={15} /></div>
          <div className="apps-phone-work apps-phone-document"><span><FileText size={17} /></span><div><strong>{copy.mobileArtifact}</strong><small>{copy.mobileUpdated}</small></div><MoreHorizontal size={15} /></div>
          <div className="apps-phone-quiz"><span><CircleHelp size={15} /></span><div><strong>{copy.mobilePractice}</strong><small>{copy.mobilePracticeCopy}</small></div><ArrowRight size={13} /></div>
          <div className="apps-phone-nav"><span><LayoutDashboard size={15} />{copy.mobileNavHome}</span><span><Library size={15} />{copy.mobileNavLibrary}</span><span><UsersRound size={15} />{copy.mobileNavProfile}</span></div>
        </div>
      </div>
      <figcaption>{copy.screenMobile}</figcaption>
    </figure>
  );
}
