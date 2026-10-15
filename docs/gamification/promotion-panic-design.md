# Promotion Panic: game design

The flagship game of **IlluminatED City**. This is the source of truth for how the game works: if the code and this doc disagree, fix one of them.

## 1. Pitch
> **Intern to CEO in one shift.** Pick a (totally made-up) company, answer real revision questions against the clock, get promoted before your three strikes run out, then dress your character in what you earned and dare your mates to beat you.

The game borrows from three proven formats:

| Inspiration | What we take | What we avoid |
|---|---|---|
| **Mathletics** | Fast timed rounds, points per correct answer, credits spent on an avatar, weekly certificates | Leaderboards that publicly rank under-18s by default |
| **MovieStarPlanet** | Big-head "chibi" characters, a huge wardrobe, rarity, showing off your look | Open chat, dating/"boyfriend" culture, paid-only status items |
| **Education City** | A city map where every building is a different activity | Childish tone. Our audience is 13–19, so the humour is office satire |

Research notes: children use avatars both to look like themselves (eye colour, hairstyle) and to try bold alter-egos. Matching friends builds group identity, and rare items signal status. So we offer a lot of realistic options **and** a lot of silly ones, earned by playing, never bought with real money.

## 2. Core loop (one shift, ~2–3 minutes)
1. **Clock in** at a company. The boss sends a welcome email.
2. **12 tasks.** Each is a multiple-choice revision question with a timer (10–30 s, scaled to reading length).
3. **Score** = (100 + up to 100 for speed) × streak multiplier (×1, then ×2 from 3 in a row, ×3 from 6, ×4 from 9).
4. **Climb the ladder:** Intern 0 → Junior Assistant 200 → Assistant Manager 600 → Manager 1,200 → Director 2,000 → Vice President 2,900 → **CEO 3,900** → Galactic Overlord 5,200. Each promotion gets a pop-up with a silly perk.
5. **Three strikes** (wrong or timed out) and you're **FIRED**. The shift ends, but rewards still pay out.
6. **Power-ups**, one of each per shift: ☕ Coffee Break (+10 s), 🙈 Blame the Intern (skip, no strike, streak kept), 🦁 Ask Tiggy (remove two wrong answers).
7. **Performance review:** your rank, score, accuracy, best streak and rewards, plus **revision notes** for every question you missed. Missed questions always show the right answer and explanation before moving on.

## 3. Meta loop (days and weeks)
- **XP → Level.** Total XP for level *n* = 50·n·(n−1). Level titles: Fresh Starter, Hard Worker, Rising Star, Big Deal, Industry Icon, Living Legend.
- **Clout** (coins) = 10 per correct answer + 15 per rank reached, doubled on the first shift of the day (**Daily Grind**).
- **Streak:** play any day to keep it. Day 7 unlocks Tiggy ears and day 14 unlocks the Lion head.
- **Company collection:** become CEO at all 13 companies. Each first CEO unlocks that company's signature item.
- **Challenges:** share a link and your friend plays the identical seeded shift. The challenge card shows how many tried and how many beat you.
- **Anti-grind:** rewards stop after 40 shifts a day, the server rejects impossible scores, and saves are limited to one every 20 seconds.

## 4. Content
Each company maps to real courses (by course id). A shift mixes:
- **Bank questions** from the existing IlluminatED question bank
- **Key-term questions** ("Which key term means…?") from flashcards
- **Generated questions** (endless and always correct): binary/denary/hex, data units, percentages, percentage change, compound interest, ratio, times tables, best buys, profit margin, magnification, µm conversion, speed, Ohm's law, power, weight, density, Mr, moles, area, volume, perimeter, scale, pace, homophones

Content narrows to the learner's own courses when there's enough of it. Challenges always use the full company deck so both players get identical tasks.

## 5. The cast

### Player character: full-body chibi
Head about 40% of height, big expressive eyes, rounded shapes, a dark outline ("sticker" look), flat colours, no gradients. Gender-neutral: every item is available to everyone.

### Character categories (15)
| Group | Category | Count | Notes |
|---|---|---|---|
| **Body** | Skin tone | 8 | All free |
| | Head | 6 | Human (free); Dog and Cow (Epic, buy); Robot and Alien (Legendary, buy); Lion (unlock: 14-day streak) |
| **Face** | Eyes | 6 | Round, Sparkle, Sleepy, Wink, Focused, Dots |
| | Brows | 5 | Soft, Bold, Raised, Fierce, None |
| | Mouth | 6 | Smile, Grin, Laugh, Smirk, Cheeky (tongue), Small |
| | Face extras | 6 | None, Freckles, Rosy cheeks, Star sticker, Plaster, Face paint |
| **Hair** | Style | 13 | Short, Curly, Long, Bob, Ponytail, Space buns, Buzz, Quiff, Braids, Afro, Anime spikes, Mohawk, Bald |
| | Colour | 10 | Black, Brown, Blonde, Ginger, Auburn (free); Purple, Blue, Pink, Green, Silver (buy) |
| **Clothes** | Top | 15 | |
| | Bottoms | 7 | |
| | Shoes | 7 | |
| **Accessories** | Hat | 13 | |
| | Eyewear | 6 | |
| | In hand | 9 | |
| **Companion** | Desk pet | 10 | |

### Rarity
Shown with a label **and** a shape, never colour alone.

| Tier | Mark | How you get it | Typical price |
|---|---|---|---|
| Common | ● | Free or cheap | 0–150 |
| Rare | ◆ | Shop | 200–450 |
| Epic | ★ | Shop or unlock | 500–1,500 |
| Legendary | 👑 | Expensive or a hard unlock | 2,000+ or CEO/streak/level |

### Sets (shown in the Locker with "x of y owned")
Office Hero · Space Cadet · Sporty · Bake Off · Party Animal · Royalty · plus one **company uniform** per company (its CEO-unlock signature item).

### Bosses (NPCs)
Every company has a boss drawn with the same character system, so the world feels consistent. Bosses react on screen: happy when you're right, cross when you're wrong.

| Company | Boss | Look |
|---|---|---|
| Goggle | Gigi Byte, Chief Vibes Officer | VR visor, purple hair, hoodie |
| Macrosoft | Kevin From IT | Round glasses, coffee, polo |
| Barklays | Sir Woofington III | Dog head, crown, power suit |
| Tescow | Daisy, Regional Manager (Dairy) | Cow head, apron |
| St Plaster's | Dr Ow | Lab coat, plaster on cheek |
| Tesler Motors | Volt Ramirez | Hard hat, mohawk, hi-vis |
| Gregz | Pastry Pete | Chef hat, apron, croissant |
| Lawz & Order | Judge Mental | Monocle, tux, fierce brows |
| Netflics | Binge McWatch | Shades, hoodie, sleepy eyes |
| Bodge & Sons | Big Sue | Hard hat, hi-vis, bold brows |
| Psyke Sports | Coach Sweats | Cap, tracksuit, whistle grin |
| Tiny Humans | Miss Crayola | Party hat, star sticker, apron |
| Atlas & Co. | Captain Compass | Explorer hat, cargo, compass |

Tiggy the lion (existing brand artwork) is the guide and the "Ask Tiggy" power-up.

## 6. Tone rules
- Satire is aimed at offices and bosses, **never** at the player, real people or real companies' actions.
- Parody names only, with no real logos, colours or trade dress, and a footer disclaimer.
- No romance, no alcohol, no body-shaming (no BMI, no weight jokes).
- Getting things wrong is comedic, but the explanation always follows.

## 7. Platforms
- **Web (now):** the 2D SVG characters are canonical. They're tiny, crisp, accessible and work everywhere.
- **3D city hub:** three.js via React Three Fiber, lazy-loaded only on the city page, with low-poly flat-shaded buildings built in code. It falls back to the 2D map with reduced motion, no WebGL, or low-memory devices. The same scene code runs on iOS and Android with `@react-three/fiber/native` + `expo-gl` when the Expo app is built.
- **Safety:** no chat; usernames are already public on Social; leaderboards stay opt-in (future).

## 8. Next up
1. Weekly "Employee of the Week" certificates (Bronze → Silver → Gold, like Mathletics).
2. Class leagues for teachers (opt-in, first names only).
3. Seasonal sets (Winter Arc, exam season).
4. Live Arena and Experience Sims reuse these characters and the Clout economy.
