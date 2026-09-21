// Manual voice-QA script (NOT a vitest). Burns Sarvam credits — run explicitly:
//   node src/scripts/test-sarvam.ts
// Output: sarvam-test-hi.wav, sarvam-test-hinglish.wav, sarvam-test-en.wav
// Play: ffplay sarvam-test-hi.wav  (or any audio player)
// Decide: if Bulbul is NOT clearly better than Cartesia for Hindi/Hinglish,
// do NOT wire it into LiveKit. Keep Cartesia as fallback.
import dotenv from 'dotenv';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { synthesizeWithSarvam } from '../services/sarvam.service.ts';

dotenv.config({ path: '.env.local' });

const CASES = [
  {
    file: 'sarvam-test-hi.wav',
    text: 'नमस्ते, Tattvam in The Hills Retreat and Spa में आपका स्वागत है। मैं आपकी कैसे सहायता कर सकती हूँ?',
    targetLanguageCode: 'hi-IN',
  },
  {
    file: 'sarvam-test-hinglish.wav',
    text: 'Namaste, Tattvam mein aapka swagat hai. Main aapki kaise madad kar sakti hoon?',
    targetLanguageCode: 'hi-IN',
  },
  {
    file: 'sarvam-test-en.wav',
    text: 'Welcome to Tattvam in The Hills Retreat and Spa. How may I assist you today?',
    targetLanguageCode: 'en-IN',
  },
] as const;

for (const c of CASES) {
  const audio = await synthesizeWithSarvam({
    text: c.text,
    targetLanguageCode: c.targetLanguageCode,
    speaker: 'shubh',
    model: 'bulbul:v3',
  });
  const out = join(process.cwd(), c.file);
  await writeFile(out, audio);
  console.log(`Saved ${c.file} (${audio.length} bytes)`);
}
