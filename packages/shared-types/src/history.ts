import type { Deck } from "./deck.ts";
import { apply, type Op } from "./ops.ts";

// Undo/redo stack. A new edit clears the redo stack; depth is capped to bound memory.
export class History {
  private undoStack: { op: Op; inverse: Op }[] = [];
  private redoStack: { op: Op; inverse: Op }[] = [];
  constructor(public deck: Deck, private readonly limit = 200) {}

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  do(op: Op): Deck {
    const r = apply(this.deck, op); // throws before any state changes if invalid
    this.deck = r.deck;
    this.undoStack.push({ op, inverse: r.inverse });
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
    return this.deck;
  }
  undo(): Deck {
    const e = this.undoStack.pop();
    if (!e) return this.deck;
    this.deck = apply(this.deck, e.inverse).deck;
    this.redoStack.push(e);
    return this.deck;
  }
  redo(): Deck {
    const e = this.redoStack.pop();
    if (!e) return this.deck;
    const r = apply(this.deck, e.op);
    this.deck = r.deck;
    this.undoStack.push({ op: e.op, inverse: r.inverse });
    return this.deck;
  }
}
