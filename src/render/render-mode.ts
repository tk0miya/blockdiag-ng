// Every shape's render function takes one of these as its final
// argument. Ported from `NodeShape.render()`'s two call shapes: the
// normal one and the shadow one (`kwargs.get('shadow')`, drawn shifted
// and flat-colored, with no label/icon/number badge at all - each of
// those is its own `if not kwargs.get('shadow')` check in the
// original).
//
// `font`/`fontSize` deliberately aren't in here: unlike `filter` (which
// only exists for the shadow variant), they don't vary with `kind` at
// all - the original constructs a real `NodeShape` (and so resolves a
// real font) for the shadow pass too, since a shape's *geometry* can
// depend on its label even when the label itself won't be drawn
// (`actor` sizes its body around the label's own measured height
// regardless of `shadow`) - only the decision to actually draw text is
// shadow-gated. Since they're the same values regardless of which
// variant this is, they're passed to a shape's render function as
// their own parameters instead, alongside `mode` - matching
// svg-document.ts's `text()`/`textarea()`, which already take `font`/
// `fontSize` as plain parameters rather than a bundled object.
export type RenderMode =
  | { readonly kind: "normal" }
  | { readonly kind: "shadow"; readonly filter: "transp-blur" | undefined };
