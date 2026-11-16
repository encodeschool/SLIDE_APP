import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Globe2, ShoppingBag } from "lucide-react";
import type { AuthMode, Locale } from "../../shared/types";
import { landingCopy } from "../../i18n/landing";
import { categoryNames } from "../../i18n/marketplace";
import brandMark from "../../assets/slideforge-mark.svg";

interface StorefrontPageProps {
  locale: Locale;
  children: ReactNode;
  authenticated: boolean;
  workspaceLabel: string;
  cartCount: number;
  onOpenCart: () => void;
  onAuth: (mode: AuthMode) => void;
  onToggleLocale: () => void;
}

export function StorefrontPage({
  locale,
  children,
  authenticated,
  workspaceLabel,
  cartCount,
  onOpenCart,
  onAuth,
  onToggleLocale,
}: StorefrontPageProps) {
  const copy = landingCopy[locale];
  const homeLabel = authenticated ? workspaceLabel : copy.marketplaceBack;

  return (
    <div className="storefront-page">
      <header className="storefront-header">
        <div className="storefront-header-inner">
          <a className="storefront-brand" href="/" aria-label={authenticated ? workspaceLabel : copy.home}>
            <img src={brandMark} alt="" />
            <span>slideforge</span>
          </a>
          <a className="storefront-home-link" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            {homeLabel}
          </a>
          <div className="storefront-actions">
            <button
              className="storefront-cart"
              type="button"
              onClick={onOpenCart}
              aria-label={cartCount > 0 ? `${categoryNames[locale].cart}, ${cartCount}` : categoryNames[locale].cart}
            >
              <ShoppingBag size={16} aria-hidden="true" />
              <span className="storefront-cart-label">{categoryNames[locale].cart}</span>
              {cartCount > 0 && <span className="storefront-cart-count" aria-hidden="true">{cartCount}</span>}
            </button>
            <button
              className="storefront-language"
              type="button"
              onClick={onToggleLocale}
              aria-label={copy.switchLanguage}
            >
              <Globe2 size={16} aria-hidden="true" />
              {locale.toUpperCase()}
            </button>
            {authenticated ? (
              <a className="storefront-signin" href="/">{workspaceLabel}</a>
            ) : (
              <>
                <button className="storefront-signin" type="button" onClick={() => onAuth("login")}>
                  {copy.signIn}
                </button>
                <button className="storefront-register" type="button" onClick={() => onAuth("register")}>
                  {copy.getStarted}
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="storefront-main">{children}</main>
      <footer className="storefront-footer">
        <a className="storefront-brand" href="/" aria-label={authenticated ? workspaceLabel : copy.home}>
          <img src={brandMark} alt="" />
          <span>slideforge</span>
        </a>
        <span>{copy.footerLine}</span>
      </footer>
    </div>
  );
}
