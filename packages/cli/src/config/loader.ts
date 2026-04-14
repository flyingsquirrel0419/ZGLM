import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ZGLMConfig } from '@zglm/shared';
import { DEFAULT_CONFIG } from './defaults.js';
import { ZGLMConfigSchema } from './schema.js';

const PROTOTYPE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function parseSimpleToml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = text.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const rawKey = line.slice(0, eqIndex).trim();
    const rawValue = line.slice(eqIndex + 1).trim();

    const parts = rawKey.split('.');
    if (parts.some((p) => PROTOTYPE_KEYS.has(p))) continue;

    let current: Record<string, unknown> = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    const lastPart = parts[parts.length - 1];
    current[lastPart] = parseValue(rawValue);
  }

  return result;
}

function parseValue(value: string): unknown {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((s) => parseValue(s.trim()));
  }
  return value;
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = result[key];
    if (
      typeof sourceVal === 'object' &&
      sourceVal !== null &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === 'object' &&
      targetVal !== null &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(targetVal as Record<string, unknown>, sourceVal as Record<string, unknown>);
    } else {
      result[key] = sourceVal;
    }
  }
  return result;
}

function envOverrides(): Record<string, unknown> {
  const overrides: Record<string, unknown> = {};

  const envMap: [string, string][] = [
    ['ZGLM_MODEL', 'model.default'],
    ['ZGLM_THEME', 'core.theme'],
    ['ZGLM_LANGUAGE', 'core.language'],
    ['ZGLM_DEBUG', 'core.debug'],
    ['ZGLM_TIMEOUT', 'agent.timeout'],
    ['ZGLM_MAX_TURNS', 'agent.maxTurns'],
    ['ZGLM_SANDBOX', 'agent.sandbox'],
    ['ZGLM_THINKING', 'model.thinking'],
    ['ZGLM_TEMPERATURE', 'model.temperature'],
    ['ZGLM_MAX_TOKENS', 'model.maxTokens'],
    ['ZGLM_WEB_SEARCH', 'webSearch.enabled'],
    ['ZGLM_EDITOR', 'core.editor'],
    ['ZGLM_CURRENCY', 'usage.currency'],
    ['ZGLM_BUDGET', 'usage.monthlyBudget'],
  ];

  for (const [envKey, configPath] of envMap) {
    const value = process.env[envKey];
    if (value === undefined) continue;

    const parts = configPath.split('.');
    let current: Record<string, unknown> = overrides;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] === undefined) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = parseValue(value);
  }

  return overrides;
}

async function loadTomlConfig(): Promise<Record<string, unknown>> {
  const configPath = resolve(process.cwd(), '.zglm.toml');
  try {
    const content = await readFile(configPath, 'utf-8');
    return parseSimpleToml(content);
  } catch {
    return {};
  }
}

export async function loadConfig(): Promise<ZGLMConfig> {
  const defaults = DEFAULT_CONFIG as unknown as Record<string, unknown>;

  const tomlConfig = await loadTomlConfig();
  const merged = deepMerge(defaults, tomlConfig);

  const envConfig = envOverrides();
  const finalConfig = deepMerge(merged, envConfig);

  return ZGLMConfigSchema.parse(finalConfig) as ZGLMConfig;
}
