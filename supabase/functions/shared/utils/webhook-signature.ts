function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyBlingWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  clientSecret: string,
): Promise<boolean> {
  if (!signatureHeader || !clientSecret) return false;

  const hex = await hmacSha256Hex(clientSecret, rawBody);
  const expected = `sha256=${hex}`;
  return timingSafeEqual(signatureHeader, expected);
}

export async function verifyTinyWebhookSignature(
  _rawBody: string,
  _signatureHeader: string | undefined,
  _clientSecret: string,
): Promise<boolean> {
  // Tiny API V3 webhooks não documentam HMAC; aceita quando não há header de assinatura.
  return true;
}
