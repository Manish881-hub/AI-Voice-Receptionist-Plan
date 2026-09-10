import { ServerOptions, cli, defineAgent, inference, voice } from '@livekit/agents';
import { audioEnhancement } from '@livekit/plugins-ai-coustics';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { Agent } from './agent.ts';

// Load environment variables from a local file.
// Make sure to set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET
// when running locally or self-hosting your agent server.
dotenv.config({ path: '.env.local' });

// Graceful-drain logging: the SDK stops accepting new jobs on SIGTERM and
// finishes active sessions before exit. We only log intent here (once per
// process, not per job) so deploys during live calls stay explainable.
let drainHandlersInstalled = false;
function installDrainLogging(): void {
  if (drainHandlersInstalled) return;
  drainHandlersInstalled = true;
  for (const sig of ['SIGTERM', 'SIGINT'] as const) {
    process.on(sig, () => {
      console.log(`[worker] ${sig} received — draining: no new jobs, active calls continue`);
    });
  }
}

export default defineAgent({
  entry: async (ctx) => {
    installDrainLogging();

    // Call correlation: one id links SIP Call-ID -> room -> agent job.
    // For phone calls the dispatch rule names the room per call (e.g.
    // `tattvam-<caller>`), so room name IS the correlation id.
    // Room name isn't populated until the room connection completes, so keep
    // it mutable and refresh after connect. Listeners read it lazily, so all
    // lines after connect carry the real room name (the call-correlation id).
    let callId: string = ctx.room.name || 'pending-room';
    const startedAt = Date.now();
    console.log(`[call ${callId}] job started`);
    let lastFinalTranscriptAt = 0;
    // Set up a voice AI pipeline using OpenAI, Cartesia, Deepgram, and the LiveKit turn detector
    const session = new voice.AgentSession({
      // Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
      // See all available models at https://docs.livekit.io/agents/models/stt/
      stt: new inference.STT({
        model: 'deepgram/nova-3',
        // Pinned to Indian English: 'multi' let auto-detect flip short
        // utterances to Spanish (observed lang=es ghosts like "Tu no
        // verificas"). 'en-IN' matches our actual callers.
        language: 'en-IN',
      }),

      // Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
      // See all available models as well as voice selections at https://docs.livekit.io/agents/models/tts/
      tts: new inference.TTS({
        model: 'cartesia/sonic-3',
        voice: '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc',
      }),

      // Turn detection determines when the user is speaking and when the agent should respond.
      // The LiveKit audio turn detector is a multimodal model that encodes the user's audio
      // directly to predict end of turn. It's built into the SDK (no extra plugin) and
      // AgentSession supplies the required VAD automatically.
      // See more at https://docs.livekit.io/agents/logic/turns/turn-detector/
      turnHandling: {
        turnDetection: new inference.TurnDetector(),
        // Allow the LLM to generate a response while waiting for the end of turn
        preemptiveGeneration: { enabled: true },
        // Wait a beat longer before closing a turn: 300ms was splitting
        // pausing speakers into fragments ("The guest will be around" +
        // "two of guests."). 600ms costs a little responsiveness.
        endpointing: { minDelay: 600 },
      },
    });

    // Start the session, which initializes the voice pipeline and warms up the models
    // --- Observability: per-component latency + turn/interruption behaviour ---
    // Every line carries the room-name call id so SIP, server and agent logs join.
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev) => {
      if (ev.isFinal) {
        lastFinalTranscriptAt = Date.now();
        console.log(
          `[call ${callId}] stt_final transcript="${ev.transcript.slice(0, 120)}" lang=${ev.language ?? 'n/a'}`,
        );
      }
    });
    session.on(voice.AgentSessionEventTypes.AgentStateChanged, (ev) => {
      // thinking -> speaking approximates end-of-utterance to first-audio.
      if (ev.oldState === 'thinking' && ev.newState === 'speaking' && lastFinalTranscriptAt) {
        console.log(
          `[call ${callId}] ttfa_approx_ms=${Date.now() - lastFinalTranscriptAt} (final transcript -> agent speaking)`,
        );
      }
    });
    session.on(voice.AgentSessionEventTypes.MetricsCollected, (ev) => {
      const m = ev.metrics as { type: string } & Record<string, unknown>;
      if (m.type === 'llm_metrics') {
        console.log(
          `[call ${callId}] llm ttft_ms=${m.ttftMs} duration_ms=${m.durationMs} tokens=${m.totalTokens} cancelled=${m.cancelled}`,
        );
      } else if (m.type === 'tts_metrics') {
        console.log(
          `[call ${callId}] tts ttfb_ms=${m.ttfbMs} duration_ms=${m.durationMs} chars=${m.charactersCount} cancelled=${m.cancelled}`,
        );
      } else if (m.type === 'stt_metrics') {
        console.log(`[call ${callId}] stt duration_ms=${m.durationMs} audio_ms=${m.audioDurationMs}`);
      } else if (m.type === 'eou_metrics') {
        console.log(
          `[call ${callId}] eou delay_ms=${m.endOfUtteranceDelayMs} transcription_delay_ms=${m.transcriptionDelayMs}`,
        );
      }
    });
    session.on(voice.AgentSessionEventTypes.FunctionToolsExecuted, (ev) => {
      const names = ev.functionCalls.map((c) => c.name).join(',');
      console.log(`[call ${callId}] tools executed=${ev.functionCalls.length} names=${names}`);
    });
    session.on(voice.AgentSessionEventTypes.OverlappingSpeech, () => {
      console.log(`[call ${callId}] interruption: user barged in during agent speech`);
    });
    session.on(voice.AgentSessionEventTypes.AgentFalseInterruption, () => {
      console.log(`[call ${callId}] false interruption (noise/backchannel, ignored)`);
    });
    session.on(voice.AgentSessionEventTypes.EotPrediction, (ev) => {
      console.log(`[call ${callId}] eot_prediction p=${ev.probability.toFixed(2)}`);
    });
    session.on(voice.AgentSessionEventTypes.Error, (ev) => {
      console.error(`[call ${callId}] session error:`, ev.error);
    });
    session.on(voice.AgentSessionEventTypes.Close, (ev) => {
      console.log(
        `[call ${callId}] closed reason=${ev.reason} after_s=${((Date.now() - startedAt) / 1000).toFixed(1)}`,
      );
    });

    await session.start({
      agent: new Agent(),
      room: ctx.room,
      inputOptions: {
        // ai-coustics QUAIL audio enhancement for noise cancellation
        // Works for both WebRTC and telephony (SIP) participants
        noiseCancellation: audioEnhancement({ model: 'quailVfS' }),
      },
    });

    // // Add a virtual avatar to the session, if desired
    // // For other providers, see https://docs.livekit.io/agents/models/avatar/
    // const avatar = new anam.AvatarSession({
    //   personaConfig: {
    //     name: '...',
    //     avatarId: '...', // See https://docs.livekit.io/agents/models/avatar/plugins/anam
    //   },
    // });
    // // Start the avatar and wait for it to join
    // await avatar.start(session, ctx.room);

    // Join the room and connect to the user
    await ctx.connect();
    callId = ctx.room.name || callId;
    console.log(`[call ${callId}] room connected`);

    // Greet the user on joining
    session.generateReply({
      instructions: 'Greet the user in a helpful and friendly manner.',
    });
  },
});

// Run the agent server
cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: 'my-agent',
    // Keep one warm idle job process so the first call doesn't pay fork +
    // module-load cost inside the init window (matters on slow disks).
    numIdleProcesses: 1,
    // Job processes must import the agent module and warm inference runners
    // before answering. 60s tolerates cold starts; steady-state init is ~1s.
    initializeProcessTimeout: 60_000,
  }),
);
