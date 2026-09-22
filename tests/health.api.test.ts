import { type APIRequestContext, expect, test } from "@playwright/test";

const BACK_URL = process.env["E2E_BACK_URL"];
const HEALTH_PATH = "/api/health";

interface HealthStatus {
  runs: number;
  uptime: number;
}

const getHealth = async (request: APIRequestContext): Promise<HealthStatus> => {
  const response = await request.get(`${BACK_URL}${HEALTH_PATH}`);
  expect(response.ok()).toBe(true);
  return (await response.json()) as HealthStatus;
};

test.describe("Health API", () => {
  test("AC-HLT-01 responds 200 with numeric uptime and runs as JSON", async ({ request }) => {
    const response = await request.get(`${BACK_URL}${HEALTH_PATH}`);

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
    const body = (await response.json()) as HealthStatus;
    expect(body.uptime).toEqual(expect.any(Number));
    expect(body.uptime).toBeGreaterThan(0);
    // Runs accumulate in the shared database: assert presence, never an exact count
    expect(body.runs).toEqual(expect.any(Number));
    expect(body.runs).toBeGreaterThan(0);
  });

  test("AC-HLT-02 reports a strictly increasing uptime", async ({ request }) => {
    const { uptime: first } = await getHealth(request);

    await expect.poll(async () => (await getHealth(request)).uptime).toBeGreaterThan(first);
  });

  test("AC-HLT-03 allows cross-origin requests from the web client", async ({
    baseURL,
    request,
  }) => {
    const origin = new URL(baseURL ?? "").origin;

    const response = await request.get(`${BACK_URL}${HEALTH_PATH}`, { headers: { origin } });

    expect([origin, "*"]).toContain(response.headers()["access-control-allow-origin"]);
  });
});
