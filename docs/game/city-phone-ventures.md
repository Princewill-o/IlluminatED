# City phone, friends, businesses and workplaces

The City Phone is available from the bottom-right handset button in the world.
Its home screen has searchable apps and a dock. Messages contains accepted player
friends, pending requests and saved city-character contacts. Player messages retain
the existing encryption, report and block flows. NPC conversations use explicitly
labelled scripted topics.

Walk within 64 world pixels (two tiles) of a named resident or another player to
open **Say hello**. The phone's Nearby app also lists people in this range. NPC
identities derive from the map and walking route, rather than their index in a
variable rendering budget. Contacts save to the signed-in account. City-character
contacts have a separate limit of 30. Players still have to accept friend requests.

The phone's **Venture** app takes you to Venture Yard. The district entrance and
map marker are on the Wharf Gallery building, now labelled Venture Yard. The café,
studio and workshop each have a different floor area, furniture and named NPC.
Walk to a desk to open the business ledger. `/games/venture` also opens the ledger
without entering the 3D world. Starting a business, hiring, upgrading and fulfilling
orders save through a database transaction. Profit is marked on the server; a
revision check prevents duplicate order submissions. Players receive 200 venture
credits, can complete 20 orders a UK day, and can hire three NPC teammates.
Venture credits cannot become Clout or real money.

For pizza delivery, visit Pizzazz reception and get the existing pizza job. At a
work counter choose **Start a pizza delivery route**. The uniform appears while
on duty. Collect the stack outside the shop and complete its dispatch task, then
walk to four named customers on the street. A pizza box is visible while carrying
orders. Each customer has a ticket task; the existing signed career session marks
answers and pays Clout when the player clocks out. Closing the shift restores the
normal outfit. Visiting an interior pauses the route without losing its progress.

Workplace and employer office geometry now varies by identity and sector. Floor
palettes, partitions, desks, rooms and sector props differ; routes to reception,
terminals, advice desks and exits remain walkable. Pizzazz has pizza ovens and
prep/dispatch counters; the supermarket has stocking aisles.

## Database

`20261022021017_city_contacts_and_ventures.sql` installs the two account-scoped
RLS tables and authenticated RPCs. It has been applied to the connected
IlluminatED project. Mutation functions live in the private schema; public
wrappers are security invoker functions. Anonymous execution is revoked.

## Checks

- `npm run typecheck`
- `node --test tests/city-phone-ventures.test.mjs tests/workplace-learning.test.mjs tests/map-guide.test.mjs`
- `node --test tests/game-core.test.mjs tests/world-presentation.test.mjs tests/city-life-extensions.test.mjs tests/room-chat.test.mjs tests/city-identity-crypto.test.mjs`
- Rollback-only database checks cover initial funds, incorrect answers, correct
  profit, replay protection, hiring, upgrades, duplicate contacts and cross-account
  isolation. No sample business or NPC contacts are retained from these checks.

Browser automation is disabled in this desktop session. A manual 3D walkthrough
on mobile and desktop remains useful for assessing presentation and animations.
