import type { Topic } from "@/lib/types";

const R = "2026-09-30";
const V = "1.0";

export const GCSE_TOPICS_A: Topic[] = [
  {
    id: "gcse-maths-percentages",
    courseId: "gcse-maths",
    title: "Percentages and percentage change",
    summary:
      "Find percentages of amounts, increase and decrease by a percentage, and work out percentage change.",
    objectives: [
      "Find a percentage of an amount with and without a calculator",
      "Use multipliers for percentage increase and decrease",
      "Calculate percentage change and reverse percentages",
    ],
    explanation: [
      "Per cent means 'out of 100'. 35% is 35/100 = 0.35. Converting percentages to decimals lets you use a single multiplication.",
      "Without a calculator, build from easy pieces: 10% is ÷10, 5% is half of 10%, 1% is ÷100. For example 15% of 80 = 10% (8) + 5% (4) = 12.",
      "A multiplier combines the original amount and the change. An increase of 12% means you keep 100% and add 12%, so multiply by 1.12. A decrease of 12% leaves 88%, so multiply by 0.88.",
      "Percentage change = (change ÷ original) × 100. Always divide by the original value, not the new one.",
      "Reverse percentages work backwards from the new value: if a price after a 20% increase is £60, then 1.2 × original = 60, so original = 60 ÷ 1.2 = £50.",
    ],
    workedExample: {
      question:
        "A jacket costs £64. In a sale it is reduced by 15%. What is the sale price?",
      steps: [
        "A 15% decrease leaves 85% of the price.",
        "Multiplier = 0.85.",
        "£64 × 0.85 = £54.40.",
      ],
      answer: "£54.40",
    },
    keyTerms: [
      {
        term: "Multiplier",
        definition:
          "The decimal you multiply by to apply a percentage change in one step, e.g. 1.05 for a 5% increase.",
      },
      {
        term: "Percentage change",
        definition: "(Change ÷ original value) × 100.",
      },
      {
        term: "Reverse percentage",
        definition:
          "Finding the original amount when you know the value after a percentage change.",
      },
      {
        term: "Compound interest",
        definition:
          "Interest calculated on the original amount plus interest already added; use multiplier to the power of the number of periods.",
      },
    ],
    misconceptions: [
      {
        wrong: "To undo a 20% increase, take off 20% of the new price.",
        right:
          "Divide by the multiplier (1.2). Taking 20% of the new, larger price removes too much.",
      },
      {
        wrong: "Percentage change divides by the new value.",
        right: "Always divide the change by the original value.",
      },
    ],
    retrieval: [
      { q: "What multiplier gives a 7% decrease?", a: "0.93" },
      { q: "What is 15% of 80?", a: "12" },
      {
        q: "A value rises from 40 to 50. What is the percentage increase?",
        a: "10 ÷ 40 × 100 = 25%",
      },
    ],
    quiz: [
      {
        id: "pc1",
        q: "What is 15% of 80?",
        options: ["8", "12", "15", "20"],
        answer: 1,
        explain: "10% of 80 is 8 and 5% is 4, so 15% is 12.",
      },
      {
        id: "pc2",
        q: "Which multiplier increases an amount by 3.5%?",
        options: ["0.965", "1.35", "1.035", "3.5"],
        answer: 2,
        explain: "100% + 3.5% = 103.5% = 1.035.",
      },
      {
        id: "pc3",
        q: "After a 25% increase a ticket costs £30. What was the original price?",
        options: ["£22.50", "£24", "£25", "£37.50"],
        answer: 1,
        explain: "Original × 1.25 = 30, so original = 30 ÷ 1.25 = £24.",
      },
      {
        id: "pc4",
        q: "A car's value falls from £12,000 to £9,000. What is the percentage decrease?",
        options: ["25%", "33.3%", "30%", "75%"],
        answer: 0,
        explain: "Change £3,000 ÷ original £12,000 × 100 = 25%.",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "gcse-maths-linear-equations",
    courseId: "gcse-maths",
    title: "Solving linear equations",
    summary:
      "Solve equations with unknowns on one or both sides, including brackets and fractions.",
    objectives: [
      "Use inverse operations to solve one- and two-step equations",
      "Solve equations with unknowns on both sides and with brackets",
      "Form and solve an equation from a word problem",
    ],
    explanation: [
      "An equation is balanced: whatever you do to one side you must do to the other. The aim is to get the unknown on its own.",
      "Undo operations in reverse order. For 3x + 5 = 20, subtract 5 first (3x = 15), then divide by 3 (x = 5).",
      "With unknowns on both sides, collect the unknowns on the side with the larger coefficient to avoid negatives, then solve as normal.",
      "Expand brackets first, or divide both sides by the number outside the bracket when that gives whole numbers.",
      "Check your answer by substituting it back into the original equation.",
    ],
    workedExample: {
      question: "Solve 5x − 4 = 2x + 11.",
      steps: [
        "Subtract 2x from both sides: 3x − 4 = 11.",
        "Add 4 to both sides: 3x = 15.",
        "Divide by 3: x = 5.",
        "Check: 5(5) − 4 = 21 and 2(5) + 11 = 21 ✓",
      ],
      answer: "x = 5",
    },
    keyTerms: [
      {
        term: "Equation",
        definition:
          "A statement that two expressions are equal, which is true only for particular value(s) of the unknown.",
      },
      {
        term: "Inverse operation",
        definition:
          "The operation that undoes another, e.g. subtraction undoes addition.",
      },
      {
        term: "Coefficient",
        definition: "The number multiplying a variable, e.g. 3 in 3x.",
      },
      {
        term: "Expand",
        definition: "Multiply out brackets, e.g. 2(x + 3) = 2x + 6.",
      },
    ],
    misconceptions: [
      {
        wrong: "2(x + 3) = 2x + 3",
        right: "Multiply every term inside: 2(x + 3) = 2x + 6.",
      },
      {
        wrong: "If 4x = 12 then x = 12 − 4.",
        right: "4x means 4 × x, so divide: x = 3.",
      },
    ],
    retrieval: [
      { q: "Solve 2x + 7 = 19.", a: "x = 6" },
      { q: "Solve 3(x − 2) = 15.", a: "x = 7" },
      {
        q: "What should you do first to solve 7x + 1 = 4x + 13?",
        a: "Subtract 4x from both sides (gives 3x + 1 = 13).",
      },
    ],
    quiz: [
      {
        id: "le1",
        q: "Solve 4x − 3 = 21.",
        options: ["x = 4.5", "x = 6", "x = 7", "x = 24"],
        answer: 1,
        explain: "Add 3: 4x = 24. Divide by 4: x = 6.",
      },
      {
        id: "le2",
        q: "Solve 6x + 2 = 2x + 18.",
        options: ["x = 2", "x = 4", "x = 5", "x = 16"],
        answer: 1,
        explain: "Subtract 2x: 4x + 2 = 18. Subtract 2: 4x = 16, so x = 4.",
      },
      {
        id: "le3",
        q: "Solve (x + 5) ÷ 3 = 4.",
        options: ["x = 7", "x = 12", "x = 17", "x = −1"],
        answer: 0,
        explain: "Multiply by 3: x + 5 = 12, so x = 7.",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "gcse-englang-language-analysis",
    courseId: "gcse-english-language",
    title: "Analysing language",
    summary:
      "Explain how writers use words, phrases and techniques to create effects on the reader.",
    objectives: [
      "Select short, precise quotations",
      "Identify language features using accurate terminology",
      "Explain the effect of language choices on the reader",
    ],
    explanation: [
      "Examiners reward explanation of effect more than spotting techniques. Naming a metaphor earns little unless you explain what it suggests and why the writer chose it.",
      "Use short quotations, often a single word or phrase, and zoom in on connotations: what ideas, feelings or images does the word bring to mind?",
      "A useful structure is: point about the writer's method → embedded quotation → explanation of effect → link to the writer's wider purpose.",
      "Consider word classes too: a verb can show how something moves or acts, adjectives can build atmosphere, and adverbs can reveal attitude.",
    ],
    workedExample: {
      question:
        "Analyse: 'The wind clawed at the windows, desperate to get in.'",
      steps: [
        "Method: personification. The wind is given animal-like, human-like intent.",
        "Zoom in: 'clawed' suggests sharp, violent, animal movement.",
        "Effect: the weather feels threatening and alive; 'desperate' adds urgency and makes the house feel under attack.",
        "Purpose: builds tension and a sense of danger for the reader.",
      ],
      answer:
        "A strong answer links the verb 'clawed' and the adjective 'desperate' to a mood of threat and tension.",
    },
    keyTerms: [
      {
        term: "Connotation",
        definition:
          "An idea or feeling a word suggests beyond its literal meaning.",
      },
      {
        term: "Personification",
        definition: "Giving human qualities to something non-human.",
      },
      {
        term: "Semantic field",
        definition:
          "A group of words linked by a common topic, e.g. words linked to war.",
      },
      {
        term: "Embedded quotation",
        definition: "A short quotation woven into your own sentence.",
      },
    ],
    misconceptions: [
      {
        wrong: "'This makes the reader want to read on' is a good explanation.",
        right:
          "Be specific: say what the reader feels or imagines, and why that word creates it.",
      },
      {
        wrong: "Long quotations show more evidence.",
        right:
          "Short, precise quotations let you analyse individual word choices.",
      },
    ],
    retrieval: [
      {
        q: "What is a connotation?",
        a: "An idea or feeling associated with a word beyond its literal meaning.",
      },
      {
        q: "Name the four parts of a strong analytical paragraph.",
        a: "Method, quotation, effect, link to purpose.",
      },
      {
        q: "Why is naming a technique not enough?",
        a: "Marks are for explaining the effect of the choice, not labelling it.",
      },
    ],
    quiz: [
      {
        id: "la1",
        q: "Which quotation length is usually best for language analysis?",
        options: [
          "A whole paragraph",
          "Several sentences",
          "A short word or phrase",
          "No quotation",
        ],
        answer: 2,
        explain: "Short quotations let you zoom in on individual word choices.",
      },
      {
        id: "la2",
        q: "'The classroom was a zoo.' What technique is this?",
        options: ["Simile", "Metaphor", "Onomatopoeia", "Alliteration"],
        answer: 1,
        explain:
          "It says the classroom *is* a zoo, rather than *like* one, so it is a metaphor.",
      },
      {
        id: "la3",
        q: "Which is the strongest comment on effect?",
        options: [
          "It uses a verb.",
          "It makes it interesting.",
          "'Clawed' suggests violent, animal-like force, making the storm feel threatening.",
          "It is descriptive.",
        ],
        answer: 2,
        explain:
          "It explains the connotation and links it to the reader's response.",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "gcse-englit-essay-writing",
    courseId: "gcse-english-literature",
    title: "Writing a literature essay",
    summary:
      "Plan and write a clear, analytical essay on a set text in timed conditions.",
    objectives: [
      "Build an argument that answers the exact question",
      "Use well-chosen references to the text",
      "Weave in context where it deepens the argument",
    ],
    explanation: [
      "Start with a thesis: one or two sentences that answer the question directly. Each paragraph should then develop one part of that argument.",
      "Use references you know well. Short memorised quotations are more flexible than long ones, and close references (describing a moment precisely) also count as evidence.",
      "Analyse the writer's methods (language, structure and form) and explain how they shape meaning. Write about the writer as someone making deliberate choices.",
      "Context is strongest when it explains why a writer might present an idea in a certain way, rather than as a separate history paragraph.",
      "Spend a few minutes planning. A quick plan helps you stay focused and cover the whole text, not just the extract.",
    ],
    keyTerms: [
      {
        term: "Thesis",
        definition: "Your overall argument in answer to the question.",
      },
      {
        term: "Context",
        definition:
          "Historical, social or literary background that helps explain a text's ideas.",
      },
      {
        term: "Form",
        definition:
          "The type of text, e.g. play, novel, sonnet, and how that shapes meaning.",
      },
      {
        term: "Structure",
        definition:
          "How a text is organised and ordered, and the effect of that order.",
      },
    ],
    misconceptions: [
      {
        wrong: "Retelling the plot shows good knowledge.",
        right:
          "Only use plot to support an analytical point that answers the question.",
      },
      {
        wrong: "Context should be a separate paragraph.",
        right: "Integrate context where it explains the writer's choices.",
      },
    ],
    retrieval: [
      {
        q: "What is a thesis statement?",
        a: "A direct, arguable answer to the essay question.",
      },
      {
        q: "Name the three kinds of writer's methods.",
        a: "Language, structure and form.",
      },
      {
        q: "When is context most useful?",
        a: "When it helps explain why the writer presents ideas in a particular way.",
      },
    ],
    quiz: [
      {
        id: "ee1",
        q: "What should the opening of a literature essay do?",
        options: [
          "Summarise the plot",
          "Give the author's biography",
          "Answer the question with a clear argument",
          "List every technique",
        ],
        answer: 2,
        explain:
          "A clear thesis tells the examiner your argument from the start.",
      },
      {
        id: "ee2",
        q: "Which is the best use of context?",
        options: [
          "A paragraph on Victorian history",
          "Linking a writer's portrayal of poverty to attitudes of the time",
          "Stating the year the text was published",
          "Ignoring it",
        ],
        answer: 1,
        explain:
          "Context should explain the writer's choices and the text's ideas.",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "gcse-bio-cells",
    courseId: "gcse-biology",
    title: "Cell structure",
    summary:
      "Compare animal, plant and bacterial cells and the jobs of their parts.",
    objectives: [
      "Name the main structures in animal and plant cells and state their functions",
      "Compare eukaryotic and prokaryotic cells",
      "Use magnification = image size ÷ actual size",
    ],
    explanation: [
      "Animal and plant cells are eukaryotic: their genetic material is enclosed in a nucleus. Both have a nucleus, cytoplasm, cell membrane, mitochondria and ribosomes.",
      "Plant cells also usually have a cellulose cell wall for support, chloroplasts for photosynthesis and a permanent vacuole containing cell sap.",
      "Bacterial cells are prokaryotic. They are much smaller, have no nucleus (their DNA is a single loop in the cytoplasm) and may contain small rings of DNA called plasmids.",
      "Magnification = image size ÷ actual size. Convert units first so both sizes use the same unit (1 mm = 1000 µm).",
    ],
    workedExample: {
      question:
        "A cell drawing is 40 mm long. The real cell is 0.08 mm long. What is the magnification?",
      steps: ["Magnification = image ÷ actual.", "40 ÷ 0.08 = 500."],
      answer: "×500",
    },
    keyTerms: [
      {
        term: "Nucleus",
        definition:
          "Contains genetic material and controls the activities of the cell.",
      },
      {
        term: "Mitochondria",
        definition:
          "Where most aerobic respiration reactions take place, releasing energy.",
      },
      { term: "Ribosome", definition: "Site of protein synthesis." },
      {
        term: "Chloroplast",
        definition: "Contains chlorophyll; where photosynthesis takes place.",
      },
      {
        term: "Plasmid",
        definition: "A small ring of DNA found in many bacterial cells.",
      },
    ],
    misconceptions: [
      {
        wrong: "Mitochondria make energy.",
        right:
          "Energy cannot be made. Respiration in mitochondria releases energy stored in glucose.",
      },
      {
        wrong: "All plant cells have chloroplasts.",
        right:
          "Cells not exposed to light, such as root hair cells, do not have chloroplasts.",
      },
    ],
    retrieval: [
      {
        q: "Name three structures found in plant cells but not animal cells.",
        a: "Cell wall, chloroplasts, permanent vacuole.",
      },
      {
        q: "Where is the DNA in a bacterial cell?",
        a: "A single loop in the cytoplasm, plus plasmids.",
      },
      {
        q: "Write the magnification equation.",
        a: "Magnification = image size ÷ actual size.",
      },
    ],
    quiz: [
      {
        id: "ce1",
        q: "Which structure controls the activities of a eukaryotic cell?",
        options: ["Cell wall", "Nucleus", "Cytoplasm", "Ribosome"],
        answer: 1,
        explain:
          "The nucleus contains the genetic material that controls cell activities.",
      },
      {
        id: "ce2",
        q: "Which is found in bacterial cells but not in animal cells?",
        options: ["Ribosomes", "Cell membrane", "Plasmids", "Cytoplasm"],
        answer: 2,
        explain: "Plasmids are small rings of DNA found in bacteria.",
      },
      {
        id: "ce3",
        q: "Where does protein synthesis take place?",
        options: ["Ribosomes", "Mitochondria", "Vacuole", "Cell wall"],
        answer: 0,
        explain: "Ribosomes join amino acids to make proteins.",
      },
      {
        id: "ce4",
        q: "An image is 25 mm and the real object is 0.05 mm. Magnification?",
        options: ["×50", "×125", "×500", "×1250"],
        answer: 2,
        explain: "25 ÷ 0.05 = 500.",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "gcse-bio-enzymes",
    courseId: "gcse-biology",
    title: "Enzymes",
    summary: "How enzymes speed up reactions and what affects their activity.",
    objectives: [
      "Describe enzymes as biological catalysts",
      "Explain enzyme action using the lock and key model",
      "Explain the effect of temperature and pH on enzyme activity",
    ],
    explanation: [
      "Enzymes are proteins that act as biological catalysts: they speed up reactions without being used up.",
      "Each enzyme has an active site with a specific shape. Only a substrate with a complementary shape fits, forming an enzyme–substrate complex. This is the lock and key model.",
      "As temperature rises, particles move faster and collide more often, so the rate increases up to an optimum. Above the optimum, bonds holding the enzyme's shape break, the active site changes shape and the enzyme is denatured.",
      "Each enzyme also has an optimum pH. Moving too far from it can change the active site's shape and denature the enzyme.",
    ],
    keyTerms: [
      {
        term: "Catalyst",
        definition:
          "A substance that speeds up a reaction without being used up.",
      },
      {
        term: "Active site",
        definition: "The region of an enzyme where the substrate binds.",
      },
      { term: "Substrate", definition: "The molecule an enzyme acts on." },
      {
        term: "Denatured",
        definition:
          "Permanently changed in shape so the active site no longer fits the substrate.",
      },
    ],
    misconceptions: [
      {
        wrong: "High temperatures kill enzymes.",
        right:
          "Enzymes are molecules, not living things. They are denatured, not killed.",
      },
      {
        wrong: "Low temperatures denature enzymes.",
        right:
          "Low temperatures slow reactions because of fewer collisions, but the active site is not permanently changed.",
      },
    ],
    retrieval: [
      { q: "What type of molecule is an enzyme?", a: "A protein." },
      {
        q: "What happens to the active site when an enzyme is denatured?",
        a: "It changes shape so the substrate no longer fits.",
      },
      {
        q: "Name the model that explains enzyme specificity.",
        a: "The lock and key model.",
      },
    ],
    quiz: [
      {
        id: "en1",
        q: "What happens to an enzyme above its optimum temperature?",
        options: [
          "It is killed",
          "It becomes denatured",
          "It works faster forever",
          "It turns into a substrate",
        ],
        answer: 1,
        explain:
          "Bonds break, the active site changes shape and the enzyme is denatured.",
      },
      {
        id: "en2",
        q: "Why is each enzyme specific to one substrate?",
        options: [
          "Enzymes are large",
          "The active site has a complementary shape",
          "Enzymes are made of fat",
          "Substrates are catalysts",
        ],
        answer: 1,
        explain: "Only a substrate that fits the active site's shape can bind.",
      },
    ],
    reviewed: R,
    version: V,
  },
];
