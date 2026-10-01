// Same readiness rule as Playwright's webServer url check
const READY_STATUS_MIN = 200;
const READY_STATUS_MAX = 403;

export interface ProbeResult {
  ready: boolean;
  /** "HTTP <status>", or the network error code when nothing answered. */
  detail: string;
}

export const probeUrl = async (url: string, timeoutMs: number): Promise<ProbeResult> => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const ready = response.status >= READY_STATUS_MIN && response.status <= READY_STATUS_MAX;
    return { detail: `HTTP ${response.status}`, ready };
  } catch (error) {
    // Network errors expose their code through the cause; timeouts may use the message
    const failure = error as { code?: string; cause?: { code?: string }; message: string };
    return { detail: failure.code ?? failure.cause?.code ?? failure.message, ready: false };
  }
};
