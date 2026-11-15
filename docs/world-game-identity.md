# IllumWorld game identity

The umbrella, IllumWorld homepage, school pilot and shared product navigation now lead with the playable city-life game. The main action opens `/games/world?map=city`. Roles and completion requirements are discovered through `/world/contracts`; certificate information links to its `#certificates` section.

Each role has three shifts and takes 24 to 27 minutes at the learner's own pace. Players can open the contracts from Jobs, the game phone or the Venture Yard. The Microsoft scenarios use original exercises and link to relevant Coursera courses for further study. IlluminatED issues the certificate for completing the simulation.

The certificate route grades the three shift checks on the server. The PDF shows the Microsoft game badge and company name followed by × and the IlluminatED wordmark. Progress is saved on the player's device. The certificate records completion in the game, including the player name entered for that activity.

Company names in the world use the real names where there is a clear match. Save IDs and workspace URLs remain stable. The forward wardrobe migration updates item names while keeping their IDs and unlock requirements.

The former repair-trainee activity is no longer promoted on these public entry pages. Existing saved-project and repair routes are preserved for compatibility; shared navigation still provides access to saved class projects. Removing the feature from the homepage must not delete learner work or rewrite historic awarded project records.

The Maths, Science and English pages offer a year selector, short original practice and links into the existing lesson catalogue. English has Language and Literature views of the same feed. Science separates Combined Science, Biology, Chemistry and Physics at GCSE. Each subject is accessible independently of the game.

Screenshots from the playable game are served from `/landing/world-current-square.jpg` and `/landing/world-current-workplace.jpg`.

Run the focused checks with `node --test tests/world-game-identity.test.mjs tests/role-contracts.test.mjs tests/secondary-subjects.test.mjs tests/learning-products.test.mjs`.
