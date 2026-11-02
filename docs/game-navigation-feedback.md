# In-game routes and feedback

Mark a destination on the full map, then choose **Follow pink route in game**. The same waypoint flows through `WorldApp` to `useNavigation`, `WorldView` and the live Three.js scene. The minimap shows the remaining pink polyline and route distance. Clearing the map pin or changing areas removes the trail. Walking to its accessible endpoint clears the waypoint and announces arrival.

Walking paths reuse the collision-grid route used by the map; driving paths reuse the existing road planner. The road route stops at nearby road access. When the door is further away, a parking notification instructs the player to get out; the trail then recalculates on foot. Routes do not bypass collisions or move the player automatically. Unreachable destinations produce a message instead of a direct line through obstacles. Routes remain local navigation aids and never award progress or currency.

Position is sampled every 900 ms, updating only when the player's tile changes. Moving along the route trims travelled points; leaving the route rebuilds it. Long straight road segments are subdivided so the pink ribbon follows the world's curvature shader. Only the nearest 180 points need ground geometry; the full route stays in navigation state. Animated chevrons point forwards, and an arrival ring marks the accessible endpoint. Reduced motion stops scrolling and pulsing. Replaced route geometry and textures are disposed.

The bell opens up to twenty in-game notifications for the current visit. This is not an OS/web-push subscription. Mission starts, reviews, results, first rewards, marked destinations and arrivals have contextual updates. Quest and checkpoint scenes are animated game vignettes featuring the existing player sprite, not prerecorded video or new 3D assets. They auto-finish after 5.4 seconds, support Escape and a visible skip button, and have an optional saved disable preference. Notifications and controls have explicit colours or theme tokens for light and dark modes.

Run the route, Three.js ribbon and feedback checks:

```text
node --test tests/navigation.test.mjs tests/map-guide.test.mjs tests/game-feedback.test.mjs
```

Visual browser QA remains necessary on target devices. Local browser automation was disabled in Work settings during this change, so validation used production compilation, UI-control tests, Three.js geometry tests and rolled-back database checks.
