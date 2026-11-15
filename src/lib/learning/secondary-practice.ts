import type { PackQuestion, SubjectProduct } from "./packs";
import type { SecondaryYear } from "./secondary-curriculum";

type Warmup = {
  id: string;
  product: SubjectProduct;
  year: SecondaryYear;
  title: string;
  hint: string;
  misconception: string;
  worked: { steps: string[]; answer: string };
  questions: PackQuestion[];
  extract?: string;
  writing?: { model: string; checks: string[] };
};

const q = (
  prompt: string,
  options: string[],
  answer: number,
  explanation: string,
): PackQuestion => ({ prompt, options, answer, explanation });
type Content = Omit<Warmup, "id" | "product" | "year">;
const maths: Record<SecondaryYear, Content> = {
  7: {
    title: "Add and subtract directed numbers",
    hint: "Start at the first number on a number line. Adding moves right and subtracting moves left.",
    misconception:
      "A minus sign can describe a position below zero or tell you to subtract. Read the signs in order.",
    worked: {
      steps: [
        "Start at −4.",
        "Move seven places right to add 7.",
        "You cross zero after four moves and have three left.",
      ],
      answer: "−4 + 7 = 3",
    },
    questions: [
      q(
        "A lift starts at floor −2 and goes up five floors. Where is it?",
        ["3", "−7", "7"],
        0,
        "Moving up means adding. Start at −2 and add five to reach 3.",
      ),
      q(
        "Calculate 3 − 8.",
        ["5", "−5", "11"],
        1,
        "Move eight places left from 3. The first three reach zero and five more reach −5.",
      ),
    ],
  },
  8: {
    title: "Share amounts in a ratio",
    hint: "Add the numbers in the ratio to find how many equal parts you need to make.",
    misconception:
      "The parts must be equal before you group them. A ratio of 2:3 uses five parts, not three.",
    worked: {
      steps: [
        "For a £45 split in the ratio 2:3, add 2 + 3.",
        "Each of the five parts is £45 ÷ 5 = £9.",
        "Multiply £9 by each share.",
      ],
      answer: "£18 and £27",
    },
    questions: [
      q(
        "Split 56 in the ratio 3:4. What is the smaller share?",
        ["14", "24", "32"],
        1,
        "There are seven parts of eight. The smaller share is three parts or 24.",
      ),
      q(
        "What is 45 minutes : 1 hour in its simplest form?",
        ["45:1", "4:3", "3:4"],
        2,
        "Convert the hour to 60 minutes and divide both numbers by 15.",
      ),
    ],
  },
  9: {
    title: "Solve linear equations",
    hint: "Undo additions and multiplications in reverse order. Do the same operation to both sides.",
    misconception:
      "Do not change a sign just because a term crosses the equals sign. Balance both sides with the same operation.",
    worked: {
      steps: [
        "Write 4x + 3 = 23.",
        "Subtract 3 from both sides: 4x = 20.",
        "Divide both sides by 4, then substitute to check.",
      ],
      answer: "x = 5",
    },
    questions: [
      q(
        "Solve 3x − 4 = 11.",
        ["5", "7", "15"],
        0,
        "Add four to both sides to get 3x = 15. Divide by three.",
      ),
      q(
        "What should you do first in 2x + 9 = 21?",
        [
          "Divide only the left side by 2",
          "Subtract 9 from both sides",
          "Add 9 to the right side only",
        ],
        1,
        "Subtracting nine from both sides isolates the 2x term while preserving equality.",
      ),
    ],
  },
  10: {
    title: "Find an original price",
    hint: "Write the final amount as the original amount multiplied by the percentage that remains.",
    misconception:
      "Adding the discount percentage to the sale price uses the sale price as the base. The discount was based on the original.",
    worked: {
      steps: [
        "A 20% reduction leaves 80%, or 0.80.",
        "Write £48 = original × 0.80.",
        "Divide £48 by 0.80 and check by multiplying back.",
      ],
      answer: "£60 originally",
    },
    questions: [
      q(
        "A jacket costs £63 after a 30% reduction. What was the original price?",
        ["£81.90", "£90", "£93"],
        1,
        "Seventy per cent is left. £63 ÷ 0.70 gives £90.",
      ),
      q(
        "After a 10% rise, the total is £88. Which calculation finds the original?",
        ["88 × 0.90", "88 × 1.10", "88 ÷ 1.10"],
        2,
        "The increased amount is 1.10 times the original, so undo the multiplication by dividing.",
      ),
    ],
  },
  11: {
    title: "Factorise and solve quadratics",
    hint: "Look for two numbers whose product is the constant and whose sum is the coefficient of x.",
    misconception:
      "Factoring rewrites the expression. To find roots, set each factor equal to zero and solve it separately.",
    worked: {
      steps: [
        "For x² + 5x + 6, 2 and 3 add to 5 and multiply to 6.",
        "Write (x + 2)(x + 3) = 0.",
        "A zero product means at least one factor is zero.",
      ],
      answer: "x = −2 or x = −3",
    },
    questions: [
      q(
        "Factorise x² + 7x + 12.",
        ["(x + 3)(x + 4)", "(x + 2)(x + 6)", "(x − 3)(x − 4)"],
        0,
        "Three and four sum to seven and multiply to twelve.",
      ),
      q(
        "Solve (x − 2)(x + 6) = 0.",
        ["x = −2 or 6", "x = 2 or −6", "x = 2 only"],
        1,
        "Set x − 2 to zero and separately set x + 6 to zero.",
      ),
    ],
  },
};

const science: Record<SecondaryYear, Content> = {
  7: {
    title: "Tell an observation from an explanation",
    hint: "An observation says what was measured or seen. An explanation suggests why it happened.",
    misconception:
      "One observation can point to a possible cause, but it rarely proves the cause by itself.",
    worked: {
      steps: [
        "Two sealed cups start at the same temperature.",
        "Cup A cools by 3°C and cup B by 6°C.",
        "Record the change first. Consider insulation as a possible reason only if other conditions were controlled.",
      ],
      answer: "Cup A cooled less in this test.",
    },
    questions: [
      q(
        "Which is an observation?",
        [
          "Cup A cooled by 3°C",
          "The wrapping must be the best",
          "The test could never be wrong",
        ],
        0,
        "The temperature change is a measured result. The other answers make claims beyond the measurement.",
      ),
      q(
        "Which condition should be the same in a fair insulation test?",
        [
          "The wrapping material",
          "Starting water temperature",
          "The final temperature",
        ],
        1,
        "Starting temperatures must match. The wrapping changes and the final reading is measured.",
      ),
    ],
  },
  8: {
    title: "Track particles through a change of state",
    hint: "Look at the spacing and motion of particles. A state change does not change the substance.",
    misconception:
      "Particles do not swell when a gas expands. The spaces between them can increase.",
    worked: {
      steps: [
        "Imagine ice melting inside a sealed container.",
        "The particles leave fixed positions and move past each other.",
        "Because matter stays in the container, the total mass remains the same.",
      ],
      answer: "Melting changes the arrangement and movement of particles.",
    },
    questions: [
      q(
        "Why can a liquid flow?",
        [
          "The particles vanish",
          "The particles can move past each other",
          "The particles get larger",
        ],
        1,
        "In a liquid the particles stay close, but can move past one another.",
      ),
      q(
        "What happens to total mass when water evaporates in a sealed flask?",
        ["It falls", "It rises", "It stays the same"],
        2,
        "The water changes state, but no matter leaves the sealed flask.",
      ),
    ],
  },
  9: {
    title: "Use repeats to check a result",
    hint: "Look for readings far from the others. Check the method before deciding what to include.",
    misconception:
      "A repeat can reveal variation. Repeats do not automatically correct an instrument that always reads too high.",
    worked: {
      steps: [
        "Readings are 12, 13 and 12 seconds.",
        "Add the three values to get 37 seconds.",
        "Divide by three and report a sensible precision.",
      ],
      answer: "Mean ≈ 12.3 seconds",
    },
    questions: [
      q(
        "A new repeat reads 31 seconds. What should you do first?",
        [
          "Check the method and repeat the measurement",
          "Delete it instantly",
          "Use only that reading",
        ],
        0,
        "An unusual reading needs investigation. Repeating and checking the method helps identify an error.",
      ),
      q(
        "Calculate the mean of 5, 6 and 7 cm.",
        ["5 cm", "6 cm", "18 cm"],
        1,
        "The sum is 18 cm. Divide by three readings to get 6 cm.",
      ),
    ],
  },
  10: {
    title: "Calculate magnification",
    hint: "Convert both lengths to the same unit before dividing image size by actual size.",
    misconception:
      "Magnification is a ratio. Its answer has no unit such as millimetres or micrometres.",
    worked: {
      steps: [
        "An image is 15 mm and the object is 50 µm.",
        "Convert 15 mm to 15,000 µm.",
        "Divide 15,000 by 50.",
      ],
      answer: "×300",
    },
    questions: [
      q(
        "An image is 12 mm and the object is 40 µm. Find magnification.",
        ["×3", "×30", "×300"],
        2,
        "12 mm equals 12,000 µm. 12,000 ÷ 40 = 300.",
      ),
      q(
        "What does greater resolution allow?",
        [
          "Closer points to be seen separately",
          "Every picture to be larger",
          "The object itself to grow",
        ],
        0,
        "Resolution is the ability to distinguish two close points as separate.",
      ),
    ],
  },
  11: {
    title: "Explain current in a complete circuit",
    hint: "For a simple resistor circuit use current = potential difference divided by resistance.",
    misconception:
      "Current is not used up by a series component. Energy is transferred and the current is the same around the loop.",
    worked: {
      steps: [
        "A simple circuit has a 9 V supply and total resistance of 18 Ω.",
        "Use I = V ÷ R.",
        "9 ÷ 18 = 0.5 and current is measured in A.",
      ],
      answer: "0.5 A",
    },
    questions: [
      q(
        "Find the current for 6 V across a 12 Ω resistor.",
        ["0.5 A", "2 A", "72 A"],
        0,
        "6 ÷ 12 = 0.5. Current is measured in amperes.",
      ),
      q(
        "Where is an ammeter placed to measure a component’s current?",
        [
          "Across the component",
          "In series with the component",
          "Outside the circuit",
        ],
        1,
        "The same charge must pass through the meter and the component, so connect the meter in series.",
      ),
    ],
  },
};

const englishTexts: Record<
  SecondaryYear,
  { text: string; phrase: string; idea: string; theme: string; model: string }
> = {
  7: {
    text: "The station clock shivered each time a train thundered past. Mina checked her ticket again and slipped it into the pocket she had already checked twice.",
    phrase: "clock shivered",
    idea: "gives the station some of Mina’s nervous energy",
    theme: "how a setting can mirror a character’s feelings",
    model:
      "The clock ‘shivered’ as a train went past. The verb sounds like a person trembling, making the station feel uneasy and reflecting Mina’s nerves.",
  },
  8: {
    text: "When the library door shut, the street folded away like a map. Inside, books lined the walls and a lamp lit the table Mina had saved for her friend.",
    phrase: "folded away like a map",
    idea: "makes the noisy street seem temporarily distant",
    theme: "how a place can become a refuge",
    model:
      "The simile ‘folded away like a map’ makes the street feel like something Mina can put aside. The quiet table shifts our attention from the city to her friendship.",
  },
  9: {
    text: "The notice promised changes before the end of term. Under it, the same plastic bucket caught rain from the ceiling. By Friday the bucket had a company of two.",
    phrase: "a company of two",
    idea: "turns the growing number of buckets into quiet criticism",
    theme: "the gap between promises and action",
    model:
      "The almost cheerful ‘a company of two’ is ironic because extra buckets show the problem getting worse. The image makes the confident notice seem less convincing.",
  },
  10: {
    text: "Jules said the gate had always been locked. ‘Always’ had a way of ending conversations in this house. At sunset Eva found a key clipped beneath the plant pot.",
    phrase: "Always",
    idea: "shows how a single word is used to discourage questions",
    theme: "what authority conceals",
    model:
      "The repetition of ‘always’ makes Jules’s claim sound final, but the discovered key unsettles that certainty. The structure invites us to reconsider whether his account can be trusted.",
  },
  11: {
    text: "Nadia remembered the old arcade as bright enough to hurt. In the window now she saw only her own reflection. Then behind her a machine chimed, and she turned before she thought.",
    phrase: "only her own reflection",
    idea: "makes the contrast between memory and the present feel personal",
    theme: "how the past returns through sound and memory",
    model:
      "The restriction of ‘only’ narrows the lively remembered arcade to Nadia’s reflection, suggesting loss. The final chime complicates this reading because her immediate response suggests the past still has a hold on her.",
  },
};

export function secondaryPractice(
  product: SubjectProduct,
  year: SecondaryYear,
  strand: string,
): Warmup {
  if (product === "maths" || product === "science") {
    const content = (product === "maths" ? maths : science)[year];
    return { id: `${product}-${year}`, product, year, ...content };
  }
  const { text, phrase, idea, theme, model } = englishTexts[year];
  const literature = strand === "literature";
  const writing = {
    model,
    checks: [
      "Make a claim about the text.",
      "Use a brief, precise quotation.",
      "Explain the effect and test your interpretation against the rest of the extract.",
    ],
  };
  return {
    id: `english-${year}-${literature ? "literature" : "language"}`,
    product,
    year,
    title: literature
      ? `Explore ${theme}`
      : `Explain a writer’s choice · ${["word choice", "imagery", "tone", "structure", "evaluation"][year - 7]}`,
    extract: text,
    writing,
    hint: "Read the whole extract, then isolate the exact words that support your interpretation.",
    misconception:
      "Naming a technique is a start. Your reader also needs to know what the specific choice suggests in this passage.",
    worked: {
      steps: [
        `Locate “${phrase}” in the extract.`,
        `Consider how it ${idea}.`,
        literature
          ? `Link the detail to ${theme}.`
          : "Connect the effect to what changes elsewhere in the passage.",
      ],
      answer: model,
    },
    questions: [
      q(
        "Which quotation is present in the extract?",
        [phrase, "the furious bell", "a distant storm"],
        0,
        "Check the exact words in the extract. A short, accurate quotation is easier to analyse.",
      ),
      q(
        `Which interpretation is best supported by “${phrase}” in context?`,
        [
          "It proves the writer dislikes every character",
          `It ${idea}`,
          "It tells us the exact year",
        ],
        1,
        `The wording ${idea}. Check that reading against the rest of the passage.`,
      ),
    ],
  };
}

export function gradeSecondaryPractice(practice: Warmup, answers: unknown[]) {
  if (
    answers.length !== practice.questions.length ||
    answers.some(
      (answer, index) =>
        typeof answer !== "number" ||
        !Number.isInteger(answer) ||
        answer < 0 ||
        answer >= practice.questions[index].options.length,
    )
  )
    throw new Error("Choose an answer for each question.");
  const checks = practice.questions.map((question, index) => ({
    correct: answers[index] === question.answer,
    explanation: question.explanation,
  }));
  return { checks, score: checks.filter((check) => check.correct).length };
}
