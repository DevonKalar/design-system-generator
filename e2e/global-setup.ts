import { execFileSync } from 'node:child_process';
import { E2E_ENV } from './env.js';

/** Brings the dedicated e2e database up to date before any server starts. */
export default function globalSetup(): void {
  execFileSync('pnpm', ['--filter', '@dsg/api', 'db:migrate'], {
    env: { ...process.env, ...E2E_ENV },
    stdio: 'inherit',
  });
}
