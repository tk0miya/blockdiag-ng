// Ported from `blockdiag.utils.Box`/`Size` (vendor/blockdiag/src/blockdiag/
// utils/__init__.py): pixel-space rectangles and dimensions, as opposed to
// the grid-space `XY` in the model (src/model/elements.ts) that layout
// works in. Only `width`/`height` are needed so far - later rendering
// steps add the rest of `Box`'s corner/edge accessors as they need them.
export interface Box {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export function boxWidth(box: Box): number {
  return box.x2 - box.x1;
}

export function boxHeight(box: Box): number {
  return box.y2 - box.y1;
}
