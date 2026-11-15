# IllumWorld game identity

The umbrella, IllumWorld homepage, school pilot and shared product navigation now lead with the playable city-life game. The main action opens `/games/world?map=city`. Roles and completion requirements are discovered through `/world/contracts`; certificate information links to its `#certificates` section.

The catalogue has 13 employer simulations plus 336 introductory role scenarios across 28 sector studios. The sector scenarios use a common three-shift evidence-review format, with role briefs and sector-specific records and escalation rules. They are introductory career exploration. Each role has three shifts and takes 24 to 27 minutes at the learner's own pace. Players can open contracts from Jobs, the game phone, the Venture Yard or the employer's training office. Microsoft also has a training desk. The role pages link to the public references used to map skills and examples.

The certificate route grades the three shift checks on the server. The PDF shows the employer's in-game badge and name followed by × and the IlluminatED wordmark. Progress is saved on the player's device. IlluminatED issues the certificate for completing the simulation.

The career references drawer fetches optional data from the [ESCO occupation API](https://esco.ec.europa.eu/en/use-esco/use-esco-services-api/esco-web-service-api) and [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html). ESCO provides related skills and Greenhouse provides real job examples from verified boards. The drawer uses a read-only endpoint keyed by the course id. The simulation and certificate work independently of those providers.

The game displays the active training role locally and in existing private friend voice connections. Players opt in with the mic button. Earlier police contact can issue a warning. Player arrests begin at five wanted stars.

Company names in the world use the real names where there is a clear match. Save IDs and workspace URLs remain stable. The forward wardrobe migration updates item names while keeping their IDs and unlock requirements.

The former repair-trainee activity is no longer promoted on these public entry pages. Existing saved-project and repair routes are preserved for compatibility; shared navigation still provides access to saved class projects. Removing the feature from the homepage must not delete learner work or rewrite historic awarded project records.

The Maths, Science and English pages offer a year selector, short original practice and links into the existing lesson catalogue. English has Language and Literature views of the same feed. Science separates Combined Science, Biology, Chemistry and Physics at GCSE. Each subject is accessible independently of the game.

Screenshots from the playable game are served from `/landing/world-current-square.jpg` and `/landing/world-current-workplace.jpg`.

Run the focused checks with `node --test tests/world-game-identity.test.mjs tests/role-contracts.test.mjs tests/secondary-subjects.test.mjs tests/learning-products.test.mjs`.

Sector studios are reached from their contract links and share the existing procedural office builder. The catalogue and in-game picker support search and pagination. Generic desk chairs sit directly behind the desk, the visible computer identifies the training station, and the contract panel seats the player using the existing typing pose while it is open in an office.
