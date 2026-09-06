import { inference, voice } from '@livekit/agents';
import { RECEPTIONIST_INSTRUCTIONS } from './prompts/receptionist.ts';
import {
  cancelReservation,
  checkRoomAvailability,
  createReservation,
  getPackageDetails,
  modifyReservation,
  requestHumanHandoff,
} from './tools/index.ts';

// Thin wiring only: prompt + tools. Business facts live in config/,
// reservation logic in services/, voice plumbing in main.ts.
export class Agent extends voice.Agent {
  constructor() {
    super({
      instructions: RECEPTIONIST_INSTRUCTIONS,

      // LLM model – switch to a cheaper/faster one like 'openai/gpt-4o-mini' if needed
      llm: new inference.LLM({ model: 'openai/gpt-5.2-chat-latest' }),

      tools: {
        getPackageDetails,
        checkRoomAvailability,
        createReservation,
        modifyReservation,
        cancelReservation,
        requestHumanHandoff,
      },
    });
  }
}
