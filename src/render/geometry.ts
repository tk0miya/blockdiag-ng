// Ported from `blockdiag.utils.Box`/`Size` (vendor/blockdiag/src/blockdiag/
// utils/__init__.py): pixel-space rectangles and dimensions, as opposed to
// the grid-space `XY` in the model (src/model/elements.ts) that layout
// works in. Only `width`/`height`/`center`/`top`/`right`/`bottom`/`left`/
// the four corners are needed so far - later rendering steps add the
// rest of `Box`'s accessors as they need them.
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

export interface Point {
  readonly x: number;
  readonly y: number;
}

export function boxWidth(box: Box): number {
  return box.x2 - box.x1;
}

export function boxHeight(box: Box): number {
  return box.y2 - box.y1;
}

// Ported from `Box.center`.
export function boxCenter(box: Box): Point {
  return { x: box.x1 + Math.floor(boxWidth(box) / 2), y: box.y1 + Math.floor(boxHeight(box) / 2) };
}

// Ported from `Box.top`/`.right`/`.bottom`/`.left`: the midpoint of each
// of the box's own four edges.
export function boxTop(box: Box): Point {
  return { x: box.x1 + Math.floor(boxWidth(box) / 2), y: box.y1 };
}

export function boxRight(box: Box): Point {
  return { x: box.x2, y: box.y1 + Math.floor(boxHeight(box) / 2) };
}

export function boxBottom(box: Box): Point {
  return { x: box.x1 + Math.floor(boxWidth(box) / 2), y: box.y2 };
}

export function boxLeft(box: Box): Point {
  return { x: box.x1, y: box.y1 + Math.floor(boxHeight(box) / 2) };
}

// Ported from `Box.topleft`/`.topright`/`.bottomleft`/`.bottomright`.
export function boxTopLeft(box: Box): Point {
  return { x: box.x1, y: box.y1 };
}

export function boxTopRight(box: Box): Point {
  return { x: box.x2, y: box.y1 };
}

export function boxBottomLeft(box: Box): Point {
  return { x: box.x1, y: box.y2 };
}

export function boxBottomRight(box: Box): Point {
  return { x: box.x2, y: box.y2 };
}

// Ported from `Box.get_padding_for()`: the offset from `box`'s own
// top-left at which a `size`-shaped thing sits when aligned within it -
// flush against an edge (plus `padding`) for `"left"`/`"right"`/
// `"top"`/`"bottom"`, or centered (ignoring `padding`) otherwise.
export function getPaddingFor(
  box: Box,
  size: Size,
  options: {
    readonly halign?: "left" | "center" | "right";
    readonly valign?: "top" | "center" | "bottom";
    readonly padding?: number;
  } = {},
): Point {
  const padding = options.padding ?? 0;

  let x: number;
  if (options.halign === "left") {
    x = padding;
  } else if (options.halign === "right") {
    x = boxWidth(box) - size.width - padding;
  } else {
    x = Math.ceil((boxWidth(box) - size.width) / 2);
  }

  let y: number;
  if (options.valign === "top") {
    y = padding;
  } else if (options.valign === "bottom") {
    y = boxHeight(box) - size.height - padding;
  } else {
    y = Math.ceil((boxHeight(box) - size.height) / 2);
  }

  return { x, y };
}
