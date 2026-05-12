import { NextResponse } from "next/server";
import { keccak256 } from "viem";

import { putReceipt, receiptExists } from "@/lib/blob";
import {
  MAX_RECEIPT_BYTES,
  submitReceiptSchema,
} from "@/lib/submissions";

export const runtime = "nodejs";

/**
 * Store a receipt photo for a price submission. Returns the keccak256 hash
 * the caller should put on-chain in the matching `submitPrice` call.
 *
 * Idempotent: re-uploading the same bytes returns the same hash without
 * a Blob write.
 */
export async function POST(req: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = submitReceiptSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { base64, mimeType } = parsed.data;

  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(base64);
  } catch {
    return NextResponse.json(
      { error: "invalid base64 payload" },
      { status: 400 },
    );
  }
  if (bytes.byteLength > MAX_RECEIPT_BYTES) {
    return NextResponse.json(
      {
        error: `receipt too large (${bytes.byteLength} bytes, max ${MAX_RECEIPT_BYTES})`,
      },
      { status: 413 },
    );
  }

  const hash = keccak256(bytes);
  if (!(await receiptExists(hash, mimeType))) {
    await putReceipt(hash, bytes, mimeType);
  }

  return NextResponse.json({
    receiptHash: hash,
    storedAt: new Date().toISOString(),
  });
}

function base64ToBytes(b64: string): Uint8Array {
  const cleaned = b64.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(cleaned, "base64");
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}
