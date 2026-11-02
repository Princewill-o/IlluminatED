# Street care, court and energy

A stable minority (about one in twelve) of local ambient street residents are agitated. Staff, connected players and the pizza delivery customer are excluded. A visible warning gives the player time to walk away. Only a civilian within attack range can land a hit, and hits have a cooldown. Each landed civilian hit removes nine points from the existing energy need, which now also has an always-visible numeric bar.

The F key / nearby action defends against an active attacker. The renderer reports confirmed player hits; empty swings do not file a case. Encounter evidence retains who landed the first hit and the amounts and timing of actual damage. A limited defensive response normally ends without a charge; a minority produces a contested hearing. Aggression creates a separate case. Street hearings show the recorded evidence, let the player contest or accept responsibility, and give an acquittal chance. A conviction brings a Clout fine; players who cannot afford it enter the existing timed prison activity. These are fictional game rules.

Hearings, energy and jail use the existing browser-local life state. Fine deductions are recorded per account and case ID in a local ledger, avoiding repeated payment after a reload. They are local gameplay deductions, not a remote billing/database transaction. Unrelated wanted offences are preserved.

At zero energy outdoors, player movement stops and an ambulance sequence begins. The player remains on the ground, the custom ambulance van arrives, paramedics load a stretcher through animated rear doors, and the van departs. Arrival restores energy using the hospital activity and places the player inside St Tomas' Hospital. Rescue has a bounded loading budget and completion deadline. The normal world renderer is unmounted during the rescue to release its active scene.

Outfit perks are small changes to life needs: slower focus/energy decay or a one-point activity bonus. They do not change combat damage, defence evidence, police authority or court outcomes. Uniforms are cosmetic clothing.

Validation covers actual hit provenance, no offence for a player who does not retaliate, court acquittal/payment/insufficient funds, duplicate fine protection, energy depletion and rescue initiation, rescue stages and loading coordinates, emergency door geometry/opacity and the existing car fleet mapping. The local preview starts directly in lse-1 and owns all existing garage cars for inspection. Production ownership remains controlled by the existing account paths.
# Police response before street hearings

Street reports now remain in their current district. Officers drive to the incident and approach on foot before an arrest can start. Both participants are detained if the recorded evidence includes attacks from both; a civilian who never attacked remains a victim/witness. The current allegation does not decide the later verdict.

The custody state machine requires police contact, a three-second arrest stage and a completed transport journey before admitting the player to the hearing. Court arrival proof is attached to that particular case and saved with the existing local life state. Reloading a pending case restarts the police response rather than teleporting into court; entering the court building cannot bypass the arrest. Hospital rescue takes priority over custody.

`tests/street-custody.test.mjs` verifies that absent police, early transport, mismatched cases and incomplete arrests cannot open a hearing. It also checks one-person and two-person detention from recorded hit evidence.
