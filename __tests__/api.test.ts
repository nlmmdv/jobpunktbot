import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callFunction, callFunctionSafe, ApiError } from '../src/lib/api';
import { ERROR_MESSAGES } from '../src/constants';

function mockResponse(status: number, body: unknown, ok = status >= 200 && status < 300) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe('api / callFunction', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns parsed data on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(200, { profile: { id: '1' } }));
    const data = await callFunction('tg-auth', {}, { retries: 0 });
    expect(data).toEqual({ profile: { id: '1' } });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('maps 404 to a friendly NOT_FOUND message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(404, { error: 'nope' }));
    const res = await callFunctionSafe('x', {}, { retries: 0 });
    expect(res.error).toBe(ERROR_MESSAGES.NOT_FOUND);
    expect(res.data).toBeUndefined();
  });

  it('maps 401/403 to a friendly AUTH_ERROR message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(403, { error: 'denied' }));
    const res = await callFunctionSafe('x', {}, { retries: 0 });
    expect(res.error).toBe(ERROR_MESSAGES.AUTH_ERROR);
  });

  it('does NOT retry a non-retriable 404', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(404, { error: 'nope' }));
    await callFunctionSafe('x', {}, { retries: 3 });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries a 500 then rejects with ApiError', async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(500, { error: 'boom' }));

    const p = callFunction('x', {}, { retries: 1, timeout: 30000 });
    p.catch(() => {}); // не оставляем unhandled rejection
    await vi.advanceTimersByTimeAsync(2000); // проматываем задержку ретрая

    await expect(p).rejects.toBeInstanceOf(ApiError);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2); // первичный + 1 ретрай
  });
});
