import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';

export default {
  targets: [
    {
      engine: web(),
      app: {
        url: process.env.APP_URL || 'http://localhost:3000',
        command: {
          executable: 'bun',
          args: ['run', 'dev'],
          reuseExisting: true,
        },
      },
    },
  ],
  tests: 'tests/**/*.e2e.ts',
} satisfies E2EConfig;
