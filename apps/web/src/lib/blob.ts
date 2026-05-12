import "server-only";
import { head, put } from "@vercel/blob";

const RECEIPT_PREFIX = "receipts" as const;

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

function pathnameFor(hash: string, mimeType: string): string {
  return `${RECEIPT_PREFIX}/${hash}.${extensionFor(mimeType)}`;
}

export async function receiptExists(
  hash: string,
  mimeType: string,
): Promise<boolean> {
  try {
    await head(pathnameFor(hash, mimeType));
    return true;
  } catch {
    return false;
  }
}

export async function putReceipt(
  hash: string,
  bytes: Uint8Array,
  mimeType: string,
): Promise<{ url: string }> {
  const result = await put(pathnameFor(hash, mimeType), Buffer.from(bytes), {
    access: "public",
    contentType: mimeType,
    addRandomSuffix: false,
    cacheControlMaxAge: 60 * 60 * 24 * 30,
  });
  return { url: result.url };
}

export async function getReceiptUrl(
  hash: string,
  mimeType: string,
): Promise<string | null> {
  try {
    const meta = await head(pathnameFor(hash, mimeType));
    return meta.url;
  } catch {
    return null;
  }
}
