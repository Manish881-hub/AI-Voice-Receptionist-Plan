import { dedent, inference, voice, llm } from '@livekit/agents';
import { z } from 'zod'; // required for tool parameter validation

// Tool to retrieve package pricing and details
const getPackageDetails = llm.tool({
  description: dedent`
    Use this tool when the user asks about pricing, inclusions, or general information 
    about any of Tattvam's packages (Day Outing, Stay, Ayurveda, or Celebrations).
    Return the details in a clear, concise format that can be spoken aloud.
  `,
  parameters: z.object({
    packageType: z.enum(['day_out', 'stay', 'ayurveda', 'celebration']).describe(
      'The type of package the user is asking about: day_out, stay, ayurveda, or celebration'
    ),
  }),
  execute: async ({ packageType }) => {
    const packages = {
      day_out: {
        name: 'Day Outing Package',
        price: '₹1,499 per person',
        includes: 'Pool access, lunch, indoor/outdoor activities, and nature trails.',
      },
      stay: {
        name: 'Stay Package',
        price: '₹4,200 per night',
        includes: 'Luxury room, breakfast, pool access, and complimentary yoga session.',
      },
      ayurveda: {
        name: 'Ayurveda Wellness Package',
        price: '₹10,999 (for 3 nights)',
        includes: 'Full-board meals, daily Ayurvedic therapies, doctor consultation, and accommodation.',
      },
      celebration: {
        name: 'Celebration Packages',
        price: 'Custom quotes available',
        includes: 'Candle-night dinners, anniversary/birthday setups, family get-together arrangements.',
      },
    };

    const pkg = packages[packageType];
    if (!pkg) return 'I could not find that package. Please ask about day outing, stay, Ayurveda, or celebrations.';

    return `The ${pkg.name} starts at ${pkg.price} and includes ${pkg.includes}. Would you like me to help you with booking or more details?`;
  },
});

// Custom Voice Agent for Tattvam
export class Agent extends voice.Agent {
  constructor() {
    super({
      // ---------- CUSTOM INSTRUCTIONS FOR TATTVAM ----------
      instructions: dedent`
        You are the voice receptionist for "Tattvam in The Hills Retreat & Spa", a premium Ayurvedic wellness resort in the hills near Doddaballapur, just 40 minutes from Bangalore International Airport.

        ## Your Role
        - Warmly welcome guests, answer questions about the resort, recommend packages, and assist with booking guidance.
        - You represent a peaceful, nature-focused, and holistic healing destination.

        ## Resort Details (Memorize these)
        - **Location**: Sy. no 103/104/105, Gunjur Village, Tubegere Hobli, Doddaballapura Taluk, Bangalore Rural - 561 203.
        - **Property**: 4.5 acres of lush greenery with 20 guest rooms, an Authentic Ayurvedic Center, and a swimming pool.
        - **Cuisine**: 100% Pure Vegetarian. Serves Indian, Tandoor, Pan-Asian, and International dishes.
        - **Contact**: +91 80500 53808 (guide them to call for urgent or direct bookings).

        ## Packages (Always use the tool for exact pricing)
        - You have a tool called \`getPackageDetails\` – use it whenever a guest asks about costs or inclusions for Day Outing, Stay, Ayurveda, or Celebrations.
        - Do not guess prices; rely on the tool output.

        ## Conversation Flow
        - **Greeting**: Start with a calm, warm "Namaste! Welcome to Tattvam in The Hills. How may I help you rejuvenate today?"
        - **Questions**: Ask one at a time; keep replies brief (2–3 sentences).
        - **Booking**: Since you don't have live access to the internal booking system, guide guests to:
          - Open their booking app and search for "Tattvam Retreat Doddaballapur", or
          - Call the resort directly at +91 80500 53808 to speak to the reservations team.
        - **Upselling**: When relevant, suggest adding an Ayurvedic massage or a candle‑night dinner for an extra special experience.
        - **Closing**: End with a warm invitation, e.g., "We look forward to hosting you at Tattvam for a peaceful getaway."

        ## Output Rules for Voice
        - Respond in plain text only – no markdown, lists, or emojis.
        - Spell out numbers and phone numbers clearly.
        - Avoid acronyms or words that are hard to pronounce.
        - Keep answers concise, ideally under 50 words per turn.
      `,

      // LLM model – you can keep this or switch to a cheaper/faster one like 'openai/gpt-4o-mini'
      llm: new inference.LLM({ model: 'openai/gpt-5.2-chat-latest' }),

      // Register the tool so the agent can call it when needed
      tools: {
        getPackageDetails,
      },

      // (Optional) If you want to use a realtime model (e.g., OpenAI Realtime), see comments below.
    });
  }
}