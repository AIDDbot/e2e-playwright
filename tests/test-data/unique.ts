import { randomUUID } from "node:crypto";

/** Generates a fresh email for tests that share the run's database. */
export const uniqueEmail = (label: string): string => `${label}-${randomUUID()}@example.com`;
