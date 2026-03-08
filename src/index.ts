import { ApiWeatherData, TransformedWeatherData } from './types';

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(req.url);
		if (url.pathname === '/__scheduled') {
			await this.scheduled({ cron: '* * * * *' } as ScheduledEvent, env, ctx);
			return new Response('Scheduled event triggered manually.');
		}
		return new Response('This is a scheduled worker. Use /__scheduled to trigger manually.');
	},
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(
			(async () => {
				try {
					const apiKey = await env.OPENWEATHERMAP_API_KEY.get();
					const heartbeatUrl = await env.HEARTBEAT_URL.get();
					if (!apiKey || !heartbeatUrl) {
						console.error('A required secret is missing.');
						return;
					}
					const weatherResponse = await fetch(
						`https://api.openweathermap.org/data/2.5/weather?lat=${env.LAT}&lon=${env.LON}&appid=${apiKey}&units=metric&lang=${env.LANG}`,
					);
					if (!weatherResponse.ok) {
						console.error(`Failed to fetch weather data: ${weatherResponse.status} ${await weatherResponse.text()}`);
					} else {
						const data: ApiWeatherData = await weatherResponse.json();
						const weatherData: TransformedWeatherData = {
							weather: {
								description: data.weather[0].description,
								icon: data.weather[0].icon,
							},
							temperature: {
								current: data.main.temp,
								feelsLike: data.main.feels_like,
								min: data.main.temp_min,
								max: data.main.temp_max,
							},
							atmospheric: {
								pressure: data.main.pressure,
								humidity: data.main.humidity,
								seaLevel: data.main.sea_level,
								groundLevel: data.main.grnd_level,
								visibility: data.visibility,
							},
							wind: {
								speed: data.wind.speed,
								direction: data.wind.deg,
								gust: data.wind.gust,
							},
							clouds: data.clouds?.all || 0,
							sun: {
								sunrise: data.sys.sunrise,
								sunset: data.sys.sunset,
							},
							lastUpdated: data.dt,
						};
						if (data.rain?.['1h']) {
							weatherData.rain = data.rain['1h'];
						}
						if (data.snow?.['1h']) {
							weatherData.snow = data.snow['1h'];
						}
						await env.WEATHER_CACHE.put('weather', JSON.stringify(weatherData), {
							httpMetadata: {
								contentType: 'application/json',
							},
							customMetadata: {
								lastUpdated: new Date().toISOString(),
							},
						});
						console.log(`Successfully fetched and stored weather data.`);
					}
					const heartbeatResponse = await fetch(heartbeatUrl);
					if (!heartbeatResponse.ok) {
						console.error(`Failed to ping heartbeat URL: ${heartbeatResponse.status} ${await heartbeatResponse.text()}`);
					} else {
						console.log('Successfully pinged heartbeat URL.');
					}
				} catch (error) {
					console.error('An error occurred in the scheduled worker:', error);
				}
			})(),
		);
	},
};
