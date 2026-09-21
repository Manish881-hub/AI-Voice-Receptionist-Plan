// Offline unit tests for sarvam.service — no Sarvam credentials or network needed.
// fetch is stubbed per-test. Run: pnpm exec vitest run src/services/sarvam.service.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSarvamApiKey, synthesizeWithSarvam } from './sarvam.service.ts';

const ORIGINAL_KEY = process.env.SARVAM_API_KEY;
const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.SARVAM_API_KEY;
  } else {
    process.env.SARVAM_API_KEY = ORIGINAL_KEY;
  }
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

function mockFetchJson(ok: boolean, json: unknown, status = 200): void {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify(json), {
      status: ok ? 200 : status,
      headers: { 'Content-Type': 'application/json' },
    }),
  ) as unknown as typeof fetch;
}

describe('sarvam.service seam', () => {
  it('throws a clear error when the API key is missing', async () => {
    delete process.env.SARVAM_API_KEY;
    await expect(synthesizeWithSarvam({ text: 'नमस्ते', apiKey: '' })).rejects.toThrow(
      /SARVAM_API_KEY/,
    );
  });

  it('getSarvamApiKey prefers the explicit override', () => {
    expect(getSarvamApiKey(' sk_test ')).toBe('sk_test');
  });

  it('rejects empty text before any network call', async () => {
    const spy = vi.fn(async () => new Response('{}'));
    globalThis.fetch = spy as unknown as typeof fetch;
    await expect(synthesizeWithSarvam({ text: '   ', apiKey: 'sk_test' })).rejects.toThrow(
      /must not be empty/,
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it('surfaces Sarvam HTTP errors with status + body', async () => {
    mockFetchJson(false, { error: 'bad speaker' }, 400);
    await expect(
      synthesizeWithSarvam({ text: 'hello', apiKey: 'sk_test', speaker: 'nope' }),
    ).rejects.toThrow(/Sarvam TTS failed: 400/);
  });

  it('throws when audios array is empty', async () => {
    mockFetchJson(true, { audios: [] });
    await expect(synthesizeWithSarvam({ text: 'hello', apiKey: 'sk_test' })).rejects.toThrow(
      /no audio/,
    );
  });

  it('decodes base64 audio to a Buffer', async () => {
    // "aGk=" is base64 for "hi"
    mockFetchJson(true, { audios: ['aGk='] });
    const buf = await synthesizeWithSarvam({ text: 'hi', apiKey: 'sk_test' });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString('utf8')).toBe('hi');
  });
});
