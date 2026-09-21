// Standalone Sarvam Bulbul TTS service — OFFLINE VOICE QA ONLY.
//
// Purpose (per ADR direction): validate Hindi / Hinglish / Indian-English voice
// quality via Sarvam REST before wiring anything into the LiveKit realtime path.
// The realtime agent MUST use `@livekit/agents-plugin-sarvam` (streaming,
// turn-taking, barge-in). Do NOT call this REST service from inside AgentSession
// — REST base64 round-trips add latency and break interruption handling.
//
// Contract: POST https://api.sarvam.ai/text-to-speech
// Header: `api-subscription-key: <SARVAM_API_KEY>`
// Response: `{ audios: [base64Wav, ...] }` — decode before saving/playing.

const SARVAM_API_URL = 'https://api.sarvam.ai/text-to-speech';

// Bulbul v3 supports up to 2500 chars per REST request.
const MAX_CHARS_V3 = 2500;

export interface SarvamTTSOptions {
  text: string;
  /** e.g. 'hi-IN', 'en-IN'. Sarvam REST field: `target_language_code`. */
  targetLanguageCode?: string;
  /** e.g. 'shubh' (male), 'simran' / 'kavya' (female). */
  speaker?: string;
  model?: 'bulbul:v3' | 'bulbul:v2';
  /** 0.5 – 2.0 for v3. Start at 1.0, tune after listening. */
  pace?: number;
  /** 8000 | 16000 | 22050 | 24000 etc. Default 22050 for agent audio. */
  speechSampleRate?: number;
  outputAudioCodec?: 'wav' | 'mp3';
  /** Test seam: overrides process.env.SARVAM_API_KEY. */
  apiKey?: string;
}

interface SarvamTTSResponse {
  audios?: unknown;
  [key: string]: unknown;
}

export function getSarvamApiKey(override?: string): string {
  const key = (override ?? process.env.SARVAM_API_KEY ?? '').trim();
  if (!key) {
    throw new Error('SARVAM_API_KEY is not configured. Add it to .env.local (see .env.example).');
  }
  return key;
}

export async function synthesizeWithSarvam(options: SarvamTTSOptions): Promise<Buffer> {
  const {
    text,
    targetLanguageCode = 'hi-IN',
    speaker = 'shubh',
    model = 'bulbul:v3',
    pace = 1.0,
    speechSampleRate = 22050,
    outputAudioCodec = 'wav',
    apiKey,
  } = options;

  if (!text.trim()) {
    throw new Error('synthesizeWithSarvam: text must not be empty.');
  }
  if (model === 'bulbul:v3' && text.length > MAX_CHARS_V3) {
    throw new Error(`synthesizeWithSarvam: text is ${text.length} chars, v3 limit is ${MAX_CHARS_V3}.`);
  }

  const key = getSarvamApiKey(apiKey);

  const response = await fetch(SARVAM_API_URL, {
    method: 'POST',
    headers: {
      'api-subscription-key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      target_language_code: targetLanguageCode,
      speaker,
      model,
      pace,
      speech_sample_rate: speechSampleRate,
      output_audio_codec: outputAudioCodec,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sarvam TTS failed: ${response.status} ${errorText.slice(0, 500)}`);
  }

  const data = (await response.json()) as SarvamTTSResponse;
  const audios = Array.isArray(data.audios) ? data.audios : [];
  const first = audios[0];
  if (typeof first !== 'string' || first.length === 0) {
    throw new Error('Sarvam returned no audio (empty audios array).');
  }

  return Buffer.from(first, 'base64');
}
