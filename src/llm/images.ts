export function inferImageMimeType(bytes: Uint8Array, fallback = "application/octet-stream"): string {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (bytes.length >= 6 && ascii(bytes.slice(0, 6)) === "GIF87a") {
    return "image/gif";
  }

  if (bytes.length >= 6 && ascii(bytes.slice(0, 6)) === "GIF89a") {
    return "image/gif";
  }

  if (bytes.length >= 12 && ascii(bytes.slice(0, 4)) === "RIFF" && ascii(bytes.slice(8, 12)) === "WEBP") {
    return "image/webp";
  }

  return fallback;
}

function ascii(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}
