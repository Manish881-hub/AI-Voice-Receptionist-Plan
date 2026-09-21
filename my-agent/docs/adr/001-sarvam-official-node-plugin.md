# ADR 001: Use the Official Sarvam Node Plugin for Realtime Voice

- Date: 2026-09-21
- Status: Accepted

## Context

The Tattvam AI receptionist currently uses:

- LiveKit Agents
- Deepgram Nova-3 for speech-to-text
- OpenAI GPT-5.2 for reasoning
- Cartesia Sonic-3 for text-to-speech

We want better Hindi and Hinglish support without replacing LiveKit or damaging realtime behavior such as interruption, turn detection, and streaming audio.

## Decision

Use the official Sarvam LiveKit Node plugin for realtime speech:

- `sarvam.STT`
- `sarvam.TTS`

Use Sarvam REST only for offline voice-quality evaluation and testing.

The existing Deepgram and Cartesia providers will remain available as fallback providers during evaluation.

## Alternatives Considered

### Raw REST inside AgentSession

Rejected because it introduces:

- Base64 audio conversion
- Additional latency
- No native streaming integration
- Poorer barge-in behavior

### Custom STT/TTS adapters

Rejected because the official Sarvam Node plugin already provides the required LiveKit integration.

### Replacing LiveKit

Rejected because LiveKit already provides the required realtime transport, turn handling, interruption, and agent orchestration.

## Consequences

### Benefits

- Native LiveKit integration
- Streaming STT and TTS
- Preserved turn detection and interruption behavior
- Better support for Hindi and Indian language workflows
- Easier provider switching

### Costs

- Additional dependency
- Sarvam API usage costs
- Need for voice-quality and latency evaluation
- Need to validate Hindi, Hinglish, and English behavior

## Rollout

1. Install the official Sarvam Node plugin.
2. Add Sarvam as an optional provider.
3. Test Sarvam TTS independently inside LiveKit.
4. Test Sarvam STT with Hindi and Hinglish.
5. Add language routing.
6. Compare latency and recognition quality against Deepgram and Cartesia.
7. Keep fallback providers until evaluation is complete.
