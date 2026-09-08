// Ported from `blockdiag.utils.images.get_image_size()`/`calc_image_size()`
// (vendor/blockdiag/src/blockdiag/utils/images.py): an icon's real pixel
// size, and how large it ends up once scaled down (never up) to fit
// within a bounding box while preserving aspect ratio.
//
// The original reads a file's size via Pillow, which - for any format it
// doesn't recognize directly - first re-encodes the whole image into PNG
// through Pillow/ImageMagick (see svg.py's own `image()`, which does the
// same before embedding). That full decode/re-encode pipeline is out of
// scope for this port; only `.jpg`/`.png`/`.gif` are supported, read
// directly from each format's own fixed-position header (no full decode
// needed) - matching the extensions svg.py's `image()` embeds by file
// reference without any conversion at all. Any other extension throws.
import { readFileSync } from "node:fs";
import { extname } from "node:path";

export interface ImageSize {
  readonly width: number;
  readonly height: number;
}

// PNG (ISO/IEC 15948): an 8-byte signature, then the IHDR chunk - 4-byte
// length, 4-byte "IHDR", then big-endian width/height (4 bytes each).
function readPngSize(buf: Buffer): ImageSize {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// GIF (GIF87a/GIF89a): a 6-byte signature, then the Logical Screen
// Descriptor's little-endian width/height (2 bytes each).
function readGifSize(buf: Buffer): ImageSize {
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

// JPEG (ISO/IEC 10918-1): starts with the SOI marker (FFD8), then a
// sequence of marker segments. Each segment (other than the standalone
// markers with no payload) is FF+marker, a big-endian 2-byte length
// (including itself), then that many bytes of payload - so a segment
// this isn't looking for is skipped by jumping `length` bytes ahead
// rather than interpreting its contents. Width/height live 1 byte (the
// sample precision) into an SOFn segment's payload, as big-endian
// height then width - any SOFn except DHT (C4), JPG (C8, never actually
// emitted), and DAC (CC), none of which are actually frame headers.
//
// The spec (ITU-T T.81 B.1.1.3) allows any number of extra `0xFF` fill
// bytes between the one that starts a marker and its actual marker
// code - so this skips over them rather than treating the first `0xFF`
// found as the marker's own start.
function readJpegSize(buf: Buffer): ImageSize {
  let offset = 2;
  while (offset + 1 < buf.length) {
    if (buf[offset] !== 0xff) {
      throw new Error(`malformed JPEG (expected a marker at offset ${offset})`);
    }
    let markerOffset = offset + 1;
    while (buf[markerOffset] === 0xff) {
      markerOffset++;
    }
    const marker = buf[markerOffset];
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset = markerOffset + 1;
      continue;
    }
    const length = buf.readUInt16BE(markerOffset + 1);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(markerOffset + 4), width: buf.readUInt16BE(markerOffset + 6) };
    }
    offset = markerOffset + 1 + length;
  }
  throw new Error("malformed JPEG (no frame header found)");
}

// Ported from `images.get_image_size()`, restricted to the formats
// described above.
export function getImageSize(path: string): ImageSize {
  const ext = extname(path).toLowerCase();
  if (ext !== ".png" && ext !== ".gif" && ext !== ".jpg" && ext !== ".jpeg") {
    throw new Error(`unsupported image format: ${path} (only .jpg/.jpeg/.png/.gif are supported)`);
  }

  const buf = readFileSync(path);
  switch (ext) {
    case ".png":
      return readPngSize(buf);
    case ".gif":
      return readGifSize(buf);
    default:
      return readJpegSize(buf);
  }
}

// Ported from `images.calc_image_size()`: scales `size` down (never up)
// to fit within `bounded`, preserving aspect ratio. The comparison
// between the two axes' scale-down ratios is deliberately as coarse as
// the original's own (`//`, floor division, on both sides) rather than
// an exact ratio comparison - a direct translation, not a "fix" for
// something never reported as a bug.
export function calcImageSize(size: ImageSize, bounded: ImageSize): ImageSize {
  if (bounded.width < size.width || bounded.height < size.height) {
    if (Math.floor(size.width / bounded.width) < Math.floor(size.height / bounded.height)) {
      return { width: Math.floor((size.width * bounded.height) / size.height), height: bounded.height };
    }
    return { width: bounded.width, height: Math.floor((size.height * bounded.width) / size.width) };
  }
  return size;
}
