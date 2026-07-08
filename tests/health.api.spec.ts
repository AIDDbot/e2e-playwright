import { expect, test } from "@playwright/test";

test.describe("Health API", () => {
  test("should return health status with uptime and runs count", async ({ request }) => {
    const response = await request.get("/api/health");

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("uptime");
    expect(data).toHaveProperty("runs");

    expect(typeof data.uptime).toBe("number");
    expect(typeof data.runs).toBe("number");
    expect(data.uptime).toBeGreaterThan(0);
    expect(data.runs).toBeGreaterThan(0);
  });

  test("should return content-type as application/json", async ({ request }) => {
    const response = await request.get("/api/health");

    expect(response.headers()["content-type"]).toContain("application/json");
  });

  test("uptime should increase on subsequent calls", async ({ request }) => {
    const response1 = await request.get("/api/health");
    const data1 = await response1.json();

    await new Promise((resolve) => setTimeout(resolve, 100));

    const response2 = await request.get("/api/health");
    const data2 = await response2.json();

    expect(data2.uptime).toBeGreaterThan(data1.uptime);
  });
});
