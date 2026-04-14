import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/tests/**/*.test.ts'],
    resolve: {
      alias: {
        '@zglm/shared': new URL('./packages/shared/src/index.ts', import.meta.url).pathname,
      },
    },
  },
});
