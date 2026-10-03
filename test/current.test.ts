import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCurrentWeather } from "../src/openweathermap/current";

const REQUEST = {
  lat: "43.3302",
  lon: "145.5834",
  units: "metric",
  lang: "ja",
  apiKey: "api-key",
};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchCurrentWeather", () => {
  it("flattens the reading into the fields the widget renders", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          coord: { lon: 145.5834, lat: 43.3302 },
          weather: [
            {
              id: 801,
              main: "Clouds",
              description: "晴れ時々曇り",
              icon: "02d",
            },
          ],
          base: "stations",
          main: {
            temp: 21.4,
            feels_like: 20.1,
            temp_min: 19.8,
            temp_max: 22.6,
            pressure: 1012,
            humidity: 63,
            sea_level: 1012,
            grnd_level: 1010,
          },
          visibility: 10_000,
          wind: { speed: 4.6, deg: 210, gust: 7.2 },
          rain: { "1h": 0.5 },
          snow: { "1h": 0.2 },
          clouds: { all: 40 },
          dt: 1_700_000_000,
          sys: {
            type: 2,
            id: 2_000_000,
            country: "JP",
            sunrise: 1_699_989_200,
            sunset: 1_700_032_400,
          },
          timezone: 32_400,
          id: 2_128_295,
          name: "Wakkanai",
          cod: 200,
        }),
      ),
    );

    await expect(fetchCurrentWeather(REQUEST)).resolves.toEqual({
      dt: 1_700_000_000,
      sunrise: 1_699_989_200,
      sunset: 1_700_032_400,
      temp: 21.4,
      feels_like: 20.1,
      pressure: 1012,
      humidity: 63,
      clouds: 40,
      visibility: 10_000,
      wind_speed: 4.6,
      wind_gust: 7.2,
      wind_deg: 210,
      rain: 0.5,
      snow: 0.2,
      weather: [{ description: "晴れ時々曇り", icon: "02d" }],
    });
  });

  it("omits precipitation and gusts the reading does not carry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          weather: [
            { id: 800, main: "Clear", description: "快晴", icon: "01d" },
          ],
          main: {
            temp: 20,
            feels_like: 20,
            pressure: 1010,
            humidity: 50,
          },
          wind: { speed: 1, deg: 90 },
          clouds: { all: 0 },
          dt: 1_700_000_000,
          sys: { sunrise: 1_699_989_200, sunset: 1_700_032_400 },
        }),
      ),
    );

    const weather = await fetchCurrentWeather(REQUEST);

    expect(weather).not.toHaveProperty("rain");
    expect(weather).not.toHaveProperty("snow");
    expect(weather).not.toHaveProperty("wind_gust");
    expect(weather).not.toHaveProperty("visibility");
  });

  it("asks for the current weather through the 2.5 endpoint", async () => {
    const calls: { url: URL; init?: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: URL, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse({
        weather: [{ id: 800, main: "Clear", description: "快晴", icon: "01d" }],
        main: { temp: 20, feels_like: 20, pressure: 1010, humidity: 50 },
        wind: { speed: 1, deg: 90 },
        clouds: { all: 0 },
        dt: 1_700_000_000,
        sys: {},
      });
    });

    await fetchCurrentWeather(REQUEST);

    expect(calls).toHaveLength(1);
    expect(calls[0].url.origin + calls[0].url.pathname).toBe(
      "https://api.openweathermap.org/data/2.5/weather",
    );
    expect(calls[0].url.searchParams.get("units")).toBe("metric");
    expect(calls[0].url.searchParams.get("lang")).toBe("ja");
    expect(calls[0].url.searchParams.get("appid")).toBe("api-key");
    expect(calls[0].init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("throws with the response body when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("quota exceeded", { status: 429 })),
    );

    await expect(fetchCurrentWeather(REQUEST)).rejects.toThrow(
      "OpenWeatherMap current weather failed with 429: quota exceeded",
    );
  });
});
