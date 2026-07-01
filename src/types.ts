export interface WeatherResponseData {
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

export interface AlertResponseData {
  start: number;
  end: number;
  description: { description: string }[];
}

export interface FilteredAlertData {
  start: number;
  end: number;
  description: { description: string }[];
}

export interface FilteredWeatherData {
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
