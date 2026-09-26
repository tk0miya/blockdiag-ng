// The built-in shape roster, registered against shape-registry.ts's
// registry. Later steps add the rest of the shapes here as they're
// ported.
import { registerShape } from "../shape-registry.js";
import { boxShape } from "./box.js";
import { noneShape } from "./none.js";
import { roundedboxShape } from "./roundedbox.js";
import { squareShape } from "./square.js";
import { textboxShape } from "./textbox.js";

export function registerBuiltinShapes(): void {
  registerShape("box", boxShape);
  registerShape("roundedbox", roundedboxShape);
  registerShape("square", squareShape);
  registerShape("none", noneShape);
  registerShape("textbox", textboxShape);
}
