/**
 * Verifies HMAC-SHA256 signature of a signal payload.
 *
 * Reconstructs the signing input by sorting payload keys alphabetically,
 * excluding the `hmac_signature` field, then comparing via crypto.subtle.
 */
export async function verifyHmacSignature(
  payload: Record<string, unknown>,
  secret: string,
): Promise<boolean> {
  const providedSignature = payload['hmac_signature'];
  if (typeof providedSignature !== 'string') {
    return false;
  }

  // Build canonical message: sort keys alphabetically, exclude hmac_signature
  const sortedEntries = Object.keys(payload)
    .filter((key) => key !== 'hmac_signature')
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = payload[key];
      return acc;
    }, {});

  const message = JSON.stringify(sortedEntries);
  const encoder = new TextEncoder();

  // Import the secret as a CryptoKey
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  // Sign the canonical message
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));

  // Convert to hex string
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison via length check + subtle
  if (expectedSignature.length !== providedSignature.length) {
    return false;
  }

  // Use byte-level comparison to avoid timing attacks
  const expectedBytes = encoder.encode(expectedSignature);
  const providedBytes = encoder.encode(providedSignature);

  let mismatch = 0;
  for (let i = 0; i < expectedBytes.length; i++) {
    mismatch |= (expectedBytes[i] ?? 0) ^ (providedBytes[i] ?? 0);
  }

  return mismatch === 0;
}
