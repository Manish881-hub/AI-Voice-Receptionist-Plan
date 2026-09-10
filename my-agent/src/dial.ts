import dotenv from 'dotenv';
import { AgentDispatchClient, SipClient } from 'livekit-server-sdk';

dotenv.config({ path: '.env.local' });

// Outbound call: dials a real phone number through a LiveKit Cloud SIP
// outbound trunk, drops the callee into a room, and dispatches `my-agent`
// to that same room. Run the worker first: `node src/main.ts start`.
//
// Usage:
//   node src/dial.ts <OUTBOUND_TRUNK_ID> <DEST_NUMBER_E164> [ROOM]
// Example:
//   node src/dial.ts ST_xxx +919876543210 tattvam-out-001
//
// Prereqs (LiveKit Cloud dashboard -> SIP):
//   1. Outbound trunk (Twilio trial: SID + auth token + FROM number).
//   2. Worker running and registered as `my-agent`.

const [trunkId, destNumber, roomArg] = process.argv.slice(2);
if (!trunkId || !destNumber) {
  console.error('Usage: node src/dial.ts <OUTBOUND_TRUNK_ID> <DEST_NUMBER_E164> [ROOM]');
  process.exit(1);
}

const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;
if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.error('Missing LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET in .env.local');
  process.exit(1);
}

const roomName = roomArg ?? `tattvam-out-${Date.now().toString(36)}`;
const sip = new SipClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
const dispatcher = new AgentDispatchClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

const participant = await sip.createSipParticipant(trunkId, destNumber, roomName, {
  participantIdentity: `phone-${destNumber.replace(/\D/g, '')}`,
});
console.log(`[dial] ringing ${destNumber} -> room ${roomName} (sip_participant=${participant.participantId})`);

const dispatch = await dispatcher.createDispatch(roomName, 'my-agent');
console.log(`[dial] agent my-agent dispatched (dispatch_id=${dispatch.id}). Answer the phone!`);
