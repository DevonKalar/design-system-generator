import { z } from 'zod';
import './load-env.js';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z.url(),
  DATABASE_URL: z.string().min(1),
  // Short secrets make HS256 brute-forceable, so this is a hard floor rather than advice.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.url(),
  AUTH_TEST_LOGIN_ENABLED: z.stringbool().default(false),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  // POST /api/auth/test-login mints a session with no credential check. Reaching production
  // with it enabled would be a total auth bypass, so refuse to start rather than warn.
  if (parsed.data.AUTH_TEST_LOGIN_ENABLED && parsed.data.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_TEST_LOGIN_ENABLED must not be true when NODE_ENV=production — it bypasses authentication entirely.',
    );
  }

  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
