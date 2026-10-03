import type { Topic } from "@/lib/types";

const R = "2026-10-01";
const V = "1.0";

export const POST16_TOPICS_B: Topic[] = [
  // ——— A levels ———
  {
    id: "alevel-physics-suvat",
    courseId: "alevel-physics",
    title: "Motion in a straight line and the SUVAT equations",
    summary:
      "Displacement, velocity and acceleration, motion graphs, and the equations for uniformly accelerated motion.",
    objectives: [
      "Distinguish between scalar and vector quantities in kinematics",
      "Interpret gradients and areas of displacement–time and velocity–time graphs",
      "Select and apply the SUVAT equations to problems with constant acceleration",
      "Apply the equations to free fall using g = 9.81 m s⁻²",
    ],
    explanation: [
      "Displacement (s) is distance in a stated direction, so it is a vector; distance is a scalar. In the same way, velocity is speed in a stated direction. Choose a positive direction at the start of every problem and give every vector a sign.",
      "Velocity is the rate of change of displacement, v = Δs/Δt, and acceleration is the rate of change of velocity, a = Δv/Δt. The gradient of a displacement–time graph gives velocity, the gradient of a velocity–time graph gives acceleration, and the area under a velocity–time graph gives displacement.",
      "For constant (uniform) acceleration only, the five quantities s, u, v, a and t are linked by four equations: v = u + at, s = ½(u + v)t, s = ut + ½at² and v² = u² + 2as. Each equation leaves out one quantity, so list the three you know and the one you want, then pick the equation that leaves out the fifth.",
      "Near the Earth's surface, and ignoring air resistance, every object in free fall has the same downward acceleration, g = 9.81 m s⁻². If you take upwards as positive, a = −9.81 m s⁻² for the whole flight, including the instant at the top when v = 0.",
      "Required practical 3 measures g by timing free fall over measured heights. Plotting s against t² for an object released from rest gives a straight line through the origin with gradient ½g, which reduces the effect of random error compared with a single measurement.",
    ],
    workedExample: {
      question:
        "A car accelerates uniformly from 4.0 m s⁻¹ to 16.0 m s⁻¹ over a distance of 60 m. Find its acceleration and the time taken.",
      steps: [
        "Known: u = 4.0 m s⁻¹, v = 16.0 m s⁻¹, s = 60 m. Unknown: a, then t.",
        "Time is not given, so use v² = u² + 2as: 16.0² = 4.0² + 2 × a × 60.",
        "256 = 16 + 120a, so 120a = 240 and a = 2.0 m s⁻².",
        "Now use v = u + at: 16.0 = 4.0 + 2.0t, so t = 6.0 s.",
        "Check with s = ½(u + v)t = ½ × 20.0 × 6.0 = 60 m. ✓",
      ],
      answer: "a = 2.0 m s⁻² and t = 6.0 s",
    },
    keyTerms: [
      {
        term: "Displacement",
        definition:
          "The distance moved in a stated direction from a reference point; a vector.",
      },
      {
        term: "Velocity",
        definition: "The rate of change of displacement; a vector.",
      },
      {
        term: "Acceleration",
        definition:
          "The rate of change of velocity, measured in m s⁻²; a vector.",
      },
      {
        term: "Uniform acceleration",
        definition:
          "Acceleration that stays constant in size and direction; the condition for using SUVAT.",
      },
    ],
    misconceptions: [
      {
        wrong:
          "At the top of its flight, a ball thrown upwards has zero acceleration.",
        right:
          "Its velocity is zero for an instant, but its acceleration is still g downwards throughout.",
      },
      {
        wrong: "The SUVAT equations work for any motion.",
        right:
          "They only apply when acceleration is constant. For changing acceleration, use graphs (gradients and areas) instead.",
      },
      {
        wrong: "Speed and velocity are the same thing.",
        right:
          "Velocity has a direction, so its sign matters. An object can have constant speed but changing velocity.",
      },
    ],
    retrieval: [
      {
        q: "What does the area under a velocity–time graph represent?",
        a: "Displacement.",
      },
      {
        q: "Which SUVAT equation does not contain time?",
        a: "v² = u² + 2as.",
      },
      {
        q: "An object is released from rest. What is its velocity after 3.0 s of free fall?",
        a: "v = u + at = 0 + 9.81 × 3.0 = 29.4 m s⁻¹ (downwards).",
      },
    ],
    quiz: [
      {
        id: "sv1",
        q: "A stone is dropped from rest and falls for 2.0 s. Ignoring air resistance, what is its speed? (g = 9.81 m s⁻²)",
        options: ["19.6 m s⁻¹", "9.81 m s⁻¹", "39.2 m s⁻¹", "4.9 m s⁻¹"],
        answer: 0,
        explain: "v = u + at = 0 + 9.81 × 2.0 = 19.6 m s⁻¹.",
      },
      {
        id: "sv2",
        q: "What does the gradient of a velocity–time graph give?",
        options: ["Displacement", "Acceleration", "Speed", "Distance travelled"],
        answer: 1,
        explain:
          "Gradient = change in velocity ÷ time, which is acceleration. The area under the graph gives displacement.",
      },
      {
        id: "sv3",
        q: "A cyclist starts from rest and accelerates uniformly at 1.5 m s⁻² for 4.0 s. How far does she travel?",
        options: ["6.0 m", "24 m", "12 m", "3.0 m"],
        answer: 2,
        explain: "s = ut + ½at² = 0 + ½ × 1.5 × 4.0² = 12 m.",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "7408",
        section: "3.4.1.3 Motion along a straight line",
        url: "https://www.aqa.org.uk/subjects/physics/a-level/physics-7408/specification/subject-content/mechanics-and-materials",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "alevel-fmaths-complex-numbers",
    courseId: "alevel-further-maths",
    title: "Complex numbers and the Argand diagram",
    summary:
      "Arithmetic with complex numbers, conjugates, Argand diagrams and modulus–argument form.",
    objectives: [
      "Add, subtract, multiply and divide complex numbers in the form x + iy",
      "Use complex conjugates, including conjugate pairs of roots",
      "Represent complex numbers on an Argand diagram",
      "Convert between Cartesian and modulus–argument form",
    ],
    explanation: [
      "A complex number has the form z = x + iy, where i² = −1, x = Re(z) is the real part and y = Im(z) is the imaginary part. Add and subtract by collecting real and imaginary parts; multiply by expanding brackets and replacing i² with −1.",
      "The complex conjugate of z = x + iy is z* = x − iy. The product zz* = x² + y² is always real, so to divide, multiply the numerator and denominator by the conjugate of the denominator.",
      "If a polynomial equation has real coefficients, its non-real roots occur in conjugate pairs. So if 2 + 3i is a root of a real cubic, 2 − 3i is also a root, and the product (z − (2 + 3i))(z − (2 − 3i)) = z² − 4z + 13 is a real quadratic factor.",
      "On an Argand diagram, z = x + iy is plotted as the point (x, y). The modulus |z| = √(x² + y²) is its distance from the origin. The argument arg z is the angle from the positive real axis, measured anticlockwise; the principal argument lies in −π < θ ≤ π.",
      "In modulus–argument form, z = r(cos θ + i sin θ). When multiplying, multiply the moduli and add the arguments; when dividing, divide the moduli and subtract the arguments. Always sketch the point first so you place the argument in the correct quadrant.",
    ],
    workedExample: {
      question:
        "Given z₁ = 3 + 4i and z₂ = 1 − 2i, find z₁z₂ and z₁ ÷ z₂ in the form x + iy, and find |z₁|.",
      steps: [
        "z₁z₂ = (3 + 4i)(1 − 2i) = 3 − 6i + 4i − 8i².",
        "Replace i² with −1: 3 − 2i + 8 = 11 − 2i.",
        "For the division, multiply top and bottom by z₂* = 1 + 2i: (3 + 4i)(1 + 2i) ÷ (1 + 2i)(1 − 2i).",
        "Numerator: 3 + 6i + 4i + 8i² = −5 + 10i. Denominator: 1² + 2² = 5.",
        "So z₁ ÷ z₂ = (−5 + 10i) ÷ 5 = −1 + 2i.",
        "|z₁| = √(3² + 4²) = √25 = 5.",
      ],
      answer: "z₁z₂ = 11 − 2i, z₁ ÷ z₂ = −1 + 2i and |z₁| = 5",
    },
    keyTerms: [
      {
        term: "Complex conjugate",
        definition: "For z = x + iy, the conjugate is z* = x − iy.",
      },
      {
        term: "Argand diagram",
        definition:
          "A diagram with a real axis and an imaginary axis on which complex numbers are plotted as points.",
      },
      {
        term: "Modulus",
        definition:
          "The distance of z from the origin on an Argand diagram: |z| = √(x² + y²).",
      },
      {
        term: "Argument",
        definition:
          "The angle z makes with the positive real axis; the principal argument lies in −π < θ ≤ π.",
      },
    ],
    misconceptions: [
      {
        wrong: "arg z is always arctan(y/x).",
        right:
          "arctan(y/x) only gives the right angle in the first and fourth quadrants. Sketch the point and adjust by π when x is negative.",
      },
      {
        wrong: "To divide complex numbers, divide the real parts and the imaginary parts separately.",
        right:
          "Multiply the numerator and denominator by the conjugate of the denominator, so the denominator becomes real.",
      },
    ],
    retrieval: [
      { q: "What is the conjugate of 4 − 7i?", a: "4 + 7i." },
      {
        q: "If 1 − i is a root of a polynomial with real coefficients, name another root.",
        a: "1 + i.",
      },
      {
        q: "How do you multiply two complex numbers in modulus–argument form?",
        a: "Multiply the moduli and add the arguments.",
      },
    ],
    quiz: [
      {
        id: "cx1",
        q: "What is |5 − 12i|?",
        options: ["7", "13", "17", "169"],
        answer: 1,
        explain: "|5 − 12i| = √(5² + 12²) = √169 = 13.",
      },
      {
        id: "cx2",
        q: "What is the principal argument of −1 + i?",
        options: ["π/4", "−π/4", "3π/4", "−3π/4"],
        answer: 2,
        explain:
          "The point (−1, 1) is in the second quadrant, so arg z = π − π/4 = 3π/4.",
      },
      {
        id: "cx3",
        q: "Simplify (2 + i)(2 − i).",
        options: ["3", "4 − i", "5", "4 + 2i"],
        answer: 2,
        explain: "(2 + i)(2 − i) = 4 − i² = 4 + 1 = 5, a real number.",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "7367",
        section: "B2–B6 Complex numbers",
        url: "https://www.aqa.org.uk/subjects/mathematics/a-level/further-mathematics-7367/specification/subject-content/compulsory-content",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "alevel-englit-unseen-poetry",
    courseId: "alevel-english-literature",
    title: "Comparing unseen poems",
    summary:
      "How to read, plan and write a comparative essay on two poems you have not seen before.",
    objectives: [
      "Use a reliable reading routine for an unseen poem",
      "Build a comparative argument rather than two separate commentaries",
      "Analyse how form, structure and language shape meaning",
      "Meet the assessment objectives, especially AO2 and AO4",
    ],
    explanation: [
      "In AQA English Literature A (7712), Paper 1 Section B is a compulsory essay on two unseen poems, worth 25 marks. Other boards also set unseen poetry or prose, so the skills here transfer.",
      "Read each poem at least twice. First get the literal situation: who is speaking, to whom, and what happens. Then look for a turn or shift in tone, often marked by a stanza break, a volta, a change of tense or a short line.",
      "Compare from the start. Write a thesis that links both poems, for example 'Both poets present love as memory, but one treats memory as comfort and the other as loss.' Then organise paragraphs by idea, not by poem, and move between the two poems within each paragraph using connectives such as 'whereas' and 'similarly'.",
      "Analyse method, not just meaning. Consider form (sonnet, free verse, dramatic monologue), structure (enjambment, caesura, stanza length, where the poem ends) and language (imagery, sound, verb choices). Always explain the effect: how does the choice shape the reader's response?",
      "The A level assessment objectives are AO1 (informed, personal and creative responses in accurate, coherent writing), AO2 (analysing how meanings are shaped), AO3 (the significance of contexts), AO4 (connections across texts) and AO5 (different interpretations). In an unseen comparison, the connections you draw between the poems are central.",
    ],
    workedExample: {
      question:
        "Plan a response to: 'Compare how the poets present the end of a relationship in these two poems.'",
      steps: [
        "Annotate each poem for situation, speaker, tone and the turning point (about 10 minutes).",
        "Find a shared concern and a key difference, then write a one-sentence comparative thesis.",
        "Choose three ideas to structure the essay, such as memory, blame and acceptance, and pair evidence from both poems under each idea.",
        "For each piece of evidence, name the method (for example enjambment or a shift to present tense) and explain its effect.",
        "Finish with a judgement on which poem reaches resolution and how its ending creates that effect.",
      ],
      answer:
        "An idea-led plan that compares both poems in every paragraph, analyses methods and ends with a clear judgement",
    },
    keyTerms: [
      {
        term: "Enjambment",
        definition:
          "When a sentence or phrase runs on from one line of poetry into the next without a pause.",
      },
      {
        term: "Caesura",
        definition: "A pause within a line of poetry, often marked by punctuation.",
      },
      {
        term: "Volta",
        definition:
          "A turn in thought or tone within a poem, traditionally found in sonnets.",
      },
      {
        term: "Comparative thesis",
        definition:
          "A central argument that links two texts, stating a similarity and a difference.",
      },
    ],
    misconceptions: [
      {
        wrong: "Write about the first poem and then the second.",
        right:
          "Integrate the comparison throughout. Separate commentaries make it hard to show connections (AO4).",
      },
      {
        wrong: "Spotting as many techniques as possible gets the marks.",
        right:
          "Naming a technique earns little on its own. Explain how it shapes meaning and link it to your argument.",
      },
      {
        wrong: "An unseen poem has one correct meaning you must find.",
        right:
          "Examiners reward well-supported, tentative interpretations. Phrases such as 'this could suggest' are appropriate.",
      },
    ],
    retrieval: [
      {
        q: "Which assessment objective is about making connections across texts?",
        a: "AO4.",
      },
      {
        q: "How should you organise paragraphs in a comparative essay?",
        a: "By idea or theme, discussing both poems within each paragraph.",
      },
      {
        q: "What is a volta?",
        a: "A turn in thought or tone within a poem.",
      },
    ],
    quiz: [
      {
        id: "up1",
        q: "Which opening is the strongest comparative thesis?",
        options: [
          "Poem A is about love and Poem B is also about love.",
          "Both poets explore loss, but one finds comfort in memory while the other resists it.",
          "Poem A uses lots of techniques such as metaphor.",
          "I will first write about Poem A and then Poem B.",
        ],
        answer: 1,
        explain:
          "It links both poems and states a similarity and a difference, which gives the essay a clear comparative argument.",
      },
      {
        id: "up2",
        q: "A sentence runs over a line break without punctuation. What is this called?",
        options: ["Caesura", "Enjambment", "Volta", "Sibilance"],
        answer: 1,
        explain:
          "Enjambment carries the sense from one line into the next. A caesura is a pause within a line.",
      },
      {
        id: "up3",
        q: "In AQA 7712 Paper 1 Section B, what are you asked to do?",
        options: [
          "Write a comparative essay on two unseen poems",
          "Answer a passage-based question on Shakespeare",
          "Write about a set poetry anthology with the book open",
          "Write an independent critical study",
        ],
        answer: 0,
        explain:
          "Section B is a compulsory essay question on two unseen poems (25 marks).",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "7712 (A)",
        section:
          "3.1 Love through the ages (Paper 1 Section B unseen poetry)",
        url: "https://www.aqa.org.uk/subjects/english/a-level/english-7712/specification/subject-content/love-through-the-ages",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "alevel-history-interpretations",
    courseId: "alevel-history",
    title: "Evaluating historical interpretations",
    summary:
      "How to analyse and judge historians' interpretations in extract questions (AO3).",
    objectives: [
      "Explain the difference between a source and an interpretation",
      "Identify the overall argument of an extract",
      "Evaluate an interpretation using your own contextual knowledge",
      "Reach a supported judgement on how convincing an interpretation is",
    ],
    explanation: [
      "AO3 asks you to 'analyse and evaluate, in relation to the historical context, different ways in which aspects of the past have been interpreted'. In AQA 7042, Component 1 Section A gives three extracts from historians and asks how convincing their arguments are (30 marks).",
      "An interpretation is a historian's argument about the past, written later with hindsight. A source (AO2) is material from the period itself. Do not evaluate an extract as if it were a primary source: comments about the historian's nationality or the date of publication are rarely useful.",
      "Start by identifying each extract's overall argument in one sentence. Then pick out its supporting claims, looking for the tone and the key words that show how strongly the historian holds a view.",
      "Evaluate by testing the argument against what you know about the period. Use precise contextual knowledge to corroborate claims (what supports them) and to challenge them (what they leave out or overstate).",
      "Finish each extract with a judgement on how convincing it is overall, and why. Interpretations differ because historians ask different questions, emphasise different evidence or focus on different groups, so explain the reason for a difference rather than just noting it.",
    ],
    workedExample: {
      question:
        "How should you structure your analysis of one extract in a three-extract AO3 question?",
      steps: [
        "State the overall argument of the extract in your own words.",
        "Take the first major claim and corroborate it with specific contextual knowledge (dates, events, figures).",
        "Challenge a claim that is overstated or incomplete, again with specific knowledge.",
        "Note what the extract emphasises or leaves out, and why that affects its argument.",
        "Give a clear judgement: how convincing is this interpretation overall?",
      ],
      answer:
        "Argument → corroborate → challenge → emphasis and omission → judgement, repeated for each extract",
    },
    keyTerms: [
      {
        term: "Interpretation",
        definition:
          "A historian's argued view of the past, constructed after the event.",
      },
      {
        term: "Historiography",
        definition:
          "The study of how history has been written and how interpretations have changed.",
      },
      {
        term: "Contextual knowledge",
        definition:
          "Your own accurate knowledge of the period, used to test an interpretation.",
      },
      {
        term: "Corroborate",
        definition: "To support a claim with further evidence.",
      },
    ],
    misconceptions: [
      {
        wrong: "Evaluate an extract by asking whether the historian was biased.",
        right:
          "Assess the argument itself: test its claims against your contextual knowledge.",
      },
      {
        wrong: "Summarising what each extract says is enough.",
        right:
          "Summary shows comprehension only. Higher marks need evaluation and a judgement on how convincing each argument is.",
      },
      {
        wrong: "One interpretation must be right and the others wrong.",
        right:
          "Interpretations can each be partly convincing. Explain their strengths and limits.",
      },
    ],
    retrieval: [
      {
        q: "Which assessment objective covers historical interpretations?",
        a: "AO3.",
      },
      {
        q: "What is the difference between a source and an interpretation?",
        a: "A source comes from the period; an interpretation is a historian's later argument about it.",
      },
      {
        q: "What should you use to test an interpretation's claims?",
        a: "Your own precise contextual knowledge.",
      },
    ],
    quiz: [
      {
        id: "hi1",
        q: "Which of these is the best way to evaluate a historian's extract?",
        options: [
          "Comment on when the book was published",
          "Test its claims against your own contextual knowledge",
          "Count how many facts it includes",
          "Say whether you agree with the historian's politics",
        ],
        answer: 1,
        explain:
          "AO3 rewards evaluating the argument in relation to the historical context, using your own knowledge.",
      },
      {
        id: "hi2",
        q: "In AQA 7042 Component 1 Section A, how many extracts are you given?",
        options: ["One", "Two", "Three", "Four"],
        answer: 2,
        explain:
          "Section A provides three extracts linked to a broad issue, and is worth 30 marks.",
      },
      {
        id: "hi3",
        q: "A letter written by a politician in 1911 is best described as…",
        options: [
          "An interpretation",
          "A primary source",
          "Historiography",
          "A secondary argument",
        ],
        answer: 1,
        explain:
          "It comes from the period itself, so it is a source (assessed through AO2), not a later interpretation.",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "7042",
        section: "AO3 Interpretations (Component 1 Section A)",
        url: "https://www.aqa.org.uk/subjects/history/a-level/history-7042/specification/scheme-of-assessment",
      },
    ],
    reviewed: R,
    version: V,
  },

  // ——— BTEC ———
  {
    id: "btec-appsci-cells-microscopy",
    courseId: "btec-applied-science",
    title: "Cell structure, microscopy and magnification",
    summary:
      "Eukaryotic and prokaryotic cells, their organelles, and calculating magnification.",
    objectives: [
      "Describe the functions of key organelles in animal and plant cells",
      "Compare prokaryotic and eukaryotic cells",
      "Compare light and electron microscopes",
      "Calculate magnification, image size and actual size, converting units",
    ],
    explanation: [
      "Eukaryotic cells (animal, plant and fungal) have a nucleus and membrane-bound organelles. The nucleus holds DNA, mitochondria carry out aerobic respiration, ribosomes make proteins, rough endoplasmic reticulum transports proteins made on its ribosomes, and the Golgi apparatus modifies and packages them.",
      "Plant cells also have a cellulose cell wall, a permanent vacuole containing cell sap, and chloroplasts for photosynthesis. Animal cells have none of these.",
      "Prokaryotic cells, such as bacteria, have no nucleus. Their DNA is a single loop in the cytoplasm, often with extra small loops called plasmids. They have smaller (70S) ribosomes than eukaryotic cells (80S), and a cell wall that is not made of cellulose.",
      "Light microscopes use light and lenses and can view living cells, but their resolution is limited to about 0.2 µm. Electron microscopes use a beam of electrons and have much higher resolution, so they show ultrastructure such as ribosomes, but specimens must be dead and in a vacuum.",
      "Magnification = image size ÷ actual size. Both sizes must be in the same unit before you divide: 1 mm = 1000 µm and 1 µm = 1000 nm.",
    ],
    workedExample: {
      question:
        "A cell is 30 mm long in a micrograph taken at ×1500 magnification. What is its actual length in micrometres?",
      steps: [
        "Rearrange: actual size = image size ÷ magnification.",
        "Convert the image size: 30 mm = 30 × 1000 = 30 000 µm.",
        "Actual size = 30 000 ÷ 1500 = 20 µm.",
      ],
      answer: "20 µm",
    },
    keyTerms: [
      {
        term: "Eukaryotic cell",
        definition: "A cell with a nucleus and membrane-bound organelles.",
      },
      {
        term: "Prokaryotic cell",
        definition:
          "A cell with no nucleus; its DNA lies free in the cytoplasm, as in bacteria.",
      },
      {
        term: "Resolution",
        definition:
          "The ability to distinguish two points close together as separate.",
      },
      {
        term: "Magnification",
        definition:
          "How many times larger the image is than the real object: image size ÷ actual size.",
      },
    ],
    misconceptions: [
      {
        wrong: "Higher magnification always shows more detail.",
        right:
          "Detail depends on resolution. Magnifying beyond a microscope's resolution just gives a bigger, blurred image.",
      },
      {
        wrong: "Bacteria have no DNA because they have no nucleus.",
        right:
          "Bacteria have DNA as a loop in the cytoplasm, and often plasmids too.",
      },
      {
        wrong: "You can divide sizes in mm by sizes in µm directly.",
        right: "Convert both sizes to the same unit before calculating.",
      },
    ],
    retrieval: [
      {
        q: "Which organelle is the site of aerobic respiration?",
        a: "The mitochondrion.",
      },
      {
        q: "Name three structures found in plant cells but not animal cells.",
        a: "Cellulose cell wall, permanent vacuole, chloroplasts.",
      },
      { q: "How many micrometres are in 1 mm?", a: "1000 µm." },
    ],
    quiz: [
      {
        id: "cm1",
        q: "Which structure is found in prokaryotic cells but not usually in eukaryotic cells?",
        options: ["Nucleus", "Mitochondria", "Plasmids", "Golgi apparatus"],
        answer: 2,
        explain:
          "Plasmids are small loops of DNA typical of bacteria. Prokaryotes have no nucleus, mitochondria or Golgi apparatus.",
      },
      {
        id: "cm2",
        q: "An image is 12 mm long and the actual object is 40 µm long. What is the magnification?",
        options: ["×0.3", "×30", "×300", "×3000"],
        answer: 2,
        explain: "12 mm = 12 000 µm, and 12 000 ÷ 40 = ×300.",
      },
      {
        id: "cm3",
        q: "Why can an electron microscope show ribosomes when a light microscope cannot?",
        options: [
          "It has a higher resolution",
          "It uses living specimens",
          "It uses coloured stains",
          "It has a larger field of view",
        ],
        answer: 0,
        explain:
          "Electrons have a much shorter wavelength than light, so electron microscopes can resolve much smaller structures.",
      },
    ],
    specRefs: [
      {
        board: "Pearson",
        code: "BTEC Nationals Applied Science (AAQ)",
        section:
          "Unit 1 Principles and Applications of Biology, learning aim A (cell structure and function)",
        url: "https://qualifications.pearson.com/en/qualifications/btec-nationals/applied-science-aaq.html",
      },
      {
        board: "Pearson",
        code: "BTEC Nationals Applied Science (2016)",
        section:
          "Unit 1 Principles and Applications of Science I (B1 Cell structure and function)",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "btec-sport-skeletal-muscular",
    courseId: "btec-sport",
    title: "Joints, antagonistic pairs and muscle fibre types",
    summary:
      "How synovial joints, muscles and fibre types work together to produce movement in sport.",
    objectives: [
      "Identify types of synovial joint and the movements they allow",
      "Explain how antagonistic muscle pairs produce movement",
      "Describe concentric, eccentric and isometric contractions",
      "Compare type I, type IIa and type IIx muscle fibres",
    ],
    explanation: [
      "Synovial joints are freely movable joints. Types include ball and socket (shoulder, hip), hinge (elbow, knee), pivot (between the first two vertebrae in the neck), condyloid (wrist), saddle (base of the thumb) and gliding (between the carpals). The type determines the range of movement.",
      "Joint movements include flexion (decreasing the angle at a joint), extension (increasing it), abduction (away from the midline), adduction (towards the midline), rotation and circumduction. At the ankle, pointing the toes is plantarflexion and pulling them up is dorsiflexion.",
      "Muscles can only pull, so they work in antagonistic pairs. The agonist is the muscle that contracts to cause the movement, the antagonist relaxes to allow it, and the fixator stabilises the origin of the agonist. Examples include biceps and triceps at the elbow, and quadriceps and hamstrings at the knee.",
      "In a concentric contraction the muscle shortens under tension; in an eccentric contraction it lengthens under tension, controlling a movement; in an isometric contraction it produces tension without changing length, as when holding a plank.",
      "Type I (slow twitch) fibres contract slowly, resist fatigue and suit endurance events. Type IIa fibres are fast and fairly fatigue-resistant, suiting events such as the 800 m. Type IIx fibres contract fastest and most forcefully but fatigue quickly, suiting sprinting and jumping.",
    ],
    workedExample: {
      question:
        "Analyse the upward phase of a bicep curl: name the joint type, the movement, the agonist and antagonist, and the type of contraction.",
      steps: [
        "The elbow is a hinge joint.",
        "Raising the weight decreases the angle at the elbow, so the movement is flexion.",
        "The biceps brachii contracts to cause the movement, so it is the agonist; the triceps brachii relaxes, so it is the antagonist.",
        "The biceps shortens while under tension, so the contraction is concentric.",
        "In the lowering phase the biceps lengthens while still under tension to control the weight, which is an eccentric contraction.",
      ],
      answer:
        "Hinge joint, flexion, biceps agonist (concentric) and triceps antagonist",
    },
    keyTerms: [
      {
        term: "Synovial joint",
        definition:
          "A freely movable joint with a joint capsule, synovial membrane and synovial fluid.",
      },
      {
        term: "Agonist",
        definition: "The muscle that contracts to cause a movement.",
      },
      {
        term: "Antagonist",
        definition: "The muscle that relaxes to allow the agonist to move a joint.",
      },
      {
        term: "Eccentric contraction",
        definition: "A contraction in which the muscle lengthens under tension.",
      },
    ],
    misconceptions: [
      {
        wrong: "Muscles can push bones as well as pull them.",
        right:
          "Muscles can only pull. Movement back the other way needs the opposite muscle of the pair.",
      },
      {
        wrong: "When lowering a weight slowly, the triceps does the work.",
        right:
          "The biceps controls the lowering by contracting eccentrically; gravity provides the downward force.",
      },
      {
        wrong: "Type IIx fibres are best for all sports because they are strongest.",
        right:
          "They fatigue quickly, so endurance athletes rely mainly on type I fibres.",
      },
    ],
    retrieval: [
      {
        q: "Name a ball and socket joint.",
        a: "The shoulder or the hip.",
      },
      {
        q: "What is the antagonist to the quadriceps when the knee extends?",
        a: "The hamstrings.",
      },
      {
        q: "Which fibre type is most fatigue-resistant?",
        a: "Type I (slow twitch).",
      },
    ],
    quiz: [
      {
        id: "sk1",
        q: "Which fibre type would a marathon runner rely on most?",
        options: ["Type IIx", "Type IIa", "Type I", "Cardiac muscle"],
        answer: 2,
        explain:
          "Type I fibres are slow twitch and highly resistant to fatigue, ideal for long endurance events.",
      },
      {
        id: "sk2",
        q: "Holding a plank position mainly involves which type of contraction?",
        options: ["Concentric", "Eccentric", "Isometric", "Isotonic"],
        answer: 2,
        explain:
          "The muscles produce tension without changing length, which is an isometric contraction.",
      },
      {
        id: "sk3",
        q: "Pointing the toes, as in a ballet position, is called…",
        options: ["Dorsiflexion", "Plantarflexion", "Abduction", "Circumduction"],
        answer: 1,
        explain:
          "Plantarflexion points the toes away from the shin; dorsiflexion pulls them towards it.",
      },
    ],
    specRefs: [
      {
        board: "Pearson",
        code: "BTEC Nationals Sport (2016)",
        section:
          "Unit 1 Anatomy and Physiology (A3 Joints; B3 Antagonistic muscle pairs; B4–B5 contraction and fibre types)",
        url: "https://qualifications.pearson.com/content/dam/pdf/BTEC-Nationals/Sport/20161/specification-and-sample-assessments/btec-l3-national-cert-in-sport-spec.pdf",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "btec-eng-dc-circuits",
    courseId: "btec-engineering",
    title: "DC circuits: Ohm's law, resistor networks and power",
    summary:
      "Charge, current, voltage and resistance, combining resistors, and calculating power.",
    objectives: [
      "Use Q = It and V = IR in calculations",
      "Find the total resistance of series, parallel and mixed networks",
      "Apply Kirchhoff's current and voltage laws",
      "Calculate electrical power in different forms",
    ],
    explanation: [
      "Current is the rate of flow of charge, I = Q ÷ t, measured in amperes (A). Conventional current flows from positive to negative. Potential difference (voltage) is the energy transferred per unit charge, measured in volts (V).",
      "Ohm's law states that, for a conductor at constant temperature, current is proportional to potential difference: V = IR, where R is resistance in ohms (Ω).",
      "Resistors in series carry the same current, and R_T = R₁ + R₂ + R₃ + … Resistors in parallel share the same potential difference, and 1/R_T = 1/R₁ + 1/R₂ + … The total resistance of a parallel group is always less than its smallest resistor.",
      "Kirchhoff's current law: the total current entering a junction equals the total current leaving it. Kirchhoff's voltage law: around any closed loop, the sum of the EMFs equals the sum of the potential differences.",
      "Power is the rate of energy transfer: P = IV = I²R = V²/R, measured in watts (W). Efficiency = useful output power ÷ total input power × 100%. Always show the formula, substitution and units in exam answers.",
    ],
    workedExample: {
      question:
        "A 12 V DC supply is connected to a 4 Ω resistor in series with a parallel pair of 6 Ω and 12 Ω resistors. Find the total resistance, the supply current, the current in each parallel branch and the total power.",
      steps: [
        "Parallel pair: 1/R = 1/6 + 1/12 = 3/12, so R = 4 Ω.",
        "Total resistance: R_T = 4 + 4 = 8 Ω.",
        "Supply current: I = V ÷ R_T = 12 ÷ 8 = 1.5 A.",
        "PD across the 4 Ω resistor = 1.5 × 4 = 6 V, so the PD across the parallel pair = 12 − 6 = 6 V (Kirchhoff's voltage law).",
        "Branch currents: 6 ÷ 6 = 1.0 A and 6 ÷ 12 = 0.5 A, which add to 1.5 A (Kirchhoff's current law). ✓",
        "Total power: P = IV = 1.5 × 12 = 18 W.",
      ],
      answer: "R_T = 8 Ω, I = 1.5 A, branch currents 1.0 A and 0.5 A, P = 18 W",
    },
    keyTerms: [
      {
        term: "Current",
        definition: "The rate of flow of charge, I = Q ÷ t, measured in amperes.",
      },
      {
        term: "Potential difference",
        definition:
          "The energy transferred per unit charge between two points, measured in volts.",
      },
      {
        term: "Resistance",
        definition:
          "Opposition to current: the ratio V ÷ I, measured in ohms (Ω).",
      },
      {
        term: "Power",
        definition:
          "The rate of energy transfer, measured in watts: P = IV.",
      },
    ],
    misconceptions: [
      {
        wrong: "Adding a resistor in parallel increases the total resistance.",
        right:
          "It adds another path for current, so the total resistance falls.",
      },
      {
        wrong: "Current is used up as it passes through a resistor.",
        right:
          "Current is the same everywhere in a series circuit. Energy is transferred, not charge.",
      },
    ],
    retrieval: [
      { q: "State Ohm's law as an equation.", a: "V = IR." },
      {
        q: "What is the total resistance of 10 Ω and 10 Ω in parallel?",
        a: "5 Ω.",
      },
      {
        q: "State Kirchhoff's current law.",
        a: "The total current into a junction equals the total current out of it.",
      },
    ],
    quiz: [
      {
        id: "dc1",
        q: "A current of 2 A flows through a 5 Ω resistor. What power does it dissipate?",
        options: ["10 W", "20 W", "2.5 W", "50 W"],
        answer: 1,
        explain: "P = I²R = 2² × 5 = 20 W.",
      },
      {
        id: "dc2",
        q: "A current of 0.5 A flows for 2 minutes. How much charge passes?",
        options: ["1 C", "60 C", "0.25 C", "240 C"],
        answer: 1,
        explain: "Q = It = 0.5 × 120 s = 60 C. Convert minutes to seconds first.",
      },
      {
        id: "dc3",
        q: "What is the total resistance of 20 Ω and 30 Ω in parallel?",
        options: ["50 Ω", "25 Ω", "12 Ω", "10 Ω"],
        answer: 2,
        explain: "1/R = 1/20 + 1/30 = 5/60, so R = 12 Ω.",
      },
    ],
    specRefs: [
      {
        board: "Pearson",
        code: "BTEC Nationals Engineering (AAQ) 610/3962/7",
        section: "Unit 1 Engineering Principles (C1 Direct current electricity and circuits)",
        url: "https://qualifications.pearson.com/en/qualifications/btec-nationals/engineering-aaq.html",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "btec-media-representation",
    courseId: "btec-creative-media",
    title: "Media representation and audience readings",
    summary:
      "How media products construct representations, and how audiences decode them.",
    objectives: [
      "Explain what a representation is and why it is always constructed",
      "Analyse media language using denotation, connotation and anchorage",
      "Describe preferred, negotiated and oppositional readings",
      "Evaluate the effects of stereotypes and other representations",
    ],
    explanation: [
      "A representation is the way a media product presents people, groups, places or ideas. It is never a neutral window on reality: producers select what to include and leave out, and construct it through camera, lighting, editing, sound and design.",
      "Semiotics analyses media language as signs. Denotation is what a sign literally shows; connotation is the meanings associated with it. A red rose denotes a flower but can connote romance. Anchorage is text, such as a caption or slogan, that fixes one intended meaning of an image.",
      "Producers encode a message, and audiences decode it. Stuart Hall described three main readings: a preferred (dominant) reading accepts the intended message; a negotiated reading accepts parts of it; an oppositional reading rejects it. The same product can be read differently depending on the audience's age, background and experiences.",
      "A stereotype is an oversimplified representation of a group, reduced to a few traits. Stereotypes can make meaning quick to grasp, but they can also reinforce prejudice and exclude people. Look for presence and absence: who is shown, who is missing, and who has power in the product?",
      "In analysis, link every technical choice to a meaning, and every meaning to its possible effect on the audience. Use accurate terminology, but always explain what the term shows.",
    ],
    workedExample: {
      question:
        "An advert for a car shows a woman in a suit driving alone through a city at dawn, with the slogan 'Your day. Your rules.' Analyse its representation of women.",
      steps: [
        "Denotation: a woman in business clothing drives a car through an empty city at sunrise.",
        "Connotation: the suit and empty road suggest professional success, independence and control; dawn connotes ambition and a fresh start.",
        "Anchorage: the slogan fixes the meaning around personal freedom and choice.",
        "Representation: the woman is constructed as confident and in charge, challenging older stereotypes of women as passengers in car adverts.",
        "Audience: the preferred reading is aspirational, but an oppositional reader might see independence being used simply to sell a product.",
      ],
      answer:
        "A counter-stereotypical representation of an independent professional woman, anchored by the slogan, with more than one possible audience reading",
    },
    keyTerms: [
      {
        term: "Representation",
        definition:
          "How the media constructs and presents people, groups, places or ideas.",
      },
      {
        term: "Connotation",
        definition: "The associated or implied meanings of a sign.",
      },
      {
        term: "Anchorage",
        definition:
          "Text that fixes the intended meaning of an image, such as a caption.",
      },
      {
        term: "Oppositional reading",
        definition: "When an audience rejects the producer's intended message.",
      },
    ],
    misconceptions: [
      {
        wrong: "Documentaries and news show reality exactly as it is.",
        right:
          "All media products are constructed through selection and editing, so all are representations.",
      },
      {
        wrong: "Every audience member reads a product in the same way.",
        right:
          "Audiences can make preferred, negotiated or oppositional readings.",
      },
      {
        wrong: "Stereotypes are always negative.",
        right:
          "Some are positive, but all oversimplify, which can still be limiting or harmful.",
      },
    ],
    retrieval: [
      {
        q: "What is the difference between denotation and connotation?",
        a: "Denotation is the literal meaning; connotation is the associated meaning.",
      },
      {
        q: "Name the three main audience readings.",
        a: "Preferred (dominant), negotiated and oppositional.",
      },
      { q: "What does anchorage do?", a: "Fixes the intended meaning of an image." },
    ],
    quiz: [
      {
        id: "mr1",
        q: "A viewer accepts part of an advert's message but disagrees with the rest. What type of reading is this?",
        options: ["Preferred", "Negotiated", "Oppositional", "Aberrant"],
        answer: 1,
        explain:
          "A negotiated reading accepts some of the encoded message and rejects or adapts other parts.",
      },
      {
        id: "mr2",
        q: "What is anchorage?",
        options: [
          "The camera position in a shot",
          "Text that fixes the intended meaning of an image",
          "A recurring character type",
          "The main audience of a product",
        ],
        answer: 1,
        explain:
          "Anchorage, such as a caption or slogan, narrows down how an image is meant to be read.",
      },
      {
        id: "mr3",
        q: "A dark, low-key lit alley denotes a street at night. What might it connote?",
        options: ["A street", "Danger or threat", "Night-time", "A location"],
        answer: 1,
        explain:
          "The other options describe what is literally shown (denotation). Danger is an associated meaning (connotation).",
      },
    ],
    specRefs: [
      {
        board: "Pearson",
        code: "BTEC Nationals Creative Digital Media Production (2016)",
        section:
          "Unit 1 Media Representations (B1 Constructing messages; B2 Audience decoding; B3 Semiotics)",
        url: "https://qualifications.pearson.com/content/dam/pdf/BTEC-Nationals/creative-digital-media-production/2016/specification-and-sample-assessments/btec-l3-nat-extcert-in-creative-digital-media-prod-spec.pdf",
      },
    ],
    reviewed: R,
    version: V,
  },

  // ——— T Levels ———
  {
    id: "tlevel-science-lab-safety",
    courseId: "tlevel-science",
    title: "Working safely in the laboratory",
    summary:
      "COSHH, risk assessment, the hierarchy of control and GB CLP hazard pictograms.",
    objectives: [
      "Explain the purpose of COSHH and a COSHH risk assessment",
      "Distinguish between a hazard and a risk",
      "Apply the hierarchy of control, with PPE as the last resort",
      "Recognise GB CLP hazard pictograms and use safety data sheets",
    ],
    explanation: [
      "The Control of Substances Hazardous to Health Regulations 2002 (COSHH) require employers to control exposure to hazardous substances. In a laboratory this means identifying the hazards, assessing the risks, putting controls in place, making sure they are used and maintained, and giving staff information and training.",
      "A hazard is something with the potential to cause harm, such as a corrosive acid. A risk is the likelihood that harm will actually happen, together with how serious it would be. A risk assessment records the hazards, who might be harmed, the controls and what to do in an emergency.",
      "Use the hierarchy of control in order: eliminate the hazard, substitute something less hazardous (for example a more dilute solution), use engineering controls (such as a fume cupboard), use administrative controls (standard operating procedures, training, signage), and finally personal protective equipment (PPE) such as goggles, lab coats and gloves.",
      "Chemical labels in Great Britain use GB CLP hazard pictograms: a red-bordered diamond on a white background. Examples include the flame (flammable), corrosion, skull and crossbones (acute toxicity), exclamation mark and gas cylinder. The supplier's safety data sheet (SDS) gives detailed hazard, handling, storage and first-aid information.",
      "Good laboratory practice also means following standard operating procedures (SOPs) exactly, labelling all containers, keeping clear records, disposing of waste by the correct route and reporting accidents and near misses.",
    ],
    workedExample: {
      question:
        "A technician needs to prepare 1 mol dm⁻³ hydrochloric acid from a concentrated stock solution. Outline the key points of the risk assessment.",
      steps: [
        "Hazard: concentrated hydrochloric acid is corrosive (corrosion pictogram) and gives off irritating fumes.",
        "Who is at risk: the technician and anyone nearby, through skin or eye contact or by breathing in fumes.",
        "Controls, following the hierarchy: work in a fume cupboard (engineering), follow the SOP and always add acid to water, not water to acid (administrative), and wear splash-proof goggles, a lab coat and suitable gloves (PPE).",
        "Emergency: know where the eyewash station is and how to deal with spills using the correct spill kit.",
        "Record the assessment, check the safety data sheet and label the diluted solution with its name, concentration, hazard and date.",
      ],
      answer:
        "Identify the corrosive hazard, apply controls in hierarchy order with PPE last, and plan for spills and eye contact",
    },
    keyTerms: [
      {
        term: "Hazard",
        definition: "Something with the potential to cause harm.",
      },
      {
        term: "Risk",
        definition:
          "The likelihood that a hazard will cause harm, combined with how severe the harm could be.",
      },
      {
        term: "COSHH",
        definition:
          "The Control of Substances Hazardous to Health Regulations 2002.",
      },
      {
        term: "Safety data sheet (SDS)",
        definition:
          "A supplier's document giving hazard, handling, storage and emergency information for a chemical.",
      },
    ],
    misconceptions: [
      {
        wrong: "Wearing PPE is the most important control measure.",
        right:
          "PPE is the last resort. Remove or reduce the hazard first, then use engineering and administrative controls.",
      },
      {
        wrong: "Hazard and risk mean the same thing.",
        right:
          "A hazard can cause harm; risk is how likely and how serious that harm is in a given situation.",
      },
      {
        wrong: "A risk assessment is done once and then filed.",
        right:
          "It should be reviewed when the procedure, substances or people change, or after an incident.",
      },
    ],
    retrieval: [
      {
        q: "What does COSHH stand for?",
        a: "Control of Substances Hazardous to Health (Regulations 2002).",
      },
      {
        q: "What is the least preferred level of the hierarchy of control?",
        a: "Personal protective equipment (PPE).",
      },
      {
        q: "What shape and colour are GB CLP hazard pictograms?",
        a: "A diamond with a red border and a white background.",
      },
    ],
    quiz: [
      {
        id: "ls1",
        q: "Which is an engineering control?",
        options: [
          "Safety goggles",
          "A fume cupboard",
          "A standard operating procedure",
          "A warning sign",
        ],
        answer: 1,
        explain:
          "A fume cupboard physically removes fumes at source. Goggles are PPE; SOPs and signs are administrative controls.",
      },
      {
        id: "ls2",
        q: "A pictogram shows a flame over a circle. What does it mean?",
        options: ["Flammable", "Oxidising", "Explosive", "Corrosive"],
        answer: 1,
        explain:
          "Flame over a circle means oxidising. A flame on its own means flammable.",
      },
      {
        id: "ls3",
        q: "Replacing a concentrated solution with a more dilute one that still works is an example of…",
        options: ["Elimination", "Substitution", "PPE", "Administrative control"],
        answer: 1,
        explain:
          "Substitution swaps a hazardous substance for a less hazardous one.",
      },
    ],
    specRefs: [
      {
        board: "Pearson",
        code: "T Level Science 610/7439/1",
        section: "Core: Health and safety in a laboratory environment",
        url: "https://qualifications.pearson.com/content/dam/pdf/TLevels/science/2026/administration/qualification-description-t-level-technical-qualification-in-science.pdf",
      },
      {
        board: "HSE",
        code: "COSHH",
        section: "Control of Substances Hazardous to Health Regulations 2002",
        url: "https://www.hse.gov.uk/coshh/",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "tlevel-eey-child-development",
    courseId: "tlevel-education-early-years",
    title: "Patterns of child development",
    summary:
      "Areas of development, sequence and rate, and typical physical, cognitive and social development.",
    objectives: [
      "Describe the main areas of child development",
      "Explain the difference between the sequence and the rate of development",
      "Distinguish between gross and fine motor skills",
      "Explain why development should be viewed holistically",
    ],
    explanation: [
      "Development is usually described in areas: physical (gross and fine motor skills), cognitive (thinking, memory, problem solving and perception), communication and language, and social and emotional (attachments, expressing feelings, self-regulation and friendships).",
      "Gross motor skills use large movements of the whole body, such as crawling, walking, running and climbing. Fine motor skills use smaller, more precise movements, such as a pincer grasp, threading beads or holding a pencil.",
      "Most children develop in a broadly predictable sequence (for example, sitting before standing and standing before walking), but the rate varies a lot. The age at which children walk independently differs widely; many are still learning up to about 18 months, and that can be entirely typical.",
      "Areas of development are interconnected, so practitioners look at the whole child. A toddler who starts walking can explore more, which supports cognitive development and new language; a child with a secure attachment has the confidence to play with other children.",
      "Practitioners need to understand development from birth to 19 years. In adolescence, physical changes at puberty happen alongside growing independence, abstract thinking and changing peer relationships. Practitioners use observation to track progress against expected patterns and to plan next steps, sharing concerns with the setting's SENCo or lead practitioner when needed.",
    ],
    workedExample: {
      question:
        "A practitioner observes a two-year-old kicking a ball, turning the pages of a board book one at a time, naming animals in the book and handing a toy to a friend. Sort the observations into areas of development.",
      steps: [
        "Kicking a ball uses large whole-body movements: physical development (gross motor).",
        "Turning single pages needs small, controlled hand movements: physical development (fine motor).",
        "Naming animals shows vocabulary and recognition: communication and language, and cognitive development.",
        "Handing a toy to a friend shows sharing and early friendship: social and emotional development.",
        "Note that one activity (sharing the book) can show several areas at once, which is why development is viewed holistically.",
      ],
      answer:
        "Gross motor, fine motor, communication and language (with cognitive), and social and emotional development",
    },
    keyTerms: [
      {
        term: "Gross motor skills",
        definition: "Skills using large movements of the whole body.",
      },
      {
        term: "Fine motor skills",
        definition: "Skills using small, precise movements, especially of the hands.",
      },
      {
        term: "Sequence of development",
        definition: "The broadly predictable order in which skills develop.",
      },
      {
        term: "Holistic development",
        definition:
          "The idea that all areas of development are linked and affect one another.",
      },
    ],
    misconceptions: [
      {
        wrong: "All children should reach each milestone at exactly the same age.",
        right:
          "The sequence is broadly similar, but the rate varies. Milestones are guides, not deadlines.",
      },
      {
        wrong: "Areas of development can be supported separately.",
        right:
          "They are interconnected, so one activity often supports several areas at once.",
      },
    ],
    retrieval: [
      {
        q: "Give one example of a fine motor skill.",
        a: "E.g. pincer grasp, threading beads, holding a pencil.",
      },
      {
        q: "What is the difference between sequence and rate of development?",
        a: "Sequence is the order skills appear; rate is how quickly they appear.",
      },
      {
        q: "Name the four broad areas of development.",
        a: "Physical, cognitive, communication and language, social and emotional.",
      },
    ],
    quiz: [
      {
        id: "cd1",
        q: "Which of these is a gross motor skill?",
        options: [
          "Using a pincer grasp",
          "Climbing stairs",
          "Threading beads",
          "Turning a page",
        ],
        answer: 1,
        explain:
          "Climbing stairs uses large movements of the whole body. The others are fine motor skills.",
      },
      {
        id: "cd2",
        q: "Two children learn to walk at 11 months and 17 months. What does this show?",
        options: [
          "The sequence of development varies",
          "The rate of development varies",
          "The younger walker has a delay",
          "The older walker has a delay",
        ],
        answer: 1,
        explain:
          "Both follow the same sequence, but at different rates. Both ages can be within the typical range.",
      },
      {
        id: "cd3",
        q: "Why should practitioners view development holistically?",
        options: [
          "Because areas of development are interconnected",
          "Because only physical development can be observed",
          "Because milestones are fixed",
          "Because each area develops separately",
        ],
        answer: 0,
        explain:
          "Progress in one area supports others, so the whole child should be considered.",
      },
    ],
    specRefs: [
      {
        board: "NCFE",
        code: "T Level Education and Early Years 610/5748/4",
        section:
          "Element 5 Child development (5.1 How characteristics of cognitive, physical, social and emotional learning typically develop from birth to 19 years)",
        url: "https://www.ncfe.org.uk/media/ddyd0f2j/610-5748-4-qualification-specification-v2-0.pdf",
      },
      {
        board: "NCFE",
        code: "T Level Education and Early Years 603/5829/4",
        section: "Element 7 Child development (students who started before 2025)",
        url: "https://www.ncfe.org.uk/media/gdteldbv/603-5829-4-qualification-specification.pdf",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "tlevel-construction-building-regs",
    courseId: "tlevel-construction-design",
    title: "Building Regulations and energy efficiency",
    summary:
      "What the Building Regulations and Approved Documents do, how compliance is checked, and heat loss through the building fabric.",
    objectives: [
      "Explain the purpose of the Building Regulations and Approved Documents",
      "Identify the main Parts, including B, L and M",
      "Describe who checks compliance in England",
      "Calculate fabric heat loss using U-values",
    ],
    explanation: [
      "In England, the Building Regulations 2010 set minimum standards for the design and construction of buildings, covering areas such as structure, fire safety, ventilation, drainage, energy efficiency and access. They apply to most new buildings, extensions and many alterations.",
      "Approved Documents give practical guidance on how to meet each Part: for example Part A (structure), Part B (fire safety), Part L (conservation of fuel and power), Part M (access to and use of buildings) and Part O (overheating). Following an Approved Document is not the only way to comply, but it is the usual way to show compliance.",
      "Compliance is checked by a building control body: either the local authority or a registered building control approver. For higher-risk buildings, such as many tall residential buildings, the Building Safety Regulator is the building control authority. Failing to comply can lead to enforcement and prosecution.",
      "Part L limits energy use and carbon emissions. The U-value of an element (in W/m²K) is the rate of heat loss through 1 m² for each 1 K (1 °C) difference between inside and outside. A lower U-value means better insulation. Fabric heat loss Q = U × A × ΔT.",
      "Sustainable design also considers embodied carbon in materials, renewable energy, water efficiency and whole-life performance. Tools include Energy Performance Certificates (EPCs) and voluntary assessment schemes such as BREEAM and the Home Quality Mark.",
    ],
    workedExample: {
      question:
        "A 40 m² external wall has a U-value of 0.26 W/m²K. It is upgraded to 0.18 W/m²K. With 20 °C inside and 0 °C outside, find the heat loss before and after, and the percentage reduction.",
      steps: [
        "ΔT = 20 − 0 = 20 K.",
        "Before: Q = U × A × ΔT = 0.26 × 40 × 20 = 208 W.",
        "After: Q = 0.18 × 40 × 20 = 144 W.",
        "Reduction = 208 − 144 = 64 W.",
        "Percentage reduction = 64 ÷ 208 × 100 = 30.8% (to 1 d.p.).",
      ],
      answer: "208 W before, 144 W after: a 64 W (30.8%) reduction",
    },
    keyTerms: [
      {
        term: "Building Regulations",
        definition:
          "Legal minimum standards for the design and construction of buildings.",
      },
      {
        term: "Approved Document",
        definition:
          "Government guidance showing ways to meet a Part of the Building Regulations.",
      },
      {
        term: "U-value",
        definition:
          "The rate of heat transfer through 1 m² of an element per 1 K temperature difference, in W/m²K.",
      },
      {
        term: "Embodied carbon",
        definition:
          "The carbon emissions from making, transporting and installing a material or product.",
      },
    ],
    misconceptions: [
      {
        wrong: "A higher U-value means better insulation.",
        right: "A lower U-value means less heat is lost, so it insulates better.",
      },
      {
        wrong: "Planning permission and Building Regulations approval are the same thing.",
        right:
          "Planning controls use and appearance of development; Building Regulations control how it is built. A project may need one, both or neither.",
      },
      {
        wrong: "Approved Documents are the law itself.",
        right:
          "The Regulations are the law. Approved Documents are guidance on ways to comply with them.",
      },
    ],
    retrieval: [
      {
        q: "Which Part of the Building Regulations covers conservation of fuel and power?",
        a: "Part L.",
      },
      {
        q: "Write the equation for fabric heat loss.",
        a: "Q = U × A × ΔT.",
      },
      {
        q: "Who can act as the building control body for an ordinary project in England?",
        a: "The local authority or a registered building control approver.",
      },
    ],
    quiz: [
      {
        id: "br1",
        q: "Which Approved Document covers fire safety?",
        options: ["Part A", "Part B", "Part L", "Part M"],
        answer: 1,
        explain:
          "Part B is fire safety. Part A is structure, Part L is fuel and power, and Part M is access.",
      },
      {
        id: "br2",
        q: "A 10 m² window has a U-value of 1.4 W/m²K. What is the heat loss when ΔT = 15 K?",
        options: ["14 W", "21 W", "150 W", "210 W"],
        answer: 3,
        explain: "Q = U × A × ΔT = 1.4 × 10 × 15 = 210 W.",
      },
      {
        id: "br3",
        q: "Who is the building control authority for higher-risk buildings in England?",
        options: [
          "The local planning authority",
          "The Building Safety Regulator",
          "The Health and Safety Executive's CDM team",
          "The principal contractor",
        ],
        answer: 1,
        explain:
          "The Building Safety Regulator is the building control authority for higher-risk buildings.",
      },
    ],
    specRefs: [
      {
        board: "Pearson",
        code: "T Level Design, Surveying and Planning 610/5310/7",
        section:
          "CK10 Sustainability (CK10.4 Approved Document L); CK14 Law (CK14.6 Building Regulations)",
        url: "https://qualifications.pearson.com/content/dam/pdf/TLevels/construction/2025/specification-and-sample-assessments/tlevel-design-surveying-and-planning-for-construction-gen2.pdf",
      },
      {
        board: "MHCLG",
        code: "Approved Documents",
        section: "Parts A–T and Regulation 7",
        url: "https://www.gov.uk/government/collections/approved-documents",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "tlevel-onsite-cdm-2015",
    courseId: "tlevel-onsite-construction",
    title: "Construction health and safety: CDM 2015",
    summary:
      "The duty holders under CDM 2015, when projects must be notified, and the construction phase plan.",
    objectives: [
      "Describe the duty holders under CDM 2015 and their main duties",
      "Explain when a principal designer and principal contractor must be appointed",
      "Apply the HSE notification thresholds",
      "Explain the purpose of the construction phase plan and site induction",
    ],
    explanation: [
      "The Construction (Design and Management) Regulations 2015 (CDM 2015) are made under the Health and Safety at Work etc. Act 1974. They aim to make sure health and safety is planned and managed through every stage of a construction project, from design to completion.",
      "The duty holders are the client (commercial or domestic), designers, the principal designer, contractors, the principal contractor and workers. Everyone must co-operate, share information and only take on work they have the skills, knowledge and experience to do safely.",
      "Where there is, or is likely to be, more than one contractor, the client must appoint in writing a principal designer (to control the pre-construction phase) and a principal contractor (to control the construction phase). If the client does not, the client must carry out those duties.",
      "A project is notifiable to HSE (using form F10) if the construction work is expected to last longer than 30 working days and have more than 20 workers working at the same time at any point, or to exceed 500 person days. The client has the duty to notify.",
      "Every project needs a written construction phase plan, drawn up by the principal contractor (or by the only contractor) before the construction phase begins. The principal contractor must also make sure every worker has a site-specific induction. Day-to-day controls include risk assessments, method statements and permits to work.",
    ],
    workedExample: {
      question:
        "A shop owner hires a builder, an electrician and a plasterer to refurbish a shop. The work will last 40 working days with up to 25 workers on site at the same time. What does CDM 2015 require?",
      steps: [
        "The shop owner is a commercial client because the work is for a business.",
        "There is more than one contractor, so the client must appoint a principal designer and a principal contractor in writing.",
        "The work lasts longer than 30 working days and has more than 20 workers at the same time, so it is notifiable to HSE.",
        "The client must submit the F10 notification (someone can do it on their behalf).",
        "The principal contractor must prepare a construction phase plan before work starts and give every worker a site induction.",
      ],
      answer:
        "Appoint a principal designer and principal contractor, notify HSE via F10, and have a construction phase plan and inductions in place",
    },
    keyTerms: [
      {
        term: "Principal contractor",
        definition:
          "The contractor appointed to plan, manage, monitor and co-ordinate health and safety in the construction phase.",
      },
      {
        term: "Principal designer",
        definition:
          "The designer appointed to plan, manage and co-ordinate health and safety in the pre-construction phase.",
      },
      {
        term: "Construction phase plan",
        definition:
          "A written plan setting out how health and safety will be managed during construction.",
      },
      {
        term: "F10",
        definition: "The form used to notify HSE of a notifiable construction project.",
      },
    ],
    misconceptions: [
      {
        wrong: "CDM 2015 only applies to large projects.",
        right:
          "It applies to all construction projects, including domestic ones. Only notification depends on size.",
      },
      {
        wrong: "Only the principal contractor is responsible for safety on site.",
        right:
          "Every duty holder, including workers, has duties, and everyone must co-operate.",
      },
      {
        wrong: "The principal contractor notifies HSE.",
        right: "The client has the duty to notify, although someone may do it on their behalf.",
      },
    ],
    retrieval: [
      {
        q: "Under which Act are the CDM Regulations 2015 made?",
        a: "The Health and Safety at Work etc. Act 1974.",
      },
      {
        q: "When must a principal contractor be appointed?",
        a: "When there is, or is likely to be, more than one contractor on the project.",
      },
      {
        q: "Who must prepare the construction phase plan?",
        a: "The principal contractor, or the contractor if there is only one.",
      },
    ],
    quiz: [
      {
        id: "cdm1",
        q: "Which project is notifiable to HSE?",
        options: [
          "20 working days with 15 workers at once (300 person days)",
          "35 working days with 25 workers at once",
          "35 working days with 10 workers at once (350 person days)",
          "A one-day job with 5 workers",
        ],
        answer: 1,
        explain:
          "It lasts longer than 30 working days and has more than 20 workers at the same time. None of the other projects meets either test: none exceeds 500 person days, and none combines more than 30 days with more than 20 workers at once.",
      },
      {
        id: "cdm2",
        q: "On a project involving more than one contractor, who appoints the principal contractor?",
        options: ["HSE", "The principal designer", "The client", "The workers"],
        answer: 2,
        explain:
          "The client must appoint the principal designer and principal contractor in writing.",
      },
      {
        id: "cdm3",
        q: "What must every worker receive from the principal contractor?",
        options: [
          "A site-specific induction",
          "An F10 form",
          "A copy of the design drawings",
          "A CSCS card",
        ],
        answer: 0,
        explain:
          "The principal contractor must make sure all workers have a site-specific induction.",
      },
    ],
    specRefs: [
      {
        board: "City & Guilds",
        code: "T Level Onsite Construction 603/6917/6",
        section: "Core: Health and safety",
        url: "https://www.cityandguilds.com/qualifications-and-apprenticeships/construction/construction/8711-t-level-technical-qualification-in-onsite-construction",
      },
      {
        board: "HSE",
        code: "CDM 2015",
        section: "Construction (Design and Management) Regulations 2015",
        url: "https://www.hse.gov.uk/construction/cdm/2015/index.htm",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "tlevel-accounting-double-entry",
    courseId: "tlevel-accounting",
    title: "Double-entry bookkeeping and the trial balance",
    summary:
      "The accounting equation, debits and credits, ledger accounts and the trial balance.",
    objectives: [
      "Apply the accounting equation",
      "Record transactions using the rules of double entry",
      "Balance off ledger accounts and prepare a trial balance",
      "Identify errors that a trial balance does not reveal",
    ],
    explanation: [
      "The accounting equation is assets = liabilities + capital. Every transaction changes at least two items, but the equation always balances.",
      "Double entry records each transaction twice: a debit in one account and an equal credit in another. Debits increase assets and expenses (and drawings); credits increase liabilities, capital and income. The memory aid DEAD CLIC helps: Debit for Expenses, Assets, Drawings; Credit for Liabilities, Income, Capital.",
      "Ledger accounts are often drawn as T-accounts, with debits on the left and credits on the right. To balance off an account, total both sides, put the difference on the smaller side as the balance carried down (c/d), and bring it down on the opposite side as the balance brought down (b/d).",
      "A trial balance lists every ledger balance in a debit or credit column. If the double entry is arithmetically correct, the two totals agree. It is a check on the books and the starting point for preparing the income statement and statement of financial position.",
      "A trial balance that agrees is not proof there are no errors. Errors of omission, commission, principle, original entry, reversal and compensating errors do not stop the totals agreeing.",
    ],
    workedExample: {
      question:
        "A new business: (1) the owner pays £5,000 into the business bank account; (2) buys equipment for £1,200, paying by bank; (3) buys goods for resale on credit for £800; (4) makes cash sales of £950, banked. Record the entries and prepare a trial balance.",
      steps: [
        "(1) Debit Bank £5,000; credit Capital £5,000.",
        "(2) Debit Equipment £1,200; credit Bank £1,200.",
        "(3) Debit Purchases £800; credit Trade payables £800.",
        "(4) Debit Bank £950; credit Sales £950.",
        "Balance off Bank: £5,000 + £950 − £1,200 = £4,750 debit.",
        "Debit column: Bank £4,750 + Equipment £1,200 + Purchases £800 = £6,750.",
        "Credit column: Capital £5,000 + Trade payables £800 + Sales £950 = £6,750. The totals agree. ✓",
      ],
      answer: "Trial balance totals £6,750 debit and £6,750 credit",
    },
    keyTerms: [
      {
        term: "Accounting equation",
        definition: "Assets = liabilities + capital.",
      },
      {
        term: "Debit",
        definition:
          "An entry on the left of a ledger account; increases assets, expenses and drawings.",
      },
      {
        term: "Credit",
        definition:
          "An entry on the right of a ledger account; increases liabilities, capital and income.",
      },
      {
        term: "Trial balance",
        definition:
          "A list of all ledger balances used to check that total debits equal total credits.",
      },
    ],
    misconceptions: [
      {
        wrong: "Debit means money coming in and credit means money going out.",
        right:
          "It depends on the account. Money received is a debit in the bank account, but the matching credit goes to another account such as Sales.",
      },
      {
        wrong: "If the trial balance agrees, the accounts are error-free.",
        right:
          "Several types of error, such as omission or principle, leave the totals in agreement.",
      },
      {
        wrong: "Buying goods on credit reduces the bank balance.",
        right:
          "No money leaves the bank yet. The credit entry goes to Trade payables, a liability.",
      },
    ],
    retrieval: [
      {
        q: "State the accounting equation.",
        a: "Assets = liabilities + capital.",
      },
      {
        q: "What are the double entries when a business pays a supplier £300 by bank?",
        a: "Debit Trade payables £300; credit Bank £300.",
      },
      {
        q: "Name two errors a trial balance will not reveal.",
        a: "E.g. omission, commission, principle, original entry, reversal, compensating.",
      },
    ],
    quiz: [
      {
        id: "de1",
        q: "A business has assets of £50,000 and liabilities of £18,000. What is its capital?",
        options: ["£68,000", "£32,000", "£18,000", "£50,000"],
        answer: 1,
        explain: "Capital = assets − liabilities = £50,000 − £18,000 = £32,000.",
      },
      {
        id: "de2",
        q: "A business sells goods on credit to a customer for £400. What is the double entry?",
        options: [
          "Debit Sales; credit Trade receivables",
          "Debit Trade receivables; credit Sales",
          "Debit Bank; credit Sales",
          "Debit Sales; credit Bank",
        ],
        answer: 1,
        explain:
          "The customer now owes the business (an asset, so debit Trade receivables), and income increases (credit Sales).",
      },
      {
        id: "de3",
        q: "A purchase invoice is never entered in the books. What type of error is this?",
        options: [
          "Error of commission",
          "Error of principle",
          "Error of omission",
          "Casting error",
        ],
        answer: 2,
        explain:
          "An error of omission leaves out a transaction completely, so the trial balance still agrees.",
      },
    ],
    specRefs: [
      {
        board: "Pearson",
        code: "T Level Accounting 610/0007/9",
        section:
          "Element 13 (13.4 Double entry principles and the accounting equation)",
        url: "https://qualifications.pearson.com/content/dam/pdf/TLevels/accounting/2022/specification-and-sample-assessment-materials/acc-specification-2026.pdf",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "tlevel-legal-civil-courts",
    courseId: "tlevel-legal-services",
    title: "The civil court system and track allocation",
    summary:
      "The civil courts of England and Wales, routes of appeal, and how claims are allocated to tracks.",
    objectives: [
      "Describe the civil courts of first instance and the appeal courts",
      "Name the three divisions of the High Court",
      "Explain how claims are allocated to the four tracks",
      "Outline pre-action conduct and alternative dispute resolution",
    ],
    explanation: [
      "Most civil claims start in the County Court. Higher-value or more complex claims may start in the High Court, which has three divisions: the King's Bench Division (for example contract and tort claims), the Chancery Division (for example business, property, trusts and insolvency) and the Family Division.",
      "Appeals usually go to the next level of judge, and permission to appeal is normally needed. Above the High Court is the Court of Appeal (Civil Division), and the highest appeal court is the UK Supreme Court, which hears cases of general public importance.",
      "Under the Civil Procedure Rules (CPR), a defended claim is allocated to a track. The small claims track is normally for claims worth up to £10,000 (lower limits apply to personal injury). The fast track is for claims up to £25,000 with a trial of no more than one day. The intermediate track, introduced in October 2023, covers many claims up to £100,000 with a trial of up to three days. More complex or higher-value claims go to the multi-track.",
      "Before issuing a claim, parties are expected to follow pre-action conduct and any relevant pre-action protocol: exchanging information, trying to settle, and considering alternative dispute resolution (ADR) such as negotiation, mediation or arbitration. Courts can penalise unreasonable refusal to consider ADR, for example through costs.",
      "Your specification may describe three tracks; the intermediate track was added to the CPR for most claims issued on or after 1 October 2023, so check which version your exam uses.",
    ],
    workedExample: {
      question:
        "Which track is each claim likely to be allocated to? (a) An unpaid invoice for £6,000. (b) A breach of contract claim for £18,000 needing a half-day trial. (c) A £60,000 claim with a two-day trial, one claimant and one defendant.",
      steps: [
        "(a) £6,000 is not more than £10,000 and it is not a personal injury claim, so the small claims track.",
        "(b) £18,000 is above £10,000 but not more than £25,000, and the trial will last less than a day, so the fast track.",
        "(c) £60,000 is above £25,000 but not more than £100,000; the trial is under three days and there is one claimant against one defendant (the intermediate track allows one claimant against one or two defendants, or two claimants against one defendant), so the intermediate track.",
      ],
      answer: "(a) Small claims track, (b) fast track, (c) intermediate track",
    },
    keyTerms: [
      {
        term: "Court of first instance",
        definition: "The court where a case is first heard, such as the County Court.",
      },
      {
        term: "Civil Procedure Rules (CPR)",
        definition:
          "The rules governing procedure in the civil courts of England and Wales.",
      },
      {
        term: "Track allocation",
        definition:
          "Assigning a defended claim to the small claims, fast, intermediate or multi-track.",
      },
      {
        term: "Alternative dispute resolution (ADR)",
        definition:
          "Ways of settling disputes outside court, such as negotiation, mediation and arbitration.",
      },
    ],
    misconceptions: [
      {
        wrong: "All civil cases start in the High Court.",
        right: "Most start in the County Court; the High Court deals with higher-value or complex claims.",
      },
      {
        wrong: "Track allocation depends only on the amount claimed.",
        right:
          "Value is the starting point, but the court also considers complexity, trial length, expert evidence and the parties.",
      },
      {
        wrong: "It is still called the Queen's Bench Division.",
        right: "It became the King's Bench Division in September 2022.",
      },
    ],
    retrieval: [
      {
        q: "Name the three divisions of the High Court.",
        a: "King's Bench, Chancery and Family.",
      },
      {
        q: "What is the normal upper limit for the small claims track?",
        a: "£10,000 (lower for personal injury).",
      },
      {
        q: "What is the highest appeal court for civil cases in the UK?",
        a: "The UK Supreme Court.",
      },
    ],
    quiz: [
      {
        id: "cc1",
        q: "Where do most civil claims start?",
        options: [
          "The Crown Court",
          "The County Court",
          "The Court of Appeal",
          "The Magistrates' Court",
        ],
        answer: 1,
        explain:
          "The County Court hears most civil claims. The Crown Court deals with criminal cases.",
      },
      {
        id: "cc2",
        q: "What is the maximum value of a claim on the fast track?",
        options: ["£10,000", "£25,000", "£50,000", "£100,000"],
        answer: 1,
        explain:
          "The fast track is for claims up to £25,000 with a trial of no more than one day.",
      },
      {
        id: "cc3",
        q: "Which High Court division would normally hear a dispute about a trust?",
        options: [
          "King's Bench Division",
          "Chancery Division",
          "Family Division",
          "Court of Appeal (Civil Division)",
        ],
        answer: 1,
        explain:
          "The Chancery Division deals with business, property, trusts and insolvency matters.",
      },
    ],
    specRefs: [
      {
        board: "Pearson",
        code: "T Level Legal Services 610/2226/3",
        section:
          "Element 13 (13.1.3 Hierarchy of the courts; 13.6 Civil Procedure Rules)",
        url: "https://qualifications.pearson.com/content/dam/pdf/TLevels/legal-services/2023/specification-and-sample-assessment-materials/leg-specification-2025.pdf",
      },
      {
        board: "Ministry of Justice",
        code: "CPR Part 26",
        section: "26.9 Scope of each track",
        url: "https://www.justice.gov.uk/courts/procedure-rules/civil/rules/part26",
      },
    ],
    reviewed: R,
    version: V,
  },

  // ——— Level 2 & 3 vocational ———
  {
    id: "ctech-it-networks",
    courseId: "cambridge-technicals",
    title: "Network characteristics and IP addressing",
    summary:
      "Network models, topologies, IP addresses, subnet masks and default gateways.",
    objectives: [
      "Compare peer-to-peer and client–server networks",
      "Describe bus, star, ring and mesh topologies",
      "Explain the role of an IP address, subnet mask and default gateway",
      "Calculate the number of usable hosts on a subnet",
    ],
    explanation: [
      "In a client–server network, central servers provide services such as file storage, authentication or DNS to client devices. This makes security, backup and management easier, but it costs more and the server can be a single point of failure. In a peer-to-peer network, each device shares resources directly; it is cheap and simple but harder to secure and manage.",
      "Topology is the layout of a network. In a star, every device connects to a central switch: easy to add devices, and one cable failure only affects one device, but if the switch fails the whole network stops. A bus uses a single backbone cable; a ring passes data around a loop; a mesh links devices with many connections, giving high resilience at higher cost.",
      "An IPv4 address, such as 192.168.1.20, identifies a device on a network. The subnet mask, such as 255.255.255.0 (or /24), shows which part of the address identifies the network and which part identifies the host.",
      "The default gateway is the address of the router that forwards traffic to other networks, including the internet. Devices on the same subnet can communicate directly; traffic for other networks is sent to the gateway.",
      "A subnet with h host bits has 2ʰ − 2 usable host addresses, because the all-zeros address identifies the network and the all-ones address is the broadcast address.",
    ],
    workedExample: {
      question:
        "A device has the IP address 192.168.1.20 with subnet mask 255.255.255.0. Find the network address, the broadcast address and the number of usable host addresses.",
      steps: [
        "255.255.255.0 means the first three octets (24 bits) identify the network, leaving 8 host bits.",
        "Network address: set the host bits to 0, giving 192.168.1.0.",
        "Broadcast address: set the host bits to 1, giving 192.168.1.255.",
        "Usable hosts = 2⁸ − 2 = 256 − 2 = 254 (192.168.1.1 to 192.168.1.254).",
      ],
      answer: "Network 192.168.1.0, broadcast 192.168.1.255, 254 usable hosts",
    },
    keyTerms: [
      {
        term: "Topology",
        definition: "The physical or logical layout of devices and connections in a network.",
      },
      {
        term: "Subnet mask",
        definition:
          "A value showing which part of an IP address is the network and which is the host.",
      },
      {
        term: "Default gateway",
        definition:
          "The router address a device sends traffic to when the destination is on another network.",
      },
      {
        term: "Client–server",
        definition:
          "A network model in which central servers provide services to client devices.",
      },
    ],
    misconceptions: [
      {
        wrong: "In a star topology, one device failing brings the whole network down.",
        right:
          "Only failure of the central switch does that; a single device or cable failure affects just that device.",
      },
      {
        wrong: "A /24 subnet can hold 256 devices.",
        right:
          "It has 256 addresses, but the network and broadcast addresses cannot be assigned, leaving 254.",
      },
    ],
    retrieval: [
      {
        q: "What is the main weakness of a star topology?",
        a: "If the central switch fails, the whole network fails.",
      },
      {
        q: "What does the default gateway do?",
        a: "It routes traffic to other networks, such as the internet.",
      },
      {
        q: "How many usable hosts does a subnet with 8 host bits have?",
        a: "2⁸ − 2 = 254.",
      },
    ],
    quiz: [
      {
        id: "nw1",
        q: "How many usable host addresses are there on a subnet with mask 255.255.255.192 (/26)?",
        options: ["64", "62", "126", "30"],
        answer: 1,
        explain: "/26 leaves 6 host bits: 2⁶ − 2 = 64 − 2 = 62.",
      },
      {
        id: "nw2",
        q: "Which network model makes centralised backup and security easiest?",
        options: ["Peer-to-peer", "Client–server", "Bus", "Ring"],
        answer: 1,
        explain:
          "Client–server networks store data and manage users centrally. Bus and ring are topologies, not network models.",
      },
      {
        id: "nw3",
        q: "Which topology gives the most resilience because devices have several connections?",
        options: ["Bus", "Star", "Ring", "Mesh"],
        answer: 3,
        explain:
          "In a mesh, data can take other routes if a link fails, though it costs more to cable.",
      },
    ],
    specRefs: [
      {
        board: "OCR",
        code: "Cambridge Technicals Level 3 IT",
        section: "Unit 1 Fundamentals of IT (LO3: 3.3 Networking characteristics)",
        url: "https://www.ocr.org.uk/Images/267350-fundamentals-of-it.pdf",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "applied-general-break-even",
    courseId: "applied-general",
    title: "Break-even analysis",
    summary:
      "Fixed and variable costs, contribution, break-even output and margin of safety.",
    objectives: [
      "Distinguish between fixed, variable, semi-variable and total costs",
      "Calculate contribution per unit and break-even output",
      "Calculate and interpret the margin of safety",
      "Evaluate the uses and limitations of break-even analysis",
    ],
    explanation: [
      "Fixed costs, such as rent and salaries, do not change with output in the short run. Variable costs, such as raw materials, rise with each unit produced. Semi-variable costs have a fixed part and a variable part, such as a phone contract with a line rental and a call charge. Total cost = fixed costs + total variable costs.",
      "Contribution per unit = selling price − variable cost per unit. It is the amount each unit sold contributes towards covering fixed costs and then making profit.",
      "Break-even output = fixed costs ÷ contribution per unit. At break-even, total revenue equals total cost, so the business makes neither a profit nor a loss.",
      "The margin of safety is the amount by which actual or planned sales exceed break-even: margin of safety = actual output − break-even output. It shows how far sales could fall before the business makes a loss. Profit = margin of safety × contribution per unit.",
      "Break-even analysis is quick and useful for planning, pricing and supporting loan applications. However, it assumes that all output is sold at one price and that costs are fixed and linear, which is rarely true in practice, so conclusions must be treated with care.",
    ],
    workedExample: {
      question:
        "A business has fixed costs of £12,000 a month. It sells each product for £25, and the variable cost per unit is £10. It expects to sell 1,100 units a month. Find the break-even output, the margin of safety and the profit.",
      steps: [
        "Contribution per unit = £25 − £10 = £15.",
        "Break-even output = £12,000 ÷ £15 = 800 units.",
        "Margin of safety = 1,100 − 800 = 300 units (300 × £25 = £7,500 of revenue).",
        "Profit = 300 × £15 = £4,500.",
        "Check: revenue 1,100 × £25 = £27,500; total cost £12,000 + 1,100 × £10 = £23,000; profit £4,500. ✓",
      ],
      answer: "Break-even at 800 units, margin of safety 300 units, profit £4,500",
    },
    keyTerms: [
      {
        term: "Fixed costs",
        definition: "Costs that do not change with output in the short run.",
      },
      {
        term: "Contribution per unit",
        definition: "Selling price minus variable cost per unit.",
      },
      {
        term: "Break-even point",
        definition:
          "The output at which total revenue equals total cost: no profit and no loss.",
      },
      {
        term: "Margin of safety",
        definition: "The amount by which actual sales exceed break-even sales.",
      },
    ],
    misconceptions: [
      {
        wrong: "Break-even output = fixed costs ÷ selling price.",
        right:
          "Divide fixed costs by contribution per unit (price minus variable cost), not by price.",
      },
      {
        wrong: "Fixed costs never change.",
        right:
          "They do not change with output in the short run, but they can change over time, for example when rent rises.",
      },
      {
        wrong: "Contribution is the same as profit.",
        right:
          "Contribution first covers fixed costs. Only contribution beyond break-even is profit.",
      },
    ],
    retrieval: [
      {
        q: "Write the formula for break-even output.",
        a: "Fixed costs ÷ contribution per unit.",
      },
      {
        q: "What happens to break-even output if the selling price rises and costs stay the same?",
        a: "It falls, because contribution per unit increases.",
      },
      {
        q: "What does the margin of safety show?",
        a: "How far sales could fall before the business makes a loss.",
      },
    ],
    quiz: [
      {
        id: "be1",
        q: "Fixed costs are £9,000, price is £20 and variable cost is £8 per unit. What is break-even output?",
        options: ["450 units", "750 units", "1,125 units", "321 units"],
        answer: 1,
        explain: "Contribution = £20 − £8 = £12. Break-even = £9,000 ÷ £12 = 750 units.",
      },
      {
        id: "be2",
        q: "A business breaks even at 750 units and sells 1,000 units. What is its margin of safety?",
        options: ["250 units", "1,750 units", "750 units", "1,000 units"],
        answer: 0,
        explain: "Margin of safety = 1,000 − 750 = 250 units.",
      },
      {
        id: "be3",
        q: "Which is a limitation of break-even analysis?",
        options: [
          "It shows the output needed to avoid a loss",
          "It assumes all output is sold at a single price",
          "It helps when setting prices",
          "It can support a loan application",
        ],
        answer: 1,
        explain:
          "In practice businesses offer discounts and costs are not perfectly linear, so the model simplifies reality. The other options are uses.",
      },
    ],
    specRefs: [
      {
        board: "Pearson",
        code: "BTEC Nationals Business (2016)",
        section: "Unit 3 Personal and Business Finance (E2 Break-even analysis)",
        url: "https://qualifications.pearson.com/content/dam/pdf/BTEC-Nationals/Business/2016/specification-and-sample-assessments/btecnationals-bus-exdip-spec.pdf",
      },
      {
        board: "AQA",
        code: "Applied General Business 1830",
        section: "Unit 1 Financial planning and analysis",
        url: "https://www.aqa.org.uk/subjects/business/applied-general/business-1830/specification",
      },
    ],
    reviewed: R,
    version: V,
  },
];
