const ENV_KEY = 'ZGLM_API_KEY';

export function getApiKey(): string | undefined {
  return process.env[ENV_KEY];
}

export function setApiKey(key: string): void {
  process.env[ENV_KEY] = key;
}

export function requireApiKey(): string {
  const key = getApiKey();
  if (!key) {
    throw new Error(
      'API key not found. Set ZGLM_API_KEY environment variable or run: zglm auth login',
    );
  }
  return key;
}
