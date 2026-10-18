# Room chat

The Chat button in the game opens a typed room conversation. Messages use the
existing private, lease-authorised Supabase Realtime room: same map and server
only. No separate public channel or anonymous access was added. Own messages
appear after the server acknowledges the send. An acknowledgement confirms the
server accepted the broadcast, not that another player read it.

Messages are plain React text, capped at 180 characters, with a 1.5-second client
send/receive cooldown and a 60-message session buffer. Hidden players are removed
from the local log. Disconnecting disables the composer and failures preserve the
draft. Room changes clear the conversation. History is ephemeral, not a stored
moderation log. Browser-side limits are not a server anti-abuse system, and room
membership does not cryptographically bind a broadcast's claimed sender ID.
Server-enforced sender attribution, moderation/report retention and abuse limits
remain necessary before describing free-text chat as moderated or tamper-proof.

On 18 October 2026, the existing `20261018120000_world_admission.sql` migration
was applied to the IlluminatED Supabase project because `world_claim` was absent.
Follow-up SQL confirmed the function exists, anon lacks execute, authenticated
users can request admission, and unauthenticated room access is false. Private
lease/limits tables intentionally have no client RLS policies and no client grants.
The admission functions intentionally check membership as security definers.

Verification: 17 tests cover in-memory two-client messaging, payload limits,
disconnected sends, room refusal, identity expiry, reconnects and lease rotation.
This is not a live two-account delivery test. Browser QA was unavailable because
local browser use was disabled in Work settings. Supabase advisors were run;
existing unrelated function-exposure and password-protection notices remain for
separate review. See the [Supabase database advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
