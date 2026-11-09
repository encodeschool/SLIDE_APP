import type { Deck, DeckElement, Slide } from "./deck.ts";

// Every operation is pure: apply() returns a new deck plus the operation that undoes it.
export type Op =
  | { kind: "addSlide"; slide: Slide; index: number }
  | { kind: "removeSlide"; slideId: string }
  | { kind: "moveSlide"; slideId: string; toIndex: number }
  | { kind: "addElement"; slideId: string; element: DeckElement; index?: number }
  | { kind: "removeElement"; slideId: string; elementId: string }
  | { kind: "updateElement"; slideId: string; elementId: string; patch: Record<string, unknown> }
  | { kind: "setBackground"; slideId: string; color?: string }
  | { kind: "setNotes"; slideId: string; notes: string };

export class OpError extends Error {}

const slideIdx = (d: Deck, id: string) => {
  const i = d.slides.findIndex((s) => s.id === id);
  if (i < 0) throw new OpError(`slide not found: ${id}`);
  return i;
};
const elIdx = (s: Slide, id: string) => {
  const i = s.elements.findIndex((e) => e.id === id);
  if (i < 0) throw new OpError(`element not found: ${id}`);
  return i;
};
const withSlides = (d: Deck, slides: Slide[]): Deck => ({ ...d, slides });
const withSlide = (d: Deck, i: number, s: Slide): Deck =>
  withSlides(d, d.slides.map((x, k) => (k === i ? s : x)));

export function apply(deck: Deck, op: Op): { deck: Deck; inverse: Op } {
  switch (op.kind) {
    case "addSlide": {
      if (deck.slides.some((s) => s.id === op.slide.id)) throw new OpError("duplicate slide id");
      const at = Math.max(0, Math.min(op.index, deck.slides.length));
      const slides = [...deck.slides.slice(0, at), op.slide, ...deck.slides.slice(at)];
      return { deck: withSlides(deck, slides), inverse: { kind: "removeSlide", slideId: op.slide.id } };
    }
    case "removeSlide": {
      const i = slideIdx(deck, op.slideId);
      if (deck.slides.length === 1) throw new OpError("a deck needs at least one slide");
      const removed = deck.slides[i]!;
      return {
        deck: withSlides(deck, deck.slides.filter((_, k) => k !== i)),
        inverse: { kind: "addSlide", slide: removed, index: i },
      };
    }
    case "moveSlide": {
      const from = slideIdx(deck, op.slideId);
      const to = Math.max(0, Math.min(op.toIndex, deck.slides.length - 1));
      const rest = deck.slides.filter((_, k) => k !== from);
      rest.splice(to, 0, deck.slides[from]!);
      return { deck: withSlides(deck, rest), inverse: { kind: "moveSlide", slideId: op.slideId, toIndex: from } };
    }
    case "addElement": {
      const si = slideIdx(deck, op.slideId);
      const s = deck.slides[si]!;
      if (s.elements.some((e) => e.id === op.element.id)) throw new OpError("duplicate element id");
      const at = op.index ?? s.elements.length;
      const elements = [...s.elements.slice(0, at), op.element, ...s.elements.slice(at)];
      return {
        deck: withSlide(deck, si, { ...s, elements }),
        inverse: { kind: "removeElement", slideId: op.slideId, elementId: op.element.id },
      };
    }
    case "removeElement": {
      const si = slideIdx(deck, op.slideId);
      const s = deck.slides[si]!;
      const ei = elIdx(s, op.elementId);
      return {
        deck: withSlide(deck, si, { ...s, elements: s.elements.filter((_, k) => k !== ei) }),
        inverse: { kind: "addElement", slideId: op.slideId, element: s.elements[ei]!, index: ei },
      };
    }
    case "updateElement": {
      const si = slideIdx(deck, op.slideId);
      const s = deck.slides[si]!;
      const ei = elIdx(s, op.elementId);
      const before = s.elements[ei]! as unknown as Record<string, unknown>;
      if ("id" in op.patch || "type" in op.patch) throw new OpError("id and type are immutable");
      const prev: Record<string, unknown> = {};
      for (const k of Object.keys(op.patch)) prev[k] = before[k]; // undefined means "key was absent"
      const next = { ...before, ...op.patch } as unknown as DeckElement;
      const elements = s.elements.map((e, k) => (k === ei ? next : e));
      return {
        deck: withSlide(deck, si, { ...s, elements }),
        inverse: { kind: "updateElement", slideId: op.slideId, elementId: op.elementId, patch: prev },
      };
    }
    case "setNotes": {
      const si = slideIdx(deck, op.slideId);
      const s = deck.slides[si]!;
      return {
        deck: withSlide(deck, si, { ...s, notes: op.notes }),
        inverse: { kind: "setNotes", slideId: op.slideId, notes: s.notes ?? "" },
      };
    }
    case "setBackground": {
      const si = slideIdx(deck, op.slideId);
      const slide = deck.slides[si]!;
      const previousColor = slide.background?.color;
      const slides = deck.slides.map((current, index) => {
        if (index !== si) return current;
        const { background: _background, ...withoutBackground } = current;
        return op.color === undefined ? withoutBackground : { ...current, background: { color: op.color } };
      });
      return {
        deck: withSlides(deck, slides),
        inverse: { kind: "setBackground", slideId: op.slideId, color: previousColor },
      };
    }
  }
}
