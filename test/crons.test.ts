import { afterEach, describe, expect, it, vi } from "vitest";
import { cronJobs, runScheduled } from "../src/crons";

const context = {
  waitUntil: () => {},
  passThroughOnException: () => {},
} as unknown as ExecutionContext;

const controllerFor = (cron: string) => ({ cron }) as ScheduledController;

const createFakeDb = () => {
  const prepare = vi.fn(() => ({
    bind: () => ({ run: async () => ({ meta: { changes: 3 } }) }),
  }));

  return { db: { prepare } as unknown as D1Database, prepare };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cronJobs", () => {
  it("has at least one handler for every configured schedule", () => {
    expect(Object.keys(cronJobs)).toEqual(["33 * * * *"]);

    for (const jobs of Object.values(cronJobs)) {
      expect(jobs.length).toBeGreaterThan(0);
    }
  });
});

describe("runScheduled", () => {
  it("runs the jobs registered for the firing schedule", async () => {
    const { db, prepare } = createFakeDb();

    await runScheduled(
      controllerFor("33 * * * *"),
      { DB: db } as unknown as CloudflareBindings,
      context,
    );

    expect(prepare).toHaveBeenCalledOnce();
  });

  it("logs and skips a schedule with no registered jobs", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      runScheduled(
        controllerFor("0 0 * * *"),
        {} as CloudflareBindings,
        context,
      ),
    ).resolves.toBeUndefined();

    expect(logged).toHaveBeenCalledWith(
      expect.stringContaining(
        'No cron job registered for schedule "0 0 * * *"',
      ),
    );
  });

  it("rejects with an AggregateError when a job fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const db = {
      prepare: () => {
        throw new Error("D1 unavailable");
      },
    } as unknown as D1Database;

    await expect(
      runScheduled(
        controllerFor("33 * * * *"),
        { DB: db } as unknown as CloudflareBindings,
        context,
      ),
    ).rejects.toBeInstanceOf(AggregateError);
  });
});
