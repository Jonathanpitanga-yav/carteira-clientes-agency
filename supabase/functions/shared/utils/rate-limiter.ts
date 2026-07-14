interface RateLimitConfig {
  maxRequestsPerSecond: number;
  maxRequestsPerMinute?: number;
  tokenEndpointMaxPerMinute?: number;
}

const CONFIGS: Record<string, RateLimitConfig> = {
  bling: { maxRequestsPerSecond: 2, tokenEndpointMaxPerMinute: 15 },
  tiny: { maxRequestsPerSecond: 1, maxRequestsPerMinute: 50 },
};

const requestTimestamps: Record<string, number[]> = {};
const tokenRequestTimestamps: Record<string, number[]> = {};

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function cleanOldTimestamps(timestamps: number[], windowMs: number): number[] {
  const now = Date.now();
  return timestamps.filter((t) => now - t < windowMs);
}

async function enforceRateLimit(
  timestamps: number[],
  maxRequests: number,
  windowMs: number
): Promise<number[]> {
  const recent = cleanOldTimestamps(timestamps, windowMs);
  if (recent.length >= maxRequests) {
    const oldest = recent[0];
    const waitTime = windowMs - (Date.now() - oldest) + 50;
    if (waitTime > 0) {
      await wait(waitTime);
    }
  }
  const now = Date.now();
  recent.push(now);
  return recent;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function throttledFetch(
  url: string,
  options: RequestInit,
  provider: string,
  isTokenEndpoint = false
): Promise<Response> {
  const config = CONFIGS[provider.toLowerCase()] || { maxRequestsPerSecond: 1 };

  if (isTokenEndpoint && config.tokenEndpointMaxPerMinute) {
    tokenRequestTimestamps[provider] = await enforceRateLimit(
      tokenRequestTimestamps[provider] || [],
      config.tokenEndpointMaxPerMinute,
      60000
    );
  }

  requestTimestamps[provider] = await enforceRateLimit(
    requestTimestamps[provider] || [],
    config.maxRequestsPerSecond,
    1000
  );

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(1000 * Math.pow(2, attempt), 10000);
        await wait(delay);
        continue;
      }

      return response;
    } catch (err: any) {
      lastError = err;
      if (attempt < 3) {
        await wait(1000 * attempt);
      }
    }
  }

  throw lastError || new Error(`Requisição falhou após 3 tentativas: ${url}`);
}
