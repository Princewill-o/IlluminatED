# Landing-page game captures

Captured on 17 October 2026 from the current React game components at commit d84a247, at 1440 × 960, using a local demonstration character and daylight lighting (`?time=day`). These are browser captures, not generated illustrations.

- `game-london.webp`: World3D, London map, default character and LifeHud.
- `game-home.webp`: World3D, furnished starter home and LifeHud.
- `game-highlands.webp`: World3D, Glen Lorne and LifeHud.
- `game-bus.webp`: Commute revision quiz over the London scene.
- `game-hub.webp`: GamesHub selection screen.
- `game-connect-four.webp`: GamesHub, Connect Four after several player and computer moves.

The local staging view used a compact navigation bar to select the scenes and fictional tasks/Clout. It did not access student accounts or write to the production database. The staging route was removed after capture. The page explicitly identifies the demonstration character.

All images are WebP at quality 88. The landing page supplies responsive image sizes and descriptive alternative text. Only the hero loads eagerly.

## City life refresh

The landing page now uses `game-city-life.webp`, `game-home-framed.webp`, `game-lobby.webp` and `game-phone.webp`, captured after the camera, CPU population and Study Quarter changes. Capture controls were hidden for export. The shared lobby is an actual visitable map populated by CPU residents, not a fabricated multiplayer session. The home remains private with no ambient residents. Decorative photo frames and labels are implemented in the landing-page UI, not painted over the gameplay.
