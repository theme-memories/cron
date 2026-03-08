// Type definitions for OpenWeatherMap API response
export interface Coord {
	lon: number;
	lat: number;
}

export interface Weather {
	id: number;
	main: string;
	description: string;
	icon: string;
}

export interface Main {
	temp: number;
	feels_like: number;
	temp_min: number;
	temp_max: number;
	pressure: number;
	humidity: number;
	sea_level: number;
	grnd_level: number;
}

export interface Wind {
	speed: number;
	deg: number;
	gust: number;
}

export interface Clouds {
	all: number;
}

export interface Rain {
	'1h'?: number;
}

export interface Snow {
	'1h'?: number;
}

export interface Sys {
	country: string;
	sunrise: number;
	sunset: number;
}

export interface ApiWeatherData {
	coord: Coord;
	weather: Weather[];
	base: string;
	main: Main;
	visibility: number;
	wind: Wind;
	clouds: Clouds;
	rain?: Rain;
	snow?: Snow;
	dt: number;
	sys: Sys;
	timezone: number;
	id: number;
	name: string;
	cod: number;
}

// Type for our transformed weather data
export interface TransformedWeatherData {
	weather: {
		description: string;
		icon: string;
	};
	temperature: {
		current: number;
		feelsLike: number;
		min: number;
		max: number;
	};
	atmospheric: {
		pressure: number;
		humidity: number;
		seaLevel: number;
		groundLevel: number;
		visibility: number;
	};
	wind: {
		speed: number;
		direction: number;
		gust: number;
	};
	clouds: number;
	sun: {
		sunrise: number;
		sunset: number;
	};
	lastUpdated: number;
	rain?: number;
	snow?: number;
}
