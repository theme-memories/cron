import { describe, expect, it } from "vitest";
import { clearExpiredUnlocks } from "../src/crons/unlock";

type Call = { sql: string; params: unknown[] };

const createFakeDb = (changes: number) => {
  const calls: Call[] = [];

  const db = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          calls.push({ sql, params });
          return {
            run: async () => ({ meta: { changes } }),
          };
        },
      };
    },
  } as unknown as D1Database;

  return { db, calls };
};

describe("clearExpiredUnlocks", () => {
  it("deletes rows whose expiry has passed", async () => {
    const { db, calls } = createFakeDb(2);
    await clearExpiredUnlocks({ DB: db } as unknown as CloudflareBindings);

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toBe("DELETE FROM unlock WHERE expireTime <= ?1");
  });

  it("binds the current time in seconds", async () => {
    const { db, calls } = createFakeDb(0);
    await clearExpiredUnlocks({ DB: db } as unknown as CloudflareBindings);

    expect(calls[0].params).toHaveLength(1);
    const bound = calls[0].params[0] as number;
    expect(Math.abs(bound - Math.floor(Date.now() / 1000))).toBeLessThanOrEqual(
      1,
    );
  });
});
