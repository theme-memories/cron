import { fetchCurrentWeather } from "../openweathermap/current";

export const WEATHER_OBJECT_KEY = "current-weather.json";

const UNITS = "metric";
const LANG = "ja";

const EDGE_TTL_SECONDS = 60 * 60;
const BROWSER_TTL_SECONDS = 60 * 60 * 4;
const CACHE_CONTROL = `public, max-age=${BROWSER_TTL_SECONDS}, s-maxage=${EDGE_TTL_SECONDS}`;

export async function syncWeather(env: CloudflareBindings): Promise<void> {
  const apiKey = await env.OPENWEATHERMAP_API_KEY.get();

  const current = await fetchCurrentWeather({
    lat: env.OPENWEATHERMAP_LAT,
    lon: env.OPENWEATHERMAP_LON,
    units: UNITS,
    lang: LANG,
    apiKey,
  });

  await env.WEATHER_BUCKET.put(WEATHER_OBJECT_KEY, JSON.stringify(current), {
    httpMetadata: {
      contentType: "application/json",
      cacheControl: CACHE_CONTROL,
    },
  });
}
