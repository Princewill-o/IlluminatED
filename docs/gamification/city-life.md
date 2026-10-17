# City life, pursuit and prison gameplay

## World and population

London is 112 × 88 tiles. The new Study Quarter connects to the existing streets, bus destinations and Underground. It includes a makerspace, reading garden and a furnished, shared lobby.

Ambient characters are explicitly labelled computer controlled. They are not added to multiplayer presence counts. London has up to 24 pavement residents, four cyclists and three parking commuters, in addition to the existing road traffic. The lobby has up to 12 residents. Resident counts reduce as connected players arrive. Private homes have no ambient residents; traffic is only created outdoors.

The 3D camera accounts for its perspective, screen aspect and curved ground when clamping its view inside each map. Small rooms zoom to fit the view. The 2D fallback scales up when needed to avoid exposing empty space around a small map.

## Pursuit

Two or more wanted stars start a response. A police car follows a road route, stops and deploys two officers. Officers use the player's collision map when chasing. The red search field is centred on the incident, with a radius of 14 tiles; staying outside it for six uninterrupted seconds clears the wanted level. Re-entering resets that countdown.

Capture opens a general-knowledge challenge. A correct answer gives a warning and clears the stars. A wrong answer leads to the existing fictional court hearing. These are game mechanics, not statements about actual policing or the law.

## Prison

Cells have open doors. The communal area includes scripted conversations with Sam and Riley, a study desk and a connected service maze. Conversations never open free text or player-to-player chat.

A standard release requires both three correct revision answers and the sentence timer to finish. An unused card earned by completing assigned homework provides an alternative immediate release. Failed revision answers do not remove saved study progress.

Patrolling guards can catch players in the service maze, adding 45 seconds and returning them to their cell. This has a six-second cooldown, and existing study progress is retained. Reaching and interacting with the service exit escapes the prison, returning the player to London with their wanted stars cleared. Every release route also clears the heat timer and pending hearing.

Law/prison state is currently saved in browser local storage, matching the existing life system. It is not a server-authoritative economy, cross-device sentence record or real legal record. No Clout rewards or teacher grades are issued by the local prison revision drill.

## Phone and navigation

The in-game phone provides searchable contacts for all parody companies and standalone workplaces, including Pizzazz. Calls open the relevant workplace interaction where available; other companies provide a scripted direction to their headquarters. Calls never dial actual telephone numbers.

The phone also provides map, home-service and character entry points. Game tabs and account/dashboard shortcuts direct players into the world, rather than offering direct company, home or career shortcuts. The company catalogue displays progress without launching companies.

## Verification

- `node --test tests/game-core.test.mjs tests/bus-commute.test.mjs tests/world-presentation.test.mjs tests/pursuit-prison.test.mjs`
- Browser verification used temporary local fixtures with fictional player data, removed before the production build. The verified flow included police response, knowledge challenge, court verdict, prison transfer, saved revision progress and phone search.
- Landing-page screenshots use actual rendered components and CPU residents, with no fabricated live-user count. See `docs/design/game-screenshots.md`.

The city now supports 80 local walking residents and eight cyclists. Residents stay on public walkable routes; these are CPU characters, not an online-player count.

Recognisable workplaces use real names and shared cartoon brand-inspired badges across the phone, uniforms and signs, labelled as unofficial simulations. Existing company IDs are retained for saved progress.

The station uses a shared 24-second arrival, door-opening, dwell, closing and departure sequence. Boarding waits for an open-door window without restarting the visible train. The platform camera frames the carriage while staying within the map.
