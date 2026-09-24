/** Generates a fresh email for tests that share the run's database. */
export const uniqueEmail = (label: string): string =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
