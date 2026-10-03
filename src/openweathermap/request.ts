const REQUEST_TIMEOUT_MS = 10_000;

export async function fetchOpenWeatherMap<T>(
  url: URL,
  endpoint: string,
): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `${endpoint} failed with ${response.status}: ${await response.text()}`,
    );
  }

  return response.json<T>();
}
