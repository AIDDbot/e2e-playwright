import { type APIRequestContext } from "@playwright/test";
import { expect, test } from "../fixtures/index.js";
import { frontUrl } from "../support/run-context.js";

const HEALTH_PATH = "/api/health";

interface HealthStatus {
  runs: number;
  uptime: number;
}

const getHealth = async (request: APIRequestContext): Promise<HealthStatus> => {
  const response = await request.get(HEALTH_PATH);
  await expect(response).toBeOK();
  return (await response.json()) as HealthStatus;
};

test.describe("Health API", () => {
  test(
    "responds 200 with numeric uptime and runs as JSON",
    { tag: "@AC-HLT-01" },
    async ({ request }) => {
      const response = await request.get(HEALTH_PATH);

      await expect(response).toHaveStatus(200);
      expect(response.headers()["content-type"]).toContain("application/json");
      const body = (await response.json()) as HealthStatus;
      expect(body.uptime).toEqual(expect.any(Number));
      expect(body.uptime).toBeGreaterThan(0);
      // Runs accumulate in the shared database: assert presence, never an exact count
      expect(body.runs).toEqual(expect.any(Number));
      expect(body.runs).toBeGreaterThan(0);
    },
  );

  test("reports a strictly increasing uptime", { tag: "@AC-HLT-02" }, async ({ request }) => {
    const { uptime: first } = await getHealth(request);

    await expect.poll(async () => (await getHealth(request)).uptime).toBeGreaterThan(first);
  });

  test(
    "allows cross-origin requests from the web client",
    { tag: "@AC-HLT-03" },
    async ({ request }) => {
      const origin = new URL(frontUrl).origin;

      const response = await request.get(HEALTH_PATH, { headers: { origin } });

      expect([origin, "*"]).toContain(response.headers()["access-control-allow-origin"]);
    },
  );
});
