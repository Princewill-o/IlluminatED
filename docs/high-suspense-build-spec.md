# High Suspense — Agentic Build Specification

## 1. Delivery goal

Build **High Suspense**, an original, polished Roblox social-deduction experience inspired by the broad genre loop of hidden-role survival games. It must be a complete, multiplayer-playable MVP, not a static prototype. The finished deliverable should include the Roblox Studio project, all launch maps and UI, server-authoritative gameplay, saved profiles, accessible input support, automated and manual test evidence, and a short release/runbook.

Use the previous Murder Mystery 2 research only as a genre reference: round-based play, hidden roles, map voting, survival, investigation, and a collectible inventory. Create original names, layouts, code, art, animations, sound, UI, progression, and mechanics. Do not copy MM2 assets, maps, branding, scripts, text, or distinctive presentation.

## 2. What “MVP complete” means

The release is ready for play only when all of the following work in a published Roblox test experience:

- A player can join, receive a profile, use the lobby, queue for a round, play, see the result, earn the correct reward, and queue again without rejoining.
- Standard supports 4–12 players per server, with a sensible minimum-player setting for testing. Match roles and results are chosen and verified by the server.
- All ten original maps in this specification are complete, navigable, optimized, and selectable through map voting.
- Standard, Disguises, Assassin, Hardcore, and Impossible modes have working rules, UI, role assignments, end conditions, and reward balancing.
- PC, touch, and controller users can move, interact, use role tools, navigate menus, and understand the HUD.
- Profiles persist across sessions. Failed saves are retried safely and never duplicate currency or items.
- The game handles joins, leaves, respawns, round cancellation, server shutdown, latency, and malformed client requests without soft-locking.
- A new player can understand the core loop from the tutorial without reading external documentation.
- The agent supplies test output and a manual smoke-test checklist. A successful local build alone is not release evidence.

## 3. Product pillars

1. **Suspense from information, not confusion.** Players can make informed guesses from sound, movement, sightlines, and evidence. Clues are helpful but never reveal the culprit automatically.
2. **Fair role asymmetry.** Each role has a clear job, a counterplay path, and a readable win condition. Randomness chooses the challenge; skill decides the outcome.
3. **Skill and expression.** Players improve through movement, observation, aim, timing, map knowledge, teamwork, and optional cosmetics.
4. **Short, repeatable rounds.** Aim for 2:30–3:00 rounds, with quick lobby transitions and an opt-in practice/tutorial area.
5. **Good reasons to return.** Rotating maps, optional challenges, new mastery goals, friends, and fair progression should make play enjoyable. Do not use punitive streak loss, manipulative countdowns, forced daily tasks, or pay-to-win purchases.

Design for autonomy, competence, and social play: let players choose a mode, learn from clear feedback, and cooperate without making leaderboards the only measure of success. Research has associated perceived competence and autonomy with enjoyment and continued participation in a leaderboard-based learning game; treat that as a useful design signal, not a universal guarantee. Source: [Gao, Rogers & Li (2024)](https://journals.sagepub.com/doi/10.1177/20427530241251407).

## 4. Core round design

### Lobby and round state machine

Implement a single explicit server state machine:

1. **Lobby** — players spawn, browse loadouts, practice movement, select modes, and socialize.
2. **MapVote** — show three eligible maps with clear thumbnails and names; close voting after 12 seconds. A tie is resolved with seeded server randomness and logged.
3. **Intermission** — show the chosen map, selected modifier, player count, and next-round countdown.
4. **RoundStart** — load map, place players at validated spawn points, assign roles, show private role cards, and start the timer.
5. **RoundActive** — run role actions, evidence, objectives, map events, and elimination rules.
6. **RoundEnd** — stop actions, reveal roles, show the result and short replay summary, award server-calculated XP/credits, then return players to the lobby.
7. **Recovering** — on a fatal error or missing map, safely cancel the round, return living players to lobby, and award no win bonus.

Every state transition must be validated on the server. A client may request an action but must never set the current state, role, kill, result, currency, XP, or inventory.

### Roles in Standard and Hardcore

- **Innocent:** survive until time expires or the Murderer is stopped. Observe, communicate through Roblox-approved social systems, gather clues, and optionally complete a small map task for a modest personal bonus.
- **Detective:** one player starts with a non-automatic sidearm and a limited number of shots. Stop the Murderer. A wrong shot causes a brief disarm and a visible penalty; it does not grant the Murderer an instant win.
- **Murderer:** eliminate all living non-Murderers before time expires. Start with a knife. Close-range attacks and any throw must be server-validated. The role should be uncommon but not so rare that a player can go a long time without getting it.
- **Hero:** if the Detective is eliminated, one surviving Innocent may retrieve the dropped sidearm after a short, server-validated interaction. They become Hero and can stop the Murderer. If the gun is not collected within a short window, it despawns.

Use a role-selection fairness accumulator. A player’s chance of receiving the Murderer role should rise gradually after each round without it and reset when selected. Never expose exact hidden-role odds during a live match.

### Win and end conditions

- Innocents/Detective/Hero win when the Murderer is eliminated or the round timer ends with at least one non-Murderer alive.
- Murderer wins when no non-Murderer is alive.
- Assassin wins when one player remains or the timer expires and that player has the highest valid elimination progress; use a deterministic tie rule.
- Team rounds resolve only when the opposing team is eliminated or the timer expires.
- Leaving mid-round counts as a leave, not a kill or reward exploit. If the Murderer leaves, end the round with a non-Murderer victory and label the result “Murderer left.”

## 5. Modes

### Standard — default

The core role-based mode above. Third-person camera is available. All combat actions are one-hit eliminations so the social-deduction loop remains readable. Display a single vitality pip/indicator rather than a misleading multi-hit health bar.

### Disguises

Keep Standard rules, but use temporary call signs and visually similar round outfits. Do not copy MM2’s exact naming or disguise treatment. Make sure team/role identity is never leaked in nametags. Keep optional camera zoom available for accessibility; disguise difficulty comes from identity masking, not forced camera discomfort.

### Assassin

All players receive a target and a defensive threat indicator. Eliminating the assigned target updates the assignment. A player may defend themselves against their current hunter, but cannot freely eliminate everyone. The server verifies target relationships, attack distance, attack timing, and living status. Finish with one survivor. Do not display the target’s private identity to spectators still in the round.

### Hardcore — purple

Unlock after the tutorial or allow immediate unranked access. Purple UI frame, crescent/heartbeat icon, and explicit “Hardcore” label. Standard roles and map objectives remain, but:

- No role percentages, player outlines, live minimap, automatic clue pings, kill feed, or teammate markers.
- Audio cues are more informative, but direction and distance are spatialized consistently and can be reduced independently in settings.
- Sprint stamina is limited and visible to the local player only. Sprinting drains it; walking restores it. No forced camera shake or sudden loud audio.
- A small “Composure” meter rises when alone in darkness or near danger. At high Composure, breathing and heartbeat become more noticeable to that player; it does not reveal the Murderer or affect aim.
- One life per round. No revive purchases. A spectator can watch only after elimination, with a delay and no ability to message current players through game-specific tools.
- A short, clear pre-round rules card explains the mode.

### Impossible — deep purple

An opt-in, unranked challenge queue with deep-purple UI and a unique emblem. Unlock after completing three rounds or the tutorial. The challenge must be difficult because it demands mastery, not because the rules are hidden or the server cheats.

- Use 8–12 players, one Murderer, one Detective, and the rest Innocents. Shorter 2:15 timer.
- No automatic role hints, no minimap, no player outlines, no map task bonus, no free gun reveal, and no power abilities.
- The Detective has one shot. A miss briefly reveals their location to the Murderer through a sound cue, but does not kill the Detective.
- Map hazards use deterministic schedules, visible or audible warning cues, and at least two routes around each hazard. Never generate an unavoidable spawn kill.
- The Murderer gets no extra movement speed or hidden damage advantage. Both sides face strict stamina and cooldown limits.
- End-of-round recap identifies the clues and player decisions that mattered so difficulty teaches mastery.

If an Impossible modifier changes a win-rate by more than 10 percentage points across equally skilled parties, rebalance before release. Do not sell access, advantages, retries, or extra lives.

## 6. Special rounds and expanded role roster

Special roles are a separate system from the standard role pool. They appear only in clearly announced **Special Rounds**; they never silently enter Standard, Hardcore, or Impossible. Special rounds are unranked, optional through a lobby vote, and use their own result/reward labels. Keep core role rules understandable even when a special role is active.

### Special-round schedule and limits

- A Special Round may be offered after every two completed normal rounds, with a lobby vote to play it or continue Standard. Never interrupt a round already in progress.
- Require at least 6 players for a one-special-role package and at least 10 players for a package with an extra killer-side role. Below the threshold, show a clear reason and continue Standard.
- Show the Special Round name and its possible role types before the vote. Reveal each player's assigned role privately after the map is selected. Do not expose exact assignment odds.
- Use no more than two added roles in one round, except the explicitly designed Jester vote round. The system must always include one Murderer and preserve an identifiable survivor team.
- Add at most one special package per round. Do not combine packages, role abilities, or Suspense Director modifiers in Hardcore or Impossible.
- Test role-win rates and round length separately from Standard. A special-role advantage must come from a limited, counterable ability, not extra hidden information or an unannounced rule.

### Special roles

1. **Tracker — survivor team.** Once per round, inspect one server-generated trace and receive its direction and age band, such as “north corridor, 10–20 seconds old.” The result cannot name a player or reveal a current location. Does not stack with Oracle.
2. **Oracle — survivor team.** Once per round, ask the evidence board a broad yes/no question such as “Did the Murderer use a marked service passage?” Only questions in the server's fixed allowlist are accepted; answer is delayed and can be inconclusive. The Oracle cannot query player identity, live location, or role.
3. **Field Medic — survivor team.** Carries one protective ward. If struck, the ward blocks that one attack, emits an audible break cue for nearby players, and is consumed. It does not restore a player after elimination and cannot be replenished. Murderer counterplay: baiting or waiting out the ward is possible, and the Medic has no weapon by default.
4. **Locksmith — survivor team.** Once per round, unlock or open one marked alternate route. The interaction takes time and makes a distinct sound. Cannot lock a door, trap a player, or change a map's safe spawn routes.
5. **Bodyguard — survivor team.** Select one consenting teammate during the first 20 seconds. If that teammate is struck, the Bodyguard may intercept and be eliminated instead. This is a one-time choice, not an automatic shield; it must be explained to both players and can be cancelled before an attack. Never reveal the protected player's role.
6. **Accomplice — Murderer team.** Eligible only with 10 or more players. Knows the Murderer but has no knife, attack, or kill credit. Once per round, can trigger one nonlethal distraction from a fixed map-approved list, such as a short alarm or light flicker. The action is audible and leaves a trace. The Accomplice wins only if the Murderer wins.
7. **Forger — Murderer team.** Eligible only with 10 or more players and replaces, rather than accompanies, Accomplice in a given round. Once per round, may plant one false, visibly “unverified” evidence trace in a valid location. It cannot forge a kill, weapon, role, player identity, or confirmed trace. The Murderer still has to win normally; Forger shares that win.
8. **Jester — neutral team.** Appears only in a named **False Accusation** Special Round with at least 8 players. The Jester has no weapon and wins alone if they survive until the round's single, clearly signposted 15-second suspect vote and receive the most votes. Other players may still win by stopping the Murderer. Ties do not award the Jester win. The Jester may be eliminated normally before the vote. The vote is anonymous, happens once, and never exposes a player's role; add a report/mute path and do not award credits for accusing a specific person.

### Special-round packages

- **Evidence Rush:** Standard roles plus either Tracker or Oracle. Add extra traces and shorten the timer slightly. No other added role.
- **Safe Passage:** Standard roles plus one Field Medic or Locksmith. Randomly choose one, never both in the same round.
- **Last Promise:** Standard roles plus one Bodyguard. Explain the opt-in protection interaction in the pre-round card.
- **Inside Job:** Standard roles plus Accomplice, for 10+ players. Disable map modifiers to keep the audio clue readable.
- **False Trail:** Standard roles plus Forger, for 10+ players. Add a clear distinction between verified and unverified evidence for all players.
- **False Accusation:** Standard roles plus Jester, for 8+ players, and one vote phase. Disable other special roles and map modifiers.
- **Arsenal Alarm:** an optional, unranked special round for 8+ players. Keep the normal Murderer/Sheriff/Innocent win conditions and add no special roles. The round template assigns a weapon class independently of a player's purchases: Sheriff/Hero can be assigned sidearm, AR, shotgun/SMG; Murderer can be assigned blade, bow, or fictional launcher. Innocents do not receive a weapon. Select one class per team from a tested server-side configuration, show the class rules before voting, and disable map modifiers. A purchased catalog item only changes the skin of the class the server assigned.

For Arsenal Alarm, use original, stylized, non-realistic combat presentation. A launcher fires one highly visible, single-target energy/foam projectile after an audible charge cue; it has no splash damage, wall penetration, environment destruction, or hidden blast radius. A bow has a visible projectile and a readable draw sound. Rifles/SMGs use server-configured limited ammo and a visible muzzle/shot cue; shotguns have a short, clearly bounded range. Tune cooldowns, ammunition, projectile speed, and hit rules as part of the round template, then playtest. Preserve one-hit role outcomes and provide the opposing side a reaction window or route-based counterplay. Never sell access to these classes, extra ammunition, faster fire, or stronger projectiles.

### Special-role implementation requirements

- Add a server-owned role definition table with: role ID, team, minimum player count, eligible modes/packages, ability charge/cooldown, target rules, win-condition contribution, UI copy key, and audit label.
- Role selection first constructs and validates a complete composition, then assigns it atomically. If a valid composition cannot be made, fall back to Standard and report a structured diagnostic.
- Every ability request includes the current round ID and is checked for role, life state, charges, cooldown, distance, line of sight if relevant, allowed map object, and rate limit.
- Build a role tutorial card and a one-line opponent-facing counterplay hint for each special package. Never tell players a hidden role's exact location or remaining ability charges.
- Add analytics counters for package selection, role win rate, ability use, ability rejection, round duration, and quits. Do not collect chat contents.

## 7. Fighting-game-style bars and moment-to-moment abilities

Use an original HUD layout with **Stamina** and **Focus** bars. Do not reproduce Shadow Fight 2 artwork, icons, exact HUD geometry, or assets.

- **Stamina (all modes):** 100 points. Sprint drains 20 points/second; walking restores 18/second after a 1-second delay. At zero, the player returns to walking speed. Tune values through a central config module.
- **Focus (Hardcore/Impossible, optional in Standard):** 0–100. Gain a small amount from role-relevant play (survival, valid investigation, or successful objective); lose it on incorrect/noisy interactions. Focus enables one chosen utility action per round, such as a brief breath-control effect to dampen one sound cue, or a fast but loud door interaction. It never enables a kill, wall vision, teleport, or role reveal.
- **Vitality:** one hit in Standard, Disguises, Hardcore, and Impossible. Present as a one-hit life marker. In a future duels mode only, multi-hit vitality may be used, with balanced, documented rules.
- Use color plus icon/text for every state; never communicate danger only by red/green. Provide reduced-motion and reduced-audio settings.

## 8. Twenty-two original maps

Interpret “add ten more maps” as a 12-map High Suspense base catalog plus the ten new maps below: **22 original maps total in the MVP**. The 12-map base catalog is also original work; do not port MM2 maps or use confusingly similar layouts. Build the catalog so more maps can be added without changing match logic. Every map gets a distinct silhouette, at least two loops, multiple hiding/escape options, stable landmarks, accessible route widths, and no spawn within immediate line-of-sight of an opponent.

### Twelve-map High Suspense base catalog

1. **Ashcroft House** — compact suburban home with a basement loop and a clear central staircase.
2. **Cinderline Office** — modern office floors connected by stairs and a noisy service lift.
3. **Northpoint Clinic** — medical wing with a central atrium and two quiet side routes.
4. **Railyard Depot** — freight depot with open lanes, stacked cargo, and safe crossovers.
5. **Redwood Lodge** — forest lodge with indoor/outdoor loops and readable path lights.
6. **Vault 09** — secure archive with rotating corridor doors, always paired with a bypass route.
7. **Harbor House** — waterfront building with a dock loop and interior route.
8. **Pinecrest School** — classroom wing and gym with broad, accessible corridors.
9. **Oldtown Theater** — stage, lobby, and backstage loops; curtains do not conceal attacks unfairly.
10. **Copperworks** — small factory with a safe conveyor crossing and visible machinery warnings.
11. **Westbridge Apartments** — two connected floors with stairwells and a courtyard loop.
12. **Rookwood Station** — small transit hall with ticketing, platforms, and a safe, blocked train track.

### Ten new maps

These ten are the requested additions to the base catalog:

1. **Blackout Manor** — old estate with fuse boxes. A warned blackout changes lighting for 12 seconds; emergency lamps and silhouette contrast remain readable.
2. **Nightshift Hotel** — hotel corridors and service passages. Elevators make noise and reveal their active floor; they never trap a player.
3. **Sunken Metro** — underground station with a train crossing on a fixed schedule. Flashing signs and sound warn players; the train blocks paths but does not kill.
4. **Glasshouse Observatory** — dome, labs, and glass corridors. Smart shutters create temporary sightline changes with clear warning lights.
5. **Cold Storage** — freezer warehouse with controllable fog vents. Fog affects visibility locally and fades; it cannot fully obscure close-range combat.
6. **Carnival of Echoes** — empty amusement hall with sound-reactive props. Decoy noises can mislead but never fabricate a fake kill or role sound.
7. **Midnight Museum** — exhibit halls, archive rooms, and rotating displays. Slow-moving exhibit gates alter routes; each has a bypass path.
8. **Floodgate Station** — hydroelectric control facility. Water level changes open or close low routes on a timer; warning lights and elevated alternatives are always available.
9. **Signal Tower** — remote communications station connected by indoor bridges. A radio outage briefly disables one map gadget, not player controls or core role actions.
10. **Skybridge Terminal** — high-rise transit hub with atrium, concourse, and maintenance ring. Transparent bridges create tense sightlines, with opaque alternate routes for accessibility and counterplay.

For every map, supply a spawn/route diagram, collision pass, mobile performance pass, sound cue list, map-specific hazard specification, and automated spawn-safety test. Do not add moving hazards that can kill, permanently pin, or force players into a single corridor.

### Blender-to-Roblox model and design pipeline

Create the maps and bespoke environment props in **Blender**, then import and assemble them in Roblox Studio. A map is not complete when it only looks good in a Blender render; it must import cleanly, read well from Roblox's third-person camera, have reliable collision, and maintain frame rate on mobile.

#### Visual direction

- Establish one coherent High Suspense art bible before producing the map set: cinematic stylized realism, bold silhouettes, crafted architectural detail, restrained surface noise, and a consistent eerie palette of charcoal/slate, deep violet, cool teal, and warm amber signal lights.
- Use composition, practical lighting, affordable fog, sound, and contrast to create tension. Keep player silhouettes, doors, interactables, floor edges, and escape routes immediately readable.
- Make each location visually memorable from its lobby thumbnail and from a 2–3 second gameplay glance. Use original visual motifs, props, architecture, signage, and color accents for every map.
- Use environmental detail to reward exploration, but keep clutter outside movement lanes and interaction points. Never hide a player or attack behind decorative noise that cannot be read at Roblox camera distance.
- Avoid realistic gore, graphic injury, flashing strobe effects, and unannounced jumpscares. Build suspense with lighting, audio, framing, and environmental movement.

#### Blender scene structure

- Save an editable `.blend` source for each map and a separate reusable prop library. Organize each file into named collections such as `Architecture`, `SetDress`, `LightingGuides`, `GameplayLandmarks`, `CollisionProxies`, and `Export`.
- Use consistent real-world scale, apply transforms before export, set intentional object origins/pivots, use descriptive names, and keep export collections free of cameras, lights, hidden duplicates, and render-only objects.
- Build modular wall, floor, ceiling, trim, door, and prop kits. Reuse identical source meshes and textures across maps, then duplicate and transform those assets in Studio to support engine instancing.
- Separate render geometry from simple collision proxies. Do not use dense decorative meshes as the only walkable/floor collision. Keep doors, moving props, hazards, and interactables separately named with documented pivots and collision behavior.
- UV unwrap intentionally, avoid accidental overlaps, check texel density across an asset family, and pack textures efficiently. Use a small, consistent material set. Use PBR maps only where they materially improve readability; author color, roughness, metalness, and normal detail within Roblox's current import support and asset limits.
- Put lights, sounds, particle effects, scripts, interaction logic, spawn points, map metadata, and safe route markers into Roblox Studio models or authored code, not baked into meshes in a way Roblox cannot control.

#### Export and Studio import

- Use **FBX** as the default export for Studio's 3D import workflow; use **glTF/GLB** only when it better preserves a needed supported material or hierarchy and has been verified in the target Studio version. Roblox's Importer supports FBX, glTF, and OBJ; FBX/glTF support multiple objects, hierarchies, basic/PBR textures, and other supported data. See [Roblox Importer](https://create.roblox.com/docs/studio/importer), [3D export requirements](https://create.roblox.com/docs/art/modeling/export-requirements), and [Custom 3D assets](https://create.roblox.com/docs/art/modeling).
- For Blender FBX exports, follow Roblox's current documented settings: Path Mode **Copy** with Embed Textures enabled, Apply Scalings **FBX Unit Scale**, disable Add Leaf Bones, and disable Bake Animation for static map assets. Verify imported scale in Studio and consult [Roblox's Blender export steps](https://create.roblox.com/docs/art/modeling/export-requirements) if the importer changes.
- Export each reusable mesh family as a separately named asset or model, rather than uploading an entire map as one giant mesh. Import with Studio's Importer, inspect warnings, preview materials, and verify all pieces in Workspace before assembly.
- Preserve Blender source, exported interchange files, textures, and an asset manifest in the project. The manifest records source file, exported object names, intended use, texture maps, import date/version, and Roblox asset IDs after upload.
- Keep source mesh/object names stable so Studio reimport can update the intended MeshParts. After reimport, check that Studio-specific collision, render-fidelity, surface appearance, and gameplay properties are still correct.
- Confirm current Roblox mesh, texture, dimension, and upload constraints against official documentation at build time. Do not guess around an import rejection; fix the source or document an engine-compatible fallback.

#### Quality and performance gates for every map

- Review the model in Blender using neutral lighting and the intended Roblox camera scale. Review again in Roblox Studio at low, medium, and high graphics settings.
- Check normals, shading, UV seams, material assignments, transparent surfaces, texture mip readability, pivots, scale, collision, and import warnings.
- Use MeshPart `CollisionFidelity` appropriate to the object; use simple box/hull collision or authored proxy parts wherever precise collision is unnecessary. Disable collision, touch, and query on decorative assets that need none.
- Reuse identical mesh and texture asset IDs across repeated props; package common assets. Roblox guidance calls out excess unique meshes, draw calls, triangles, precise collision, shadows, and transparency overdraw as common costs. Profile with Roblox Studio Render Stats/MicroProfiler instead of treating polygon count alone as a quality score. See [Improve performance](https://create.roblox.com/docs/performance-optimization/improve) and [Design for performance](https://create.roblox.com/docs/performance-optimization/design).
- Audit map CPU/GPU frame time, memory, draw calls, physics parts, and initial load time on a low-end mobile test profile. Set a measurable mobile budget before polishing; if over budget, simplify or reuse assets before reducing gameplay clarity.
- Produce a signed-off map package: `.blend` source, exported files, texture sources, asset manifest, in-Studio screenshot, mobile performance capture, collision/route diagram, and reviewer checklist.

## 9. Original “crazy” features that improve replayability

### The Suspense Director

At the start of a round, select at most one fair modifier from a small curated set: lights flicker, a door is jammed, footsteps carry farther, a harmless alarm masks sound, or one shortcut opens. Announce the modifier to everyone. Never combine modifiers in Impossible. The Director cannot change roles, kill players, or alter weapon accuracy.

### Evidence and deduction

Generate a few server-controlled evidence traces each round: a recently opened door, a brief footprint trail, a dropped object moved from its spawn, or a short camera outage. Evidence has age and uncertainty; it narrows possibilities without identifying a role. Clue frequency is balanced so both teams have counterplay. No player-specific accusation button that reveals the hidden role.

### End-of-round case file

After roles are revealed, show a 10–15 second recap: map, modifier, important evidence, objective progress, and role decisions. It is informational and skippable. Keep it short enough not to delay the next round.

### Post-round shadow replay

Offer an optional replay of the final 15–20 seconds from a top-down stylized view after the round ends. Do not stream live enemy locations to active players. The replay can be disabled for performance and privacy.

### Mastery cards and cooperative challenges

Give each player two optional, non-punitive challenges per session, such as survive 30 seconds, collect three evidence traces, or use a route gadget. Rewards are predictable and small. Let players reroll once for free; do not use streak-loss pressure. Add team goals that reward assistance and safe play, not only kills.

### Fair social tools

Support party joining, rematch vote, spectating after elimination, and a report/mute path. Use Roblox’s platform chat and moderation tools; do not create unrestricted custom chat or voice capture. Prevent spectators from revealing active player locations.

## 10. Economy, inventory, and progression

### Launch economy

- **Earned Credits:** earned through playing, role objectives, survival, and fair team contributions. Spend on fixed-price cosmetics and map lobby decorations.
- **Premium Credits:** optional currency bought only through Roblox in-app purchases and spent only on a named, selected cosmetic at a displayed fixed price. Never use it for random rewards, gameplay boosts, or trading.
- **XP and levels:** earned from valid participation, not AFK time. Levels grant titles, profile frames, and cosmetic credits; no combat power.
- **Mastery:** separate tracks for Innocent, Detective, Murderer, Assassin, and each mode. Rewards are cosmetic and demonstrate experience.
- **Inventory categories:** knives, sidearms, trails, elimination effects, emotes, player-card frames, and lobby props. All items use original assets and clear rarity names; rarity is presentation only.
- **No paid random items in MVP.** Use visible fixed-price cosmetics or passes only after the gameplay is stable. No gameplay stat boosts, paid retries, loot boxes, paid keys for random awards, tradable paid random items, or artificial scarcity countdowns.
- If paid randomized rewards or paid-item trading are ever added, first implement the applicable Roblox policy gates and disclosures. Roblox currently requires disclosure of paid-random-item odds and per-player PolicyService handling for restricted regions; paid-item trading also has per-player policy requirements. [Paid random items policy](https://create.roblox.com/docs/production/monetization/paid-random-items) · [Content maturity and compliance](https://create.roblox.com/docs/production/promotion/content-maturity)

### Robux and in-app purchases

Implement purchases through Roblox `MarketplaceService` only. Robux purchases grant **Premium Credits** or a small set of explicitly priced, permanent featured cosmetics. The player chooses the exact item before purchase; show its name, rarity label, role, mode compatibility, and final regional price before opening the Roblox confirmation prompt. Do not add loot boxes, paid spins, mystery bundles, paid keys, chance upgrades, or any other paid random reward.

- Create a small, configurable set of repeatable Developer Products for Premium Credit packs (suggested sizes: 300, 800, 2,000, 5,000, and 12,000 credits). Set actual Robux prices in Creator Dashboard after playtesting; do not hard-code the price into UI. Fetch/display Roblox's current product price dynamically so managed regional pricing is accurate.
- Make the 1,100-item catalog purchasable at its fixed Premium Credit price. Keep the same items earnable with Earned Credits or through gameplay mastery where configured, so every cosmetic has a non-purchase path. Premium Credits are never converted back to Robux and are never used in a random generator.
- If individual Robux-priced featured items are enabled, use explicit per-item Developer Products and a server-owned ProductId-to-CatalogId mapping. A receipt grants that exact permanent cosmetic once. Keep featured SKUs limited and configurable; never invent product IDs. Publish only after the owner configures and verifies real IDs in Creator Dashboard.
- Add an optional permanent **Collector's Case** pass for extra cosmetic loadout presets and profile display slots only. It grants no better weapons, higher odds, speed, extra lives, role chance, or competitive advantage.
- Handle Developer Product purchases in one server Script through `MarketplaceService.ProcessReceipt`. Persist receipt PurchaseId and the granted item/currency atomically and idempotently before returning `PurchaseGranted`; return `NotProcessedYet` on transient save failure. Never award from a client-side purchase-finished event. Test duplicated, delayed, cancelled, stale, and cross-server receipts.
- Verify the item remains unowned and available immediately before prompting. Prevent concurrent prompts for the same player, and explain clearly if the item was already owned. Do not consume currency on a failed equip or failed item grant.
- Use Roblox product-info APIs for the visible Robux price and managed pricing. Don't show hard-coded Robux numbers that can disagree with a user's regional price. See [Developer Products](https://create.roblox.com/docs/production/monetization/developer-products), [Passes](https://create.roblox.com/docs/production/monetization/passes), [Regional pricing](https://create.roblox.com/docs/production/monetization/regional-pricing), and [Roblox monetization guidance](https://create.roblox.com/docs/production/monetization).
- All purchases are cosmetics. A sword, rifle, or launcher purchase changes only the permitted appearance in the relevant mode. Gameplay damage, accuracy, fire rate, cooldowns, range, role assignment, and hit validation are defined by server-side mode configuration, never by the catalog item.
- The MVP has no player-to-player item trading or gifting. This keeps purchased items account-bound and avoids transfer restrictions. If trading is added in a later version, implement Roblox's applicable per-player `IsPaidItemTradingAllowed` checks before shipping.
- Keep purchase prompts calm and factual: “Buy 800 Premium Credits” / “View Item.” No false stock claims, fake countdowns, pressure language, or repeated prompts. Roblox cautions against misleading urgency and requires dynamic prices where regional pricing is enabled.

### Weapon catalog and role compatibility

Include the complete companion file `docs/high-suspense-weapon-catalog.csv`, with **1,100 named cosmetic entries**. The CSV is the single source of truth for item IDs, weapon family, name, rarity, role compatibility, mode availability, fixed Premium Credit cost, and reusable Blender asset family.

Catalog counts:

- **400 blades and swords** — Murderer cosmetics in Standard, Disguises, Hardcore, Impossible, Assassin, and eligible special rounds.
- **300 Sheriff sidearms** — pistol/revolver visual variants for the Sheriff/Hero in role-based modes.
- **150 AR rifles** — Sheriff/Hero appearance variants, usable only in an explicitly balanced special Arsenal round.
- **100 fictional launchers/bazookas** — 50 Sheriff-team and 50 Murderer-team variants, special Arsenal rounds only.
- **100 bows/crossbows** — role assignment fixed by the special-round loadout; special rounds only.
- **50 shotgun/SMG variants** — Sheriff-team special-round cosmetics only.

Keep the base role rules intact: in Standard/Disguises/Hardcore/Impossible, Murderers use a one-hit melee blade and Sheriff/Hero uses the configured sidearm. Rifles, launchers, bows, shotguns, and SMGs do not become usable in these core modes just because a player bought their skin. Introduce their weapon classes only in a labeled special Arsenal round where every enabled weapon has server-tuned fire cadence, range, ammo, projectile travel, cooldown, warning cue, and counterplay. A Robux purchase never unlocks a special-round advantage.

Rarity is a **fixed cosmetic tier label**, not random drop probability: Common (385 items), Uncommon (308), Rare (220), Epic (110), Legendary (55), Mythic (22). Every item has a known, fixed catalog cost; there are no rarity rolls. Proposed Premium Credit prices are Common 250, Uncommon 450, Rare 800, Epic 1,400, Legendary 2,500, Mythic 4,500. Balance the Earned Credit path through playtests before release.

Create a manageable Blender asset library with reusable weapon base meshes and finish families; do not hand-build 1,100 unrelated high-poly meshes. Create named silhouette variants where a weapon class requires them, then differentiate cosmetics through original, optimized materials, colorways, trim, engravings, emissive details, and attachments that do not obscure aiming or silhouettes. Preserve a clean, readable hand-held silhouette in Roblox's third-person camera. Ensure the selected item is equipped only when its role and mode compatibility match.

### Save data

Persist versioned profile data: schema version, Earned Credits, Premium Credits, XP, level, mastery, owned cosmetic IDs, equipped IDs, processed purchase receipt IDs, tutorial completion, non-sensitive settings, and a compact set of lifetime stats. Store unique item IDs rather than trusting client-owned Instances. Use UpdateAsync-style conflict-safe writes, bounded retries, a session lock, and a migration function. Never store chat, voice, precise location, or unnecessary personal data.

## 11. UI and UX

### Visual design bar

Make the interface feel like a premium suspense-series control room, not a default Roblox template. Create an original design system with a compact wordmark, deliberate typography, cinematic title cards, layered charcoal panels, violet mode identity, warm alert accents, elegant motion, and consistent iconography. Keep text, critical state, and actions clear before decorative detail.

- Create reusable Roblox UI components for buttons, tabs, cards, progress bars, role emblems, timers, inventory tiles, toasts, modal dialogs, and tooltips. Define color, type, spacing, corner, stroke, and motion tokens in one shared UI theme module.
- Design at least four deliberate layouts: desktop, mobile portrait, mobile landscape, and console/TV. Use Scale, AnchorPoint, automatic layouts, constraints, and viewport adaptation; do not position every screen from fixed pixel coordinates. Keep important controls outside Roblox core UI, device cutouts, and thumb/jump zones. Follow [Roblox adaptive design](https://create.roblox.com/docs/production/publishing/adaptive-design) and [UI position and size](https://create.roblox.com/docs/ui/position-and-size).
- Add subtle transitions for menu entry, map votes, role reveal, round start, special-round cards, and results. Animation must not delay input or hide a critical state. Respect reduced-motion settings.
- Give every button keyboard, touch, and gamepad focus/activation states. Use accessible labels and controller selection order. Support user text-size settings and responsive wrapping. Use icon plus text and do not communicate meaning by color alone.
- Make the active match HUD intentionally sparse. Contextual prompts appear near usable objects instead of leaving permanent action buttons on the screen. Keep the target, timer, objective, and stamina/focus readable at a glance.
- Include polished loading, empty, error, reconnect, purchase-confirmation, and save-pending states. No dead buttons or placeholder labels may ship.

Required screens:

- Main lobby HUD: queue/mode, timer, credits, level, inventory, shop, settings, party, help/report.
- Map voting panel with readable thumbnails, votes, countdown, and accessibility labels.
- Private role card and role-specific objective card.
- In-round HUD: timer, objective, stamina/focus when used, status indicators, and sound/subtitle settings.
- Inventory with filter/search, equip preview, ownership, and rarity.
- Shop with fixed prices, earning path, purchase confirmation, and no misleading timers.
- Round result and case file.
- Tutorial and controls page; include one quick practice scenario for movement, observation, and role actions.
- Settings: graphics, camera sensitivity, subtitles for gameplay-critical cues, audio mix, reduced motion, color-safe palette, and control remapping where Roblox permits.

All interactive elements need controller focus order, touch-sized hitboxes, clear focus states, and text labels for icons. Avoid flashing full-screen effects. Provide high-contrast and reduced-motion settings.

### Cinematic intro and first-launch sequence

Before the player enters the active lobby, play a short original High Suspense intro. Establish the setting and brand, then clearly hand control to the player. This is an onboarding moment, not a long unskippable trailer.

- Target **12–18 seconds**, with a visible Skip button from the first frame. Accept keyboard, controller, and touch skip input. The sequence can never block joining a party or leave a player stuck if an asset fails.
- Shot plan: (1) near-black frame with a faint radio/tape cue and title fragment; (2) slow camera move through one original environment, with a distant silhouette or practical light movement; (3) three quick, readable glimpses of distinct maps and role objects (knife, sidearm, evidence marker) without showing a hidden role or a kill; (4) the High Suspense title lockup; (5) the lobby doors open and the “Enter Lobby”/“Play” action appears.
- Use authored in-engine cameras, lighting, sound, and models. Keep the sequence legible on mobile, low graphics settings, reduced-motion mode, and muted audio. Provide subtitle captions for narrative audio cues and no sudden peak-volume sound.
- Load the player's profile, party state, and required lobby assets in parallel with the sequence. Put only the lightweight intro/loading interface and essential controller in ReplicatedFirst. Preload only the title card, essential sound, and immediate lobby assets; defer maps and shop content until needed. Show progress only when actual load steps are available, and always provide Skip/Continue.
- First join can show the full intro; returning players may skip by default after their first completed viewing. Store only a simple intro-seen preference. Replaying it must remain available from Settings/About.
- Separate intro camera and effects from server gameplay state. The client can request “intro finished,” but the server decides when that player enters the lobby and becomes eligible for a queue. If the intro errors or times out, automatically route to the lobby safely.
- Add an `IntroSequenceController` with start, skip, complete, cleanup, and failure-fallback paths. Test duplicate skip input, late asset loads, player disconnect, party members joining at different times, reduced motion, muted audio, and slow mobile loading.

## 12. Roblox implementation architecture

Use modular Luau with strict separation between server state, client presentation, and shared immutable configuration.

Suggested service modules:

- **RoundService:** state machine, timers, cancellation, result calculation.
- **RoleService:** fair role selection, private role assignment, hero transfer.
- **MapService:** map catalog, safe loading/cleanup, vote tally, spawn validation.
- **CombatService:** server-authoritative attack validation, hit resolution, elimination.
- **AbilityService:** stamina, focus, cooldowns, mode permissions.
- **SpecialRoleService:** package eligibility, atomic role composition, role-specific ability validation, and special win conditions.
- **SpecialRoundService:** opt-in vote, schedule, package selection, minimum-player checks, and safe Standard fallback.
- **EvidenceService:** trace creation, expiry, visibility, anti-spam validation.
- **ModifierService:** eligible round modifier selection and map schedules.
- **RewardService:** XP, credits, and mastery calculations, idempotent award IDs.
- **PurchaseService:** server-owned product catalog, purchase intent validation, ProcessReceipt idempotency, Premium Credit grants/spends, dynamic catalog ownership refresh, and purchase audit records.
- **ProfileService:** profile load/save, schema migration, session locks.
- **InventoryService:** ownership/equip validation and cosmetic application.
- **PartyService:** party creation/invites/join flow with permission and capacity checks.
- **ReportService:** route player reports to Roblox-supported reporting/moderation workflows; never expose reporter identity to the reported player.
- **TelemetryService:** aggregate, privacy-conscious match metrics and error counters.

Suggested client modules:

- **RoundHUDController**, **RoleCardController**, **MapVoteController**, **InventoryController**, **ShopController**, **SettingsController**, **InputController**, **AccessibilityController**, **SpectatorController**, **CaseFileController**, **IntroSequenceController**, **AssetStreamingController**.

`IntroSequenceController` owns intro play/skip/complete/failure lifecycle and camera restoration. `AssetStreamingController` requests only the map/UI preview assets the player needs, reports actual readiness, and falls back when optional cosmetics fail.

Shared modules contain typed configuration, enums, map metadata, reward tables, localization keys, and input schemas. Never put trusted currency, role assignments, drop tables, or hidden state in a client-readable module.

### Server validation checklist

Treat every client request, ProximityPrompt, ClickDetector, and replicated interaction as untrusted. Validate on the server:

- player is in the correct round state, alive, and permitted to act;
- role, target relationship, ownership, distance, line of sight where appropriate, cooldown, and ammo/stamina;
- argument types, sizes, finite numeric values, allowed IDs, and legal ranges;
- rate limit per player and per action;
- reward and transaction idempotency;
- request sequencing and stale round identifiers.

Never trust a client-reported hit, role, distance, purchase amount, target, inventory, clue, or result. Roblox explicitly recommends server-side validation and rate limits for remote actions. [Securing the client-server boundary](https://create.roblox.com/docs/scripting/security/client-server-boundary) · [Remote events and callbacks](https://create.roblox.com/docs/scripting/events/remote)

Use DataStoreService for durable profiles and MemoryStoreService only for short-lived cross-server queues or coordination. [Data stores](https://create.roblox.com/docs/cloud-services/data-stores) · [Memory stores](https://create.roblox.com/docs/cloud-services/memory-stores)

## 13. Performance and reliability targets

- Target smooth performance on supported low-end mobile devices; use streaming-friendly map construction, low part counts, optimized meshes, and bounded particle/sound counts.
- A round with 12 players should not allocate unbounded loops, per-frame remote traffic, or unbounded history tables.
- The server owns a fixed round clock. Client clocks are display-only.
- All map and role references must have timeout/error handling. If a map fails to load, select a known-good fallback or cancel safely.
- Profile load failure must leave the player in a safe restricted state; never grant a default inventory and then overwrite a valid saved profile.
- Log structured match IDs, state transitions, validation rejects, save failures, and round durations without logging private chat or secrets.
- Include a feature flag/config switch for each mode and map, so an unstable feature can be disabled without code surgery.

## 14. Test plan and release gates

The build agent must create automated tests where Roblox Studio/TestService permits, plus a documented manual multiplayer pass.

### Unit tests

- role distribution, pity/fairness accumulator, round end conditions, ties, leaving players, and reward arithmetic;
- special-role package eligibility, player thresholds, role-composition fallback, each special role's win condition, once-per-round abilities, and conflicting-package rejection;
- stamina regeneration/drain and ability cooldowns;
- invalid numbers, NaN/infinity, malformed tables, unknown item IDs, and oversized payloads;
- profile migration, duplicate award prevention, and item ownership/equip validation.
- Robux purchase receipt idempotency, duplicate/late receipt handling, insufficient-credit flow, regional-price display, exact catalog grants, and no client-side currency/item grant path;
- every catalog item checked against role/mode compatibility, fixed rarity/cost, ownership, and equip rules.

### Integration tests

- 4, 8, and 12-player rounds for every mode;
- 4, 6, 8, 10, and 12-player special-round eligibility and fallback cases;
- every special package with valid team sizes, plus each special role leaving before/after ability use;
- all players leaving during voting, intermission, and active play;
- Murderer/Detective/Hero leaving or resetting;
- map load failure and missing spawn fallback;
- two players attempting the same pickup or clue simultaneously;
- repeated client requests and spoofed attack/purchase/remotes;
- profile save/load across rejoin and simulated save failure;
- purchase save failure/retry, receipt delivered after rejoin, already-owned item, and two overlapping purchase attempts;
- party join when server is full or round is locked;
- round ends once only and grants rewards exactly once.

### Device and UX tests

- keyboard/mouse, touch, and controller from join through a full round;
- color-safe and high-contrast modes, reduced motion, cue subtitles, and audio sliders;
- minimum supported graphics settings and a low-end mobile profile;
- all 22 maps imported from Blender into Studio, at all graphics levels, with collision, route, texture, and frame-time checks;
- intro sequence on first join and return join, with skip by keyboard/touch/controller, asset failure fallback, reduced motion, muted audio, and party join during intro;
- UI layout screenshots and interaction passes for desktop, mobile portrait/landscape, and console/TV sizes;
- localization-safe UI sizing with long names and translated strings.

### Human playtest

Run at least 20 full rounds with a mix of new and experienced players. Record: role win rates, time-to-first-understanding, map quit rate, mistaken shots, reports, disconnects, and player-reported fairness/fun. Adjust only from observed issues; do not tune solely to maximize session length.

### Release checklist

- Publish to a separate test experience first; never test against production profile data.
- Confirm Roblox content-maturity questionnaire answers match the shipped violence/fear content and disclose descriptors accurately. Roblox warns inaccurate maturity info can restrict availability or cause moderation. [Content maturity and compliance](https://create.roblox.com/docs/production/promotion/content-maturity)
- Validate every uploaded asset’s ownership/license and moderation status.
- Verify no debug commands, test currency grants, or bypasses are reachable by ordinary players.
- Verify mobile and controller input, DataStore budgets, server shutdown, and clean round recovery.
- Provide the project file, setup/publish steps, test output, known issues, and a one-page operations guide.

## 15. Required agent output

At completion, return:

1. The complete Roblox Studio project and a clear file/module map.
2. A list of implemented modes, systems, all 22 maps, Blender source scenes, exported assets, and the asset manifest.
3. Test results with environment, test cases, pass/fail totals, and reproducible failures.
4. Manual playtest findings and any tuning changes made.
5. Publishing/setup instructions and required Creator Dashboard configuration.
6. Known limitations and any feature flags left disabled.
7. A confirmation that all player-affecting decisions and rewards are server-authoritative.

Do not claim “ready for play” if a core mode, map, save path, input type, or round recovery path is untested.
