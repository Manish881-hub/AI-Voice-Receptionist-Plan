# AI Voice Receptionist — Tattvam in The Hills Retreat & Spa

An intelligent AI-powered voice receptionist for **Tattvam in The Hills Retreat & Spa**, a premium Ayurvedic wellness resort near Bangalore. Built with [LiveKit Agents](https://livekit.io/agents) (Node.js).

## Demo

<video src="media/ai-receptionist.mp4" controls width="100%" poster="media/ai-receptionist-poster.jpg"></video>

> [Download the demo video](media/ai-receptionist.mp4)

## Features

- **Natural voice conversations** — powered by OpenAI GPT, Cartesia TTS, and Deepgram STT
- **Package information tool** — callers can ask about Day Outing, Stay, Ayurveda, or Celebration packages
- **Turn detection** — LiveKit's multimodal turn detector for natural conversational flow
- **Noise cancellation** — ai-coustics QUAIL audio enhancement
- **Production-ready** — Dockerfile included for LiveKit Cloud deployment

## Tech Stack

| Component    | Provider                         |
| ------------ | -------------------------------- |
| LLM          | OpenAI GPT-5.2 (via LiveKit Inference) |
| Speech→Text  | Deepgram Nova-3                  |
| Text→Speech  | Cartesia Sonic-3                 |
| Turn Detection | LiveKit Turn Detector          |
| Audio Enhancement | ai-coustics QUAIL            |
| Agent SDK    | LiveKit Agents (Node.js)         |

## Quick Start

```bash
pnpm install
cp .env.example .env.local  # fill in your LiveKit credentials
pnpm run dev
```

## Project Structure

```
my-agent/
├── src/
│   ├── agent.ts       # Custom agent with Tattvam instructions & tools
│   ├── agent.test.ts  # Agent tests
│   └── main.ts        # Entrypoint — voice pipeline setup
├── package.json
├── Dockerfile
└── .env.example
src/
└── agent.ts           # Standalone agent instructions
media/
└── ai-receptionist.mp4 # Demo video
```

## Deployment

See the [LiveKit deployment guide](https://docs.livekit.io/deploy/agents/).

## License

MIT
