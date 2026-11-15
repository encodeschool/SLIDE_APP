import { useEffect, type RefObject } from "react";

export function usePublicPageMotion(
  rootRef: RefObject<HTMLDivElement | null>,
  onIntroComplete: () => void,
) {
  useEffect(() => {
    const rootElement = rootRef.current;
    if (rootElement === null) return;
    const root: HTMLDivElement = rootElement;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onIntroComplete();
      return;
    }

    let disposeContext: (() => void) | null = null;
    let disposed = false;

    async function initializeMotion() {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);

      const context = gsap.context(() => {
        const loader = root.querySelector<HTMLElement>(".public-page-loader");
        const progress = root.querySelector<HTMLElement>(".public-loader-progress > span");
        const intro = gsap.timeline({ onComplete: onIntroComplete });

        if (progress) {
          intro.to(progress, { scaleX: 1, duration: 0.72, ease: "power2.inOut" });
        } else {
          intro.to({}, { duration: 0.72 });
        }

        if (loader) intro.to(loader, { autoAlpha: 0, duration: 0.38, ease: "power2.out" }, "-=0.06");

        const hero = root.querySelector<HTMLElement>(".landing-hero-copy, .apps-hero-copy");
        if (hero) {
          gsap.fromTo(
            hero,
            { autoAlpha: 0, y: 24 },
            { autoAlpha: 1, y: 0, duration: 0.78, delay: 0.36, ease: "power3.out", clearProps: "transform,opacity,visibility" },
          );
        }

        gsap.utils.toArray<HTMLElement>("[data-apps-row]", root).forEach((row) => {
          const direction = row.classList.contains("apps-product-row-reverse") ? -1 : 1;
          const travelDistance = window.matchMedia("(max-width: 720px)").matches ? 32 : 64;
          const copy = row.querySelector<HTMLElement>("[data-apps-copy]");
          const preview = row.querySelector<HTMLElement>("[data-apps-preview]");
          const panels = [copy, preview].filter((panel): panel is HTMLElement => panel !== null);
          if (panels.length === 0) return;

          gsap.fromTo(
            panels,
            { autoAlpha: 0, x: (index) => (index === 0 ? -direction : direction) * travelDistance, y: 22, rotateY: (index) => (index === 0 ? -direction : direction) * 3, filter: "blur(5px)" },
            {
              autoAlpha: 1,
              x: 0,
              y: 0,
              rotateY: 0,
              filter: "blur(0px)",
              duration: 0.9,
              stagger: 0.14,
              ease: "power3.out",
              clearProps: "transform,opacity,visibility,filter",
              scrollTrigger: { trigger: row, start: "top 82%", once: true },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>("[data-reveal]", root).filter((element) => element.closest("[data-apps-row]") === null).forEach((element) => {
          gsap.fromTo(
            element,
            { autoAlpha: 0, y: 28 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.72,
              ease: "power3.out",
              clearProps: "transform,opacity,visibility",
              scrollTrigger: { trigger: element, start: "top 88%", once: true },
            },
          );
        });

        const landingVisual = root.querySelector<HTMLElement>(".landing-visual");
        if (landingVisual) {
          gsap.to(landingVisual, {
            yPercent: -5,
            ease: "none",
            scrollTrigger: { trigger: ".landing-hero", start: "top top", end: "bottom top", scrub: 0.7 },
          });
        }
      }, root);
      disposeContext = () => context.revert();
    }

    void initializeMotion().catch((error: unknown) => {
      if (disposed) return;
      console.error("Could not initialize public-page motion.", error);
      onIntroComplete();
    });

    return () => {
      disposed = true;
      disposeContext?.();
    };
  }, [onIntroComplete, rootRef]);
}
