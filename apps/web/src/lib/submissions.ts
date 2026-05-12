import { z } from "zod";

export const SUPPORTED_RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_RECEIPT_BYTES = 4 * 1024 * 1024; // 4 MB
export const MAX_BARCODE_LENGTH = 24; // 12 bytes hex without the "0x" prefix

/** Hex (32-byte) regex for receiptHash. */
export const bytes32HexRegex = /^0x[0-9a-fA-F]{64}$/;

/** Hex (12-byte) regex for barcode. */
export const bytes12HexRegex = /^0x[0-9a-fA-F]{24}$/;

/** Hex (6-byte) regex for zoneKey. */
export const bytes6HexRegex = /^0x[0-9a-fA-F]{12}$/;

/**
 * Encode an EAN-13 / UPC barcode digit string into a 12-byte hex literal.
 * Drops the check digit so EAN-13 (13 digits) and UPC-A (12 digits) both
 * fit in the same 96-bit slot. Throws on invalid input.
 */
export function barcodeStringToHex(input: string): `0x${string}` {
  const digits = input.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 13) {
    throw new Error("barcode must be 8..13 digits");
  }
  // Drop check digit for 13- and 12-digit codes; otherwise pad left to 12.
  const trimmed = digits.length >= 12 ? digits.slice(0, digits.length - 1) : digits;
  const padded = trimmed.padStart(24, "0");
  return `0x${padded.padEnd(24, "0").slice(0, 24)}` as `0x${string}`;
}

export const submitReceiptSchema = z.object({
  /** Raw receipt photo bytes encoded as base64 (data URL stripped). */
  base64: z.string().min(1),
  mimeType: z.enum(SUPPORTED_RECEIPT_TYPES),
});

export type SubmitReceiptInput = z.infer<typeof submitReceiptSchema>;

export const submitReceiptResponseSchema = z.object({
  receiptHash: z.string().regex(bytes32HexRegex),
  storedAt: z.string(),
});

export type SubmitReceiptResponse = z.infer<typeof submitReceiptResponseSchema>;
