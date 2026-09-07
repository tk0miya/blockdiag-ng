// Every shape's render function takes one of these as its final
// argument. Ported from `NodeShape.render()`'s two call shapes: the
// normal one and the shadow one (`kwargs.get('shadow')`, drawn shifted
// and flat-colored, with no label/icon/number badge at all - each of
// those is its own `if not kwargs.get('shadow')` check in the
// original). Both variants carry `font`/`fontSize`: the original
// constructs a real `NodeShape` (and so resolves a real font) for the
// shadow pass too, since a shape's *geometry* can depend on its label
// even when the label itself won't be drawn (`actor` sizes its body
// around the label's own measured height regardless of `shadow`) -
// only the decision to actually draw text is shadow-gated.
import type { Font } from "./font-metrics.js";

export type RenderMode =
  | { readonly kind: "normal"; readonly font: Font; readonly fontSize: number }
  | {
      readonly kind: "shadow";
      readonly font: Font;
      readonly fontSize: number;
      readonly filter: "transp-blur" | undefined;
    };
