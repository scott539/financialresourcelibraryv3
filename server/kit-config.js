// Server-only setup controls. No email address or credential is bundled into Vite.
export const KIT_TEST_BRANCH = 'codex/library-gate';

export function kitTestConfig(env = process.env) {
  const isolatedPreview = env.VERCEL_ENV === 'preview' &&
    env.VERCEL_GIT_COMMIT_REF === KIT_TEST_BRANCH;
  const testEmail = (env.KIT_TEST_EMAIL || '').trim().toLowerCase();
  const validEmail = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(testEmail);
  return {
    isolatedPreview,
    runSetupCheck: isolatedPreview && env.KIT_SETUP_CHECK === '1',
    testEmail: validEmail ? testEmail : null,
    // This setup commit has no public gate and permits no Kit writes.
    allowWrites: false,
    publicGateEnabled: false,
  };
}

export function isAllowedTestEmail(candidate, env = process.env) {
  const config = kitTestConfig(env);
  return config.isolatedPreview && !!config.testEmail &&
    typeof candidate === 'string' && candidate.trim().toLowerCase() === config.testEmail;
}
