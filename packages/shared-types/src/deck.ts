// Canonical presentation model, schemaVersion 1. Mirrors services/presentation-renderer.
// Units: px on deck.size (default 1280x720).
export interface TextStyle {
  fontFamily?: string; fontSize?: number; fontWeight?: number;
  color?: string; align?: "left" | "center" | "right";
  italic?: boolean; underline?: boolean;
}
interface ElementBase { id: string; x: number; y: number; w: number; h: number }
export interface TextElement extends ElementBase { type: "text"; text: string; style?: TextStyle }
export interface ShapeElement extends ElementBase { type: "shape"; shape: "rect" | "ellipse"; fill: string; stroke?: string }
export interface ImageElement extends ElementBase { type: "image"; dataUri: string; alt?: string }
export type DeckElement = TextElement | ShapeElement | ImageElement;

export interface Slide {
  id: string; notes?: string; background?: { color: string }; elements: DeckElement[];
}
export interface Deck {
  schemaVersion: 1; id: string; title: string; language: string;
  size: { width: number; height: number };
  theme?: { background?: string; text?: string; fontBody?: string };
  slides: Slide[];
}
