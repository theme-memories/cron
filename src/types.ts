export interface ApiResponseData {
  weather: {
    description: string;
    icon: string;
  }[];
  main: {
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
    gust: number;
  };
  clouds: {
    all: number;
  };
  rain?: {
    "1h": number;
  };
  snow?: {
    "1h": number;
  };
  dt: number;
  sys: {
    sunrise: number;
    sunset: number;
  };
}

export interface R2StoredData {
  weather: {
    description: string;
    icon: string;
  }[];
  temperature: {
    current: number;
    feelsLike: number;
  };
  atmospheric: {
    pressure: number;
    humidity: number;
    visibility: number;
    clouds: number;
  };
  wind: {
    speed: number;
    direction: number;
    gust: number;
  };
  sun: {
    sunrise: number;
    sunset: number;
  };
  lastUpdated: number;
  rain: number;
  snow: number;
}
