# Memory

## Project Overview

`cron` is a Cloudflare Worker that runs scheduled jobs. It has no HTTP surface —
`workers_dev` and `preview_urls` are disabled in `wrangler.jsonc`, and `src/index.ts`
exports only the `scheduled` handler. Schedules are declared under `triggers.crons`
and dispatched by `runScheduled`.

See @README.md for the full overview and @package.json for available commands.

## Commands

- `pnpm dev` — run the Worker locally with `wrangler dev`
- `pnpm test` — run the Vitest suite (`vitest run`)
- `pnpm deploy` — deploy with `wrangler deploy --minify`
- `pnpm cf-typegen` — regenerate `worker-configuration.d.ts` after editing `wrangler.jsonc`

There is no `lint` or `typecheck` script. ESLint and Prettier run through
`lint-staged` from the Husky `pre-commit` hook.

## Code Style Guidelines

- Use descriptive variable names
- Follow existing patterns in the codebase
- Extract complex conditions into meaningful boolean variables
- Prefer named constants for SQL, URLs, and tuning values
- Keep each upstream endpoint in its own module under `src/openweathermap/`
- Only add comments where the logic is not self-evident

## Architecture Notes

- `src/index.ts` exports the `scheduled` handler wired to `runScheduled`.
- `src/crons/index.ts` is the job registry: a `Record<cron expression, CronJob[]>`.
  `runScheduled` runs the matching jobs with `Promise.allSettled`, logs each failure,
  and throws an `AggregateError` if any job rejects. An unknown expression logs the
  known schedules and returns without throwing.
- Every expression in `wrangler.jsonc` (`triggers.crons`) must have a matching key in
  `cronJobs`; `test/crons.test.ts` asserts the two stay in sync.
- `src/crons/weather.ts` (`syncWeather`, `8/10 * * * *`): reads the OpenWeatherMap
  secret, fetches current weather (One Call 4.0) and alerts (One Call 3.0), then writes
  `weather.json` to the `WEATHER_BUCKET` R2 bucket with a `Cache-Control` policy.
  Alerts failures are tolerated (the snapshot is published with an empty `alerts`
  array); a current-weather failure keeps the previous snapshot.
- `src/crons/unlock.ts` (`clearExpiredUnlocks`, `56 * * * *`): deletes expired rows from
  the D1 `unlock` table through the `DB` binding, comparing against epoch seconds.
- `src/openweathermap/request.ts` is the shared fetch helper: a 10s timeout via
  `AbortSignal.timeout` and an error carrying the response body on non-2xx.

## Bindings (wrangler.jsonc)

- `vars`: `OPENWEATHERMAP_LAT`, `OPENWEATHERMAP_LON`
- R2: `WEATHER_BUCKET` → bucket `object`
- Secrets Store: `OPENWEATHERMAP_API_KEY`
- D1: `DB` → database `blog`

## Common Workflows

- Add a cron job: implement it in `src/crons/`, register it in `cronJobs`, add the
  expression to `triggers.crons` in `wrangler.jsonc`, and update `test/crons.test.ts`.
- Add an upstream endpoint: add a module under `src/openweathermap/` that calls
  `fetchOpenWeatherMap`, and cover the response mapping with a test.
- Before pushing: run `pnpm test`; the pre-commit hook handles linting and formatting.
