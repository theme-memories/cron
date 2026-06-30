import { Hono } from "hono";

interface WeatherResponseData {
  data: {
    dt: number;
    sunrise: number;
    sunset: number;
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    dew_point: number;
    uvi: number;
    clouds: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust: number;
    rain?: {
      "1h": number;
    };
    snow?: {
      "1h": number;
    };
    weather: {
      description: string;
      icon: string;
    }[];
    alerts?: string[];
  }[];
}

interface AlertResponseData {
  start: number;
  end: number;
  description: { description: string }[];
}

interface FilteredAlertData {
  start: number;
  end: number;
  description: { description: string }[];
}

interface FilteredWeatherData {
  weather: { description: string; icon: string }[];
  temperature: { current: number; feelsLike: number; dewPoint: number };
  atmospheric: {
    pressure: number;
    humidity: number;
    visibility: number;
    clouds: number;
    uvi: number;
  };
  wind: { speed: number; deg: number; gust: number };
  sun: { sunrise: number; sunset: number };
  lastUpdated: number;
  rain: number;
  snow: number;
  alerts: FilteredAlertData[];
}

const app = new Hono<{ Bindings: CloudflareBindings }>();

async function runWeatherJob(env: CloudflareBindings): Promise<void> {
  try {
    const apiKey = await env.OPENWEATHERMAP_API_KEY.get();
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/4.0/onecall/current?lat=43.3302&lon=145.5834&appid=${apiKey}&units=metric&lang=ja`,
    );

    if (!weatherResponse.ok) {
      throw new Error(
        `Weather API response error: ${weatherResponse.status} ${weatherResponse.statusText}`,
      );
    }

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

    if (data.alerts && data.alerts.length > 0) {
      const alertPromises = data.alerts.map(async (alert) => {
        try {
          const alertResponse = await fetch(
            `https://api.openweathermap.org/data/4.0/onecall/alert/${alert}?appid=${apiKey}`,
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
        } catch (e) {
          console.error(`Error fetching alert ${alert}:`, e);

          return null;
        }
      });

      const alertsResults = await Promise.all(alertPromises);

      filteredData.alerts = alertsResults.filter(
        (a): a is FilteredAlertData => a !== null,
      );
    }

    await env.R2_BUCKET.put("weather", JSON.stringify(filteredData), {
      httpMetadata: {
        contentType: "application/json",
      },
    });
  } catch (error) {
    console.error("Weather job failed:", error);
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
