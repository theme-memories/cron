import { Hono } from "hono";
import type {
  WeatherResponseData,
  AlertResponseData,
  FilteredAlertData,
  FilteredWeatherData,
} from "./types";
import {
  WEATHER_LAT,
  WEATHER_LON,
  WEATHER_UNITS,
  WEATHER_LANG,
} from "./constants";

const app = new Hono<{ Bindings: CloudflareBindings }>();

async function runWeatherJob(env: CloudflareBindings): Promise<void> {
  try {
    // Setup
    const OPENWEATHER_BASE_URL =
      "https://api.openweathermap.org/data/4.0/onecall";
    const apiKey = await env.OPENWEATHERMAP_API_KEY.get();
    const params = new URLSearchParams({
      lat: WEATHER_LAT,
      lon: WEATHER_LON,
      units: WEATHER_UNITS,
      lang: WEATHER_LANG,
      appid: apiKey,
    });

    // Fetch Weather
    const weatherResponse = await fetch(
      `${OPENWEATHER_BASE_URL}/current?${params}`,
    );
    if (!weatherResponse.ok) {
      throw new Error(`Weather API Error: ${weatherResponse.status}`);
    }

    // Process Data
    const weatherData: WeatherResponseData = await weatherResponse.json();
    const data = weatherData.data[0];
    const filteredData: FilteredWeatherData = {
      weather: data.weather.map((w) => ({
        description: w.description,
        icon: w.icon,
      })),
      temperature: {
        current: data.temp,
        feelsLike: data.feels_like,
        dewPoint: data.dew_point,
      },
      atmospheric: {
        pressure: data.pressure,
        humidity: data.humidity,
        visibility: data.visibility ?? 0,
        clouds: data.clouds,
        uvi: data.uvi,
      },
      wind: {
        speed: data.wind_speed,
        deg: data.wind_deg,
        gust: data.wind_gust,
      },
      sun: {
        sunrise: data.sunrise,
        sunset: data.sunset,
      },
      lastUpdated: data.dt,
      rain: data.rain?.["1h"] ?? 0,
      snow: data.snow?.["1h"] ?? 0,
      alerts: [],
    };

    // Handle Alerts
    if (data.alerts && data.alerts.length > 0) {
      const alertPromises = data.alerts.map(async (alert) => {
        try {
          const alertParams = new URLSearchParams({ appid: apiKey });
          const alertResponse = await fetch(
            `${OPENWEATHER_BASE_URL}/alert/${alert}?${alertParams}`,
          );
          if (!alertResponse.ok) return null;
          const alertData: AlertResponseData = await alertResponse.json();
          const filteredDescriptions = alertData.description
            .filter((d) => d.description !== "")
            .map((d) => ({
              description: d.description,
            }));
          return filteredDescriptions.length > 0
            ? {
                start: alertData.start,
                end: alertData.end,
                description: filteredDescriptions,
              }
            : null;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          console.error(`Alert ${alert} failed`);
          return null;
        }
      });
      const alertsResults = await Promise.all(alertPromises);
      filteredData.alerts = alertsResults.filter(
        (a): a is FilteredAlertData => a !== null,
      );
    }

    // Store to R2
    await env.R2_BUCKET.put("weather", JSON.stringify(filteredData), {
      httpMetadata: {
        contentType: "application/json",
      },
    });
    console.log("Weather updated");
  } catch (error) {
    console.error(`Job failed: ${error}`);
  }
}

export default {
  fetch: app.fetch,
  async scheduled(
    event: ScheduledEvent,
    env: CloudflareBindings,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(runWeatherJob(env));
  },
};
