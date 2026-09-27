// The built-in shape roster, registered against shape-registry.ts's
// registry. Later steps add the rest of the shapes here as they're
// ported.
import { registerShape } from "../shape-registry.js";
import { actorShape } from "./actor.js";
import { beginpointShape } from "./beginpoint.js";
import { boxShape } from "./box.js";
import { circleShape } from "./circle.js";
import { cloudShape } from "./cloud.js";
import { diamondShape } from "./diamond.js";
import { dotsShape } from "./dots.js";
import { ellipseShape } from "./ellipse.js";
import { endpointShape } from "./endpoint.js";
import { mailShape } from "./mail.js";
import { minidiamondShape } from "./minidiamond.js";
import { noneShape } from "./none.js";
import { noteShape } from "./note.js";
import { roundedboxShape } from "./roundedbox.js";
import { squareShape } from "./square.js";
import { textboxShape } from "./textbox.js";

export function registerBuiltinShapes(): void {
  registerShape("box", boxShape);
  registerShape("roundedbox", roundedboxShape);
  registerShape("square", squareShape);
  registerShape("none", noneShape);
  registerShape("textbox", textboxShape);
  registerShape("circle", circleShape);
  registerShape("ellipse", ellipseShape);
  registerShape("diamond", diamondShape);
  // `flowchart.condition` renders identically to `diamond` in the
  // original too (see node-shape.ts for why it's a valid shape name).
  registerShape("flowchart.condition", diamondShape);
  registerShape("minidiamond", minidiamondShape);
  registerShape("dots", dotsShape);
  registerShape("cloud", cloudShape);
  registerShape("note", noteShape);
  registerShape("mail", mailShape);
  registerShape("actor", actorShape);
  registerShape("beginpoint", beginpointShape);
  registerShape("endpoint", endpointShape);
}
