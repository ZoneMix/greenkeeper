import { weekdayShort } from '@/lib/domain/dates';
import type { WeatherDay, WeatherReport } from '@/lib/domain/types';
import { weatherGroup, type WeatherGroup } from '@/lib/domain/weather-codes';
import { Icon, type IconName } from '../ui/Icon';
import { Notice } from '../ui/Notice';

const GROUP_ICON: Readonly<Record<WeatherGroup, IconName>> = {
  clear: 'sun',
  partly: 'cloud',
  cloudy: 'cloud',
  fog: 'fog',
  drizzle: 'rain',
  rain: 'rain',
  snow: 'snow',
  storm: 'storm',
};

const fmtIn = (value: number): string => `${value.toFixed(2)} in`;

function ForecastDay({ day, today }: { readonly day: WeatherDay; readonly today: string }) {
  const isToday = day.date === today;
  return (
    <li aria-current={isToday ? 'date' : undefined}>
      <span className="meta">{isToday ? 'Today' : weekdayShort(day.date)}</span>
      <Icon name={GROUP_ICON[weatherGroup(day.weather_code)]} label={day.condition} />
      <span>
        <span className="hi">{Math.round(day.high_f)}°</span> <span className="muted">{Math.round(day.low_f)}°</span>
      </span>
      <span className="meta">
        <span className="sr-only">rain </span>
        {day.precip_in > 0 ? fmtIn(day.precip_in) : 'Dry'}
      </span>
    </li>
  );
}

export function WeatherPanel({ report, today }: { readonly report: WeatherReport; readonly today: string }) {
  const todayForecast = report.days.find((d) => d.date === today);
  const fetched = new Date(report.fetched_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return (
    <div className="stack">
      <div className="weather-now">
        <Icon name={GROUP_ICON[weatherGroup(report.current.weather_code)]} size="lg" />
        <span className="temp">{Math.round(report.current.temperature_f)}°F</span>
        <div>
          <div>{report.current.condition}</div>
          <div className="meta">
            Wind {Math.round(report.current.wind_mph)} mph
            {todayForecast?.soil_temp_f != null ? ` · Soil ${Math.round(todayForecast.soil_temp_f)}°F` : ''}
          </div>
        </div>
      </div>
      <ul className="forecast" aria-label="Seven-day forecast">
        {report.days.map((day) => (
          <ForecastDay key={day.date} day={day} today={today} />
        ))}
      </ul>
      {report.stale ? (
        <Notice tone="attention" icon="clock">
          <p>Showing saved weather from {fetched}; the forecast service is not answering right now.</p>
        </Notice>
      ) : (
        <p className="meta">From Open-Meteo, updated {fetched}</p>
      )}
    </div>
  );
}
