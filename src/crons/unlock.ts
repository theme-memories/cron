const CLEAR_EXPIRED_UNLOCKS_SQL = "DELETE FROM unlock WHERE expireTime <= ?1";

export async function clearExpiredUnlocks(
  env: CloudflareBindings,
): Promise<void> {
  const nowSeconds = Math.floor(Date.now() / 1000);

  const result = await env.DB.prepare(CLEAR_EXPIRED_UNLOCKS_SQL)
    .bind(nowSeconds)
    .run();

  console.log(`Cleared ${result.meta.changes} expired unlock row(s).`);
}
