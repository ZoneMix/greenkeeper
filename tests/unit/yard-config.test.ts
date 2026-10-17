import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import exampleConfig from '../../config/greenkeeper.example.json';
import { findYardConfig, resolveYardConfig, YARD_CONFIG_ENV } from '../../config/resolve-yard-config.mjs';
import { APP_TIMEZONE, DEFAULT_LOCATION, LOCATION_LABEL, SEASON, USDA_ZONE } from '@/lib/domain/constants';
import { parseYardConfig, YARD } from '@/lib/domain/yard-config';
import { tempDir } from '../helpers/legacy-db';

const PERSONAL = path.join('personal', 'greenkeeper.config.json');
const LOCAL = path.join('config', 'greenkeeper.config.json');
const EXAMPLE = path.join('config', 'greenkeeper.example.json');

function projectWith(files: ReadonlyArray<string>): string {
  const root = tempDir();
  for (const file of files) {
    fs.mkdirSync(path.join(root, path.dirname(file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), JSON.stringify({ file }));
  }
  return root;
}

describe('resolveYardConfig', () => {
  it('prefers personal, then config, then the example', () => {
    const all = projectWith([PERSONAL, LOCAL, EXAMPLE]);
    expect(findYardConfig({ root: all, env: {} })).toBe(path.join(all, PERSONAL));
    const noPersonal = projectWith([LOCAL, EXAMPLE]);
    expect(findYardConfig({ root: noPersonal, env: {} })).toBe(path.join(noPersonal, LOCAL));
    const exampleOnly = projectWith([EXAMPLE]);
    expect(findYardConfig({ root: exampleOnly, env: {} })).toBe(path.join(exampleOnly, EXAMPLE));
  });

  it(`lets $${YARD_CONFIG_ENV} win, and fails loudly when it points nowhere`, () => {
    const root = projectWith([PERSONAL, EXAMPLE]);
    const custom = path.join(projectWith(['yard.json']), 'yard.json');
    expect(findYardConfig({ root, env: { [YARD_CONFIG_ENV]: custom } })).toBe(custom);
    expect(() => findYardConfig({ root, env: { [YARD_CONFIG_ENV]: path.join(root, 'missing.json') } })).toThrow(
      /does not exist/,
    );
  });

  it('stages a config from outside the project root inside it, so bundlers can resolve it', () => {
    const root = projectWith([EXAMPLE]);
    const outside = path.join(projectWith(['yard.json']), 'yard.json');
    const staged = resolveYardConfig({ root, env: { [YARD_CONFIG_ENV]: outside } });
    expect(path.relative(root, staged).startsWith('..')).toBe(false);
    expect(fs.readFileSync(staged, 'utf8')).toBe(fs.readFileSync(outside, 'utf8'));
    expect(resolveYardConfig({ root, env: {} })).toBe(path.join(root, EXAMPLE));
  });

  it('rejects a file that is not JSON, naming the file', () => {
    const root = projectWith([]);
    fs.mkdirSync(path.join(root, 'config'));
    fs.writeFileSync(path.join(root, EXAMPLE), '{ nope');
    expect(() => resolveYardConfig({ root, env: {} })).toThrow(/greenkeeper\.example\.json is not valid JSON/);
  });
});

describe('yard config schema', () => {
  it('accepts the committed example', () => {
    expect(() => parseYardConfig(exampleConfig)).not.toThrow();
  });

  it('explains what is wrong with an invalid config', () => {
    const bad = {
      ...exampleConfig,
      location: { ...exampleConfig.location, timezone: 'Mars/Olympus_Mons' },
      season: { startMonth: 11, startDay: 10, endMonth: 4, endDay: 1 },
    };
    expect(() => parseYardConfig(bad)).toThrow(/Invalid Greenkeeper yard config[\s\S]*IANA time zone[\s\S]*end after it starts/);
    expect(() => parseYardConfig({ ...exampleConfig, typo: true })).toThrow(/typo/);
    expect(() => parseYardConfig({ ...exampleConfig, season: { ...exampleConfig.season, endMonth: 2, endDay: 30 } })).toThrow(
      /not a real date/,
    );
  });

  it('feeds the app constants and is frozen', () => {
    expect(SEASON).toEqual(YARD.season);
    expect(APP_TIMEZONE).toBe(YARD.location.timezone);
    expect(USDA_ZONE).toBe(YARD.location.usda_zone);
    expect(DEFAULT_LOCATION).toMatchObject({ city: YARD.location.city, latitude: YARD.location.latitude });
    expect(LOCATION_LABEL).toBe(`${YARD.location.city}, ${YARD.location.state}`);
    expect(Object.isFrozen(YARD)).toBe(true);
    expect(Object.isFrozen(YARD.location)).toBe(true);
  });
});
