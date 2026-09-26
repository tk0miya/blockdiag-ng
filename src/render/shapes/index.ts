// The built-in shape roster, registered against shape-registry.ts's
// registry. Only `box` exists so far - later steps add the rest of the
// shapes here as they're ported.
import { registerShape } from "../shape-registry.js";
import { boxShape } from "./box.js";

export function registerBuiltinShapes(): void {
  registerShape("box", boxShape);
}
