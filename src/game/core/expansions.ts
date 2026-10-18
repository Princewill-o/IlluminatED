export const EXPANSIONS = {
  "autumn-makers": {
    character: "Ollie the Makerspace Owl",
    symbol: "🦉",
    badge: "Autumn Maker",
    story:
      "Ollie is organising a community repair café. Use evidence, budgets and teamwork to help the neighbourhood.",
    questions: [
      {
        prompt:
          "A repair café has 90 Clout. Parts cost 24 and equipment costs 36. What remains?",
        options: ["30 Clout", "60 Clout", "54 Clout"],
        answer: 0,
        explain: "90 − 24 − 36 = 30 Clout.",
      },
      {
        prompt:
          "Which source should you check before forwarding a dramatic news claim?",
        options: [
          "Only its number of likes",
          "The original evidence and independent reliable reporting",
          "The most dramatic comment",
        ],
        answer: 1,
        explain:
          "Look for the original evidence, dates and corroboration rather than popularity.",
      },
      {
        prompt: "Why repair an item when it is safe and practical to do so?",
        options: [
          "Repairs always cost nothing",
          "All repairs remove every hazard",
          "It can extend useful life and reduce waste",
        ],
        answer: 2,
        explain:
          "Repair can reduce waste, but cost, safety and suitability still matter.",
      },
    ],
  },
  "neon-pioneers": {
    character: "Nova the City Fox",
    symbol: "🦊",
    badge: "Neon Pioneer",
    story:
      "Nova is planning a community makerspace. Help her make sensible decisions before the expedition begins.",
    questions: [
      {
        prompt: "Why spread an investment across several different businesses?",
        options: [
          "To reduce dependence on one business",
          "To guarantee a profit",
          "To remove every risk",
        ],
        answer: 0,
        explain:
          "Diversification spreads exposure. It cannot guarantee a return or remove all risk.",
      },
      {
        prompt:
          "A project costs 800 Clout. You have 650. How much more do you need?",
        options: ["250", "150", "50"],
        answer: 1,
        explain: "800 − 650 = 150 Clout.",
      },
      {
        prompt: "Which claim is a warning sign?",
        options: [
          "The value can fall",
          "Read the fees first",
          "Guaranteed huge returns with no risk",
        ],
        answer: 2,
        explain:
          "Promises of large guaranteed returns with no risk deserve scepticism.",
      },
    ],
  },
  "ocean-futures": {
    character: "Coral the Reef Guardian",
    symbol: "🐙",
    badge: "Reef Explorer",
    story:
      "Coral is investigating how a coastal town can protect its marine environment. Join the research crew.",
    questions: [
      {
        prompt: "What can excess fertiliser entering a river cause?",
        options: ["Eutrophication", "A solar eclipse", "Tectonic movement"],
        answer: 0,
        explain:
          "Nutrients can cause algal blooms; decomposition can then reduce dissolved oxygen.",
      },
      {
        prompt:
          "Which evidence best supports a claim that beach litter decreased?",
        options: [
          "One photograph",
          "Repeated counts using the same method",
          "A popular social post",
        ],
        answer: 1,
        explain:
          "Consistent sampling over time is more useful than a single observation.",
      },
      {
        prompt:
          "A team collects 12 kg of litter on each of 4 days. Total collected?",
        options: ["16 kg", "3 kg", "48 kg"],
        answer: 2,
        explain: "12 × 4 = 48 kg.",
      },
    ],
  },
} as const;
