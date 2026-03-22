/**
 * Checks whether a signal with the given sequence_num already exists
 * for the specified master account in the D1 signals table.
 */
export async function isDuplicate(
  db: D1Database,
  accountId: string,
  sequenceNum: number,
): Promise<boolean> {
  const result = await db
    .prepare('SELECT 1 FROM signals WHERE master_account_id = ? AND sequence_num = ? LIMIT 1')
    .bind(accountId, sequenceNum)
    .first<{ '1': number }>();

  return result !== null;
}
