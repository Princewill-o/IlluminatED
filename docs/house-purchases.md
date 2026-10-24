# Buying houses

Players can open **Game phone → Houses** while exploring. The catalogue shows
the free starter studio and the terrace (2,500 Clout), loft (8,000), cottage
(12,000) and penthouse (22,000). Paid purchases have an explicit price/balance
confirmation. Owned homes can be selected again without another charge.

Buying saves ownership and the current home through the existing authenticated
`home_buy` database function. Its server-side prices, membership/funds checks and
row lock remain authoritative. The server action returns the saved house and
fresh wallet balance; a failed follow-up balance read does not misreport a saved
purchase as a failure. The world immediately uses the chosen house style while
the refreshed server snapshot arrives.

The catalogue pauses movement. Closing it returns to the same scene and position.
After a successful purchase/move, **Enter your home** is optional. The game menu
is not opened. House furnishing remains available through Build & buy at home.

No schema or permission changes are needed: the five home types and protected
purchase function were verified on the existing database. Offline showcase
players can inspect the catalogue; persistent purchases require a real signed-in
eligible account and sufficient in-game Clout.

Verification:

- `node --test tests/home-purchases.test.mjs tests/homes-living.test.mjs` — 10 checks.
- `tests/home-purchases-database.sql` — all house prices, saved ownership, free
  moves, duplicate-charge protection, insufficient funds and anonymous denial.
  Executed against a designated test account in a rollback-only transaction.
- Browser: phone entry, catalogue prices, ownership, affordability and returning
  to the city inspected in the offline showcase.
