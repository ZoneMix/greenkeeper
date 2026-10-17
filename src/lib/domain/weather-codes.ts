// WMO weather interpretation codes (as used by Open-Meteo) → words and an icon group.

export type WeatherGroup = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

const CODES: Readonly<Record<number, { readonly text: string; readonly group: WeatherGroup }>> = {
  0: { text: 'Clear', group: 'clear' },
  1: { text: 'Mostly clear', group: 'partly' },
  2: { text: 'Partly cloudy', group: 'partly' },
  3: { text: 'Overcast', group: 'cloudy' },
  45: { text: 'Fog', group: 'fog' },
  48: { text: 'Freezing fog', group: 'fog' },
  51: { text: 'Light drizzle', group: 'drizzle' },
  53: { text: 'Drizzle', group: 'drizzle' },
  55: { text: 'Heavy drizzle', group: 'drizzle' },
  56: { text: 'Freezing drizzle', group: 'drizzle' },
  57: { text: 'Freezing drizzle', group: 'drizzle' },
  61: { text: 'Light rain', group: 'rain' },
  63: { text: 'Rain', group: 'rain' },
  65: { text: 'Heavy rain', group: 'rain' },
  66: { text: 'Freezing rain', group: 'rain' },
  67: { text: 'Freezing rain', group: 'rain' },
  71: { text: 'Light snow', group: 'snow' },
  73: { text: 'Snow', group: 'snow' },
  75: { text: 'Heavy snow', group: 'snow' },
  77: { text: 'Snow grains', group: 'snow' },
  80: { text: 'Light showers', group: 'rain' },
  81: { text: 'Showers', group: 'rain' },
  82: { text: 'Heavy showers', group: 'rain' },
  85: { text: 'Snow showers', group: 'snow' },
  86: { text: 'Heavy snow showers', group: 'snow' },
  95: { text: 'Thunderstorms', group: 'storm' },
  96: { text: 'Thunderstorms with hail', group: 'storm' },
  99: { text: 'Thunderstorms with hail', group: 'storm' },
};

export function describeWeatherCode(code: number): string {
  return CODES[code]?.text ?? 'Unknown';
}

export function weatherGroup(code: number): WeatherGroup {
  return CODES[code]?.group ?? 'cloudy';
}
