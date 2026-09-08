import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calcImageSize, getImageSize } from "./images.js";

const FIXTURES_DIR = join(import.meta.dirname, "test-fixtures");

describe("getImageSize", () => {
  it("reads a PNG's width/height from its IHDR chunk", () => {
    expect(getImageSize(join(FIXTURES_DIR, "icon.png"))).toEqual({ width: 32, height: 16 });
  });

  it("reads a GIF's width/height from its logical screen descriptor", () => {
    expect(getImageSize(join(FIXTURES_DIR, "icon.gif"))).toEqual({ width: 24, height: 12 });
  });

  it("reads a JPEG's width/height from its SOF0 segment", () => {
    expect(getImageSize(join(FIXTURES_DIR, "icon.jpg"))).toEqual({ width: 48, height: 20 });
  });

  it("skips 0xFF fill bytes before a JPEG marker's own code, per the spec", () => {
    expect(getImageSize(join(FIXTURES_DIR, "icon-padded.jpg"))).toEqual({ width: 48, height: 20 });
  });

  it("throws for a JPEG with a non-0xFF byte where a marker was expected", () => {
    expect(() => getImageSize(join(FIXTURES_DIR, "malformed.jpg"))).toThrow(/expected a marker/);
  });

  it("throws for a JPEG with no frame header segment at all", () => {
    expect(() => getImageSize(join(FIXTURES_DIR, "no-sof.jpg"))).toThrow(/no frame header found/);
  });

  it("throws for an unsupported format", () => {
    expect(() => getImageSize(join(FIXTURES_DIR, "icon.bmp"))).toThrow(/unsupported image format/);
  });
});

describe("calcImageSize", () => {
  it("leaves the size alone when it already fits within the bounds", () => {
    expect(calcImageSize({ width: 10, height: 5 }, { width: 20, height: 20 })).toEqual({ width: 10, height: 5 });
  });

  it("scales a too-wide image down to the bound width, preserving aspect ratio", () => {
    // 100x50, bounded to 20x20: width ratio floor(100/20)=5 is not less
    // than height ratio floor(50/20)=2, so width becomes the fixed
    // (bound) side and height scales down to match it.
    expect(calcImageSize({ width: 100, height: 50 }, { width: 20, height: 20 })).toEqual({ width: 20, height: 10 });
  });

  it("scales a too-tall image down to the bound height, preserving aspect ratio", () => {
    // 50x100, bounded to 20x20: width ratio floor(50/20)=2 is less than
    // height ratio floor(100/20)=5, so height becomes the fixed (bound)
    // side and width scales down to match it.
    expect(calcImageSize({ width: 50, height: 100 }, { width: 20, height: 20 })).toEqual({ width: 10, height: 20 });
  });

  it("never scales a smaller image up", () => {
    expect(calcImageSize({ width: 5, height: 5 }, { width: 5, height: 5 })).toEqual({ width: 5, height: 5 });
  });
});
