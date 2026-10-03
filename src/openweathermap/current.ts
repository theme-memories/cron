import { fetchOpenWeatherMap } from "./request";

const CURRENT_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";

interface WeatherCondition {
  description: string;
  icon: string;
}

interface CurrentWeather {
  dt: number;
  sunrise?: number;
  sunset?: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  clouds: number;
  visibility?: number;
  wind_speed: number;
  wind_gust?: number;
  wind_deg: number;
  rain?: number;
  snow?: number;
  weather: WeatherCondition[];
}

interface RawWeatherCondition extends WeatherCondition {
  id: number;
  main: string;
}

interface RawCurrentWeather {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
  };
  visibility?: number;
  wind: {
    speed: number;
    gust?: number;
    deg: number;
  };
  rain?: { "1h"?: number };
  snow?: { "1h"?: number };
  clouds: { all: number };
  sys: {
    sunrise?: number;
    sunset?: number;
  };
  weather: RawWeatherCondition[];
}

interface CurrentWeatherRequest {
  lat: string;
  lon: string;
  units: string;
  lang: string;
  apiKey: string;
}

function toCurrentWeather(record: RawCurrentWeather): CurrentWeather {
  const { dt, main, visibility, wind, clouds, sys, weather, rain, snow } =
    record;

  return {
    dt,
    ...(sys.sunrise !== undefined ? { sunrise: sys.sunrise } : {}),
    ...(sys.sunset !== undefined ? { sunset: sys.sunset } : {}),
    temp: main.temp,
    feels_like: main.feels_like,
    pressure: main.pressure,
    humidity: main.humidity,
    clouds: clouds.all,
    ...(visibility !== undefined ? { visibility } : {}),
    wind_speed: wind.speed,
    wind_deg: wind.deg,
    ...(wind.gust !== undefined ? { wind_gust: wind.gust } : {}),
    ...(rain && rain["1h"] !== undefined ? { rain: rain["1h"] } : {}),
    ...(snow && snow["1h"] !== undefined ? { snow: snow["1h"] } : {}),
    weather: weather.map(({ description, icon }) => ({
      description,
      icon,
    })),
  };
}

export async function fetchCurrentWeather(
  request: CurrentWeatherRequest,
): Promise<CurrentWeather> {
  const url = new URL(CURRENT_WEATHER_URL);
  url.searchParams.set("lat", request.lat);
  url.searchParams.set("lon", request.lon);
  url.searchParams.set("units", request.units);
  url.searchParams.set("lang", request.lang);
  url.searchParams.set("appid", request.apiKey);

  const record = await fetchOpenWeatherMap<RawCurrentWeather>(
    url,
    "OpenWeatherMap current weather",
  );

  return toCurrentWeather(record);
}
