import { Hono } from "hono";
import { ApiResponseData, R2StoredData } from "./types";

const app = new Hono<{ Bindings: CloudflareBindings }>();

async function runWeatherJob(
  env: CloudflareBindings,
): Promise<{ success: boolean; message: string }> {
  try {
    const apiKey = await env.OPENWEATHERMAP_API_KEY.get();
    const healthUrl = await env.HEALTH_URL.get();

    if (!apiKey || !healthUrl) {
      throw new Error("A required secret is missing.");
    }

    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=43.3302&lon=145.5834&appid=${apiKey}&units=metric&lang=ja`,
    );

    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text();
      throw new Error(
        `Failed to fetch weather data: ${weatherResponse.status} ${errorText}`,
      );
    }

    const data: ApiResponseData = await weatherResponse.json();
    const weatherData: R2StoredData = {
      weather: data.weather.map((w) => ({
        description: w.description,
        icon: w.icon,
      })),
      temperature: {
        current: data.main.temp,
        feelsLike: data.main.feels_like,
      },
      atmospheric: {
        pressure: data.main.pressure,
        humidity: data.main.humidity,
        visibility: data.visibility,
        clouds: data.clouds.all,
      },
      wind: {
        speed: data.wind.speed,
        direction: data.wind.deg,
        gust: data.wind.gust,
      },
      sun: {
        sunrise: data.sys.sunrise,
        sunset: data.sys.sunset,
      },
      lastUpdated: data.dt,
      rain: data.rain?.["1h"] ?? 0,
      snow: data.snow?.["1h"] ?? 0,
    };

    await env.WEATHER_CACHE.put("weather", JSON.stringify(weatherData), {
      httpMetadata: {
        contentType: "application/json",
      },
    });

    const healthResponse = await fetch(healthUrl);

    if (!healthResponse.ok) {
      const healthError = await healthResponse.text();
      console.error(
        `Health URL ping failed: ${healthResponse.status} ${healthError}`,
      );
    }

    return {
      success: true,
      message: "Weather data updated and health url pinged successfully.",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Job Error:", msg);
    return { success: false, message: msg };
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
