import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: ['better-sqlite3'],
});
