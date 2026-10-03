import { afterEach, describe, expect, it, vi } from "vitest";
import { syncWeather, WEATHER_OBJECT_KEY } from "../src/crons/weather";

type Put = { key: string; body: string; options?: R2PutOptions };

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });

const CURRENT_OK = () =>
  jsonResponse({
    weather: [
      { id: 801, main: "Clouds", description: "晴れ時々曇り", icon: "02d" },
    ],
    main: { temp: 21.4, feels_like: 20.1, pressure: 1012, humidity: 63 },
    visibility: 10_000,
    wind: { speed: 4.6, deg: 210, gust: 7.2 },
    clouds: { all: 40 },
    dt: 1_700_000_000,
    sys: { sunrise: 1_699_989_200, sunset: 1_700_032_400 },
  });

const createFakeBucket = () => {
  const puts: Put[] = [];

  const bucket = {
    put: async (key: string, body: string, options?: R2PutOptions) => {
      puts.push({ key, body, options });
    },
  } as unknown as R2Bucket;

  return { bucket, puts };
};

const createEnv = (bucket: R2Bucket) =>
  ({
    OPENWEATHERMAP_API_KEY: { get: async () => "api-key" },
    OPENWEATHERMAP_LAT: "43.3302",
    OPENWEATHERMAP_LON: "145.5834",
    WEATHER_BUCKET: bucket,
  }) as unknown as CloudflareBindings;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("syncWeather", () => {
  it("writes the reading under the configured cache policy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => CURRENT_OK()),
    );
    const { bucket, puts } = createFakeBucket();

    await syncWeather(createEnv(bucket));

    expect(puts).toHaveLength(1);
    expect(puts[0].key).toBe(WEATHER_OBJECT_KEY);
    expect(puts[0].options?.httpMetadata).toEqual({
      contentType: "application/json",
      cacheControl: "public, max-age=14400, s-maxage=3600",
    });
    expect(JSON.parse(puts[0].body)).toMatchObject({
      temp: 21.4,
      weather: [{ description: "晴れ時々曇り" }],
    });
    expect(JSON.parse(puts[0].body)).not.toHaveProperty("alerts");
  });

  it("keeps the previous snapshot when the current reading fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("upstream down", { status: 503 })),
    );
    const { bucket, puts } = createFakeBucket();

    await expect(syncWeather(createEnv(bucket))).rejects.toThrow(
      "OpenWeatherMap current weather failed with 503",
    );
    expect(puts).toHaveLength(0);
  });
});
