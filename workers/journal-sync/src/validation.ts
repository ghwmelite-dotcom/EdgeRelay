/**
 * HMAC verification for journal sync batch payloads.
 *
 * Canonical string format:
 *   account_id:<id>:count:<N>:deals:<sorted,deal,tickets>:ts:<timestamp>
 *
 * Deal tickets are sorted numerically ascending and comma-joined.
 */

export async function verifyJournalHmac(
  accountId: string,
  timestamp: number,
  dealTickets: number[],
  hmacSignature: string,
  secret: string,
): Promise<boolean> {
  if (!hmacSignature || hmacSignature.length === 0) return false;

  // Build canonical string
  const sortedTickets = [...dealTickets].sort((a, b) => a - b).join(',');
  const canonical = `account_id:${accountId}:count:${dealTickets.length}:deals:${sortedTickets}:ts:${timestamp}`;

  // Import key
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  // Sign
  const messageData = encoder.encode(canonical);
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

  // Convert to hex
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const computed = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  // Constant-time comparison
  if (computed.length !== hmacSignature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ hmacSignature.charCodeAt(i);
  }
  return mismatch === 0;
}
