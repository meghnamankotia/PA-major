import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Weather code descriptions from WMO standard
const weatherCodeMap: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snowfall',
  73: 'Moderate snowfall',
  75: 'Heavy snowfall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

function describeWeatherCode(code: number): string {
  return weatherCodeMap[code] || `Unknown (code ${code})`;
}

/**
 * Geocode a city name to latitude/longitude using Open-Meteo's free geocoding API.
 */
async function geocodeCity(city: string): Promise<{ lat: number; lon: number; name: string; country: string }> {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`);
  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`Could not find location: "${city}". Try a more specific city name.`);
  }

  const result = data.results[0];
  return {
    lat: result.latitude,
    lon: result.longitude,
    name: result.name,
    country: result.country,
  };
}

const weatherInput = z.object({
  city: z.string().describe('City name to get weather for (e.g. "Delhi", "Mumbai", "London")'),
});

export const getCurrentWeatherTool = createTool({
  id: 'getCurrentWeather',
  description: 'Gets the current weather conditions for a city — temperature, humidity, wind speed, and weather description.',
  inputSchema: weatherInput,
  execute: async ({ city }) => {
    const location = await geocodeCity(city);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia/Kolkata`;
    const res = await fetch(url);
    const data = await res.json();

    const current = data.current;

    return {
      success: true,
      location: `${location.name}, ${location.country}`,
      temperature: `${current.temperature_2m}°C`,
      feelsLike: `${current.apparent_temperature}°C`,
      humidity: `${current.relative_humidity_2m}%`,
      windSpeed: `${current.wind_speed_10m} km/h`,
      condition: describeWeatherCode(current.weather_code),
      weatherCode: current.weather_code,
    };
  },
});

const forecastInput = z.object({
  city: z.string().describe('City name to get the forecast for'),
  days: z.number().default(7).describe('Number of days to forecast (1-7, default: 7)'),
});

export const getWeatherForecastTool = createTool({
  id: 'getWeatherForecast',
  description: 'Gets a multi-day weather forecast for a city — daily high/low temperatures, precipitation, and conditions. Use this to help plan trips by identifying good and bad weather days.',
  inputSchema: forecastInput,
  execute: async ({ city, days }) => {
    const location = await geocodeCity(city);
    const forecastDays = Math.min(Math.max(days, 1), 7);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=Asia/Kolkata&forecast_days=${forecastDays}`;
    const res = await fetch(url);
    const data = await res.json();

    const daily = data.daily;
    const forecast = daily.time.map((date: string, i: number) => ({
      date,
      condition: describeWeatherCode(daily.weather_code[i]),
      highTemp: `${daily.temperature_2m_max[i]}°C`,
      lowTemp: `${daily.temperature_2m_min[i]}°C`,
      precipitation: `${daily.precipitation_sum[i]} mm`,
      rainChance: `${daily.precipitation_probability_max[i]}%`,
      maxWind: `${daily.wind_speed_10m_max[i]} km/h`,
    }));

    return {
      success: true,
      location: `${location.name}, ${location.country}`,
      forecastDays: forecastDays,
      forecast,
    };
  },
});
