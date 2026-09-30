import type { Topic } from "@/lib/types";

const R = "2026-09-30";
const V = "1.0";
const V_UPDATED = "1.1";

export const POST16_TOPICS: Topic[] = [
  {
    id: "alevel-maths-differentiation",
    courseId: "alevel-maths",
    title: "Differentiation from first principles to tangents",
    summary:
      "Gradients of curves, the power rule, and finding tangents and stationary points.",
    objectives: [
      "Interpret the derivative as the gradient of a curve",
      "Differentiate sums of powers of x using the power rule",
      "Find equations of tangents and locate stationary points",
    ],
    explanation: [
      "The derivative dy/dx gives the gradient of a curve at any point. From first principles, f′(x) is the limit of [f(x + h) − f(x)] ÷ h as h → 0.",
      "Power rule: if y = xⁿ, then dy/dx = n xⁿ⁻¹. Differentiate term by term; constants differentiate to 0.",
      "Rewrite roots and fractions as powers first: √x = x^½ and 1/x² = x⁻².",
      "A tangent at x = a has gradient f′(a) and passes through (a, f(a)). Use y − y₁ = m(x − x₁).",
      "Stationary points occur where dy/dx = 0. Use the second derivative: if d²y/dx² > 0 it is a minimum, if < 0 a maximum. If d²y/dx² = 0 the test is inconclusive; check the gradient either side.",
    ],
    workedExample: {
      question: "Find the stationary points of y = x³ − 3x and their nature.",
      steps: [
        "dy/dx = 3x² − 3.",
        "Set 3x² − 3 = 0, so x² = 1 and x = ±1.",
        "x = 1: y = −2; x = −1: y = 2.",
        "d²y/dx² = 6x. At x = 1 it is 6 > 0 (minimum); at x = −1 it is −6 < 0 (maximum).",
      ],
      answer: "Minimum at (1, −2); maximum at (−1, 2)",
    },
    keyTerms: [
      {
        term: "Derivative",
        definition: "The rate of change of a function; the gradient function.",
      },
      {
        term: "Stationary point",
        definition: "A point where the gradient is zero.",
      },
      {
        term: "Tangent",
        definition:
          "A straight line touching a curve at a point with the same gradient.",
      },
      {
        term: "Normal",
        definition:
          "A line perpendicular to the tangent at a point; gradient −1/m.",
      },
    ],
    misconceptions: [
      {
        wrong: "The derivative of 1/x is 1.",
        right: "Write it as x⁻¹; the derivative is −x⁻² = −1/x².",
      },
      {
        wrong: "A stationary point is always a maximum or minimum.",
        right:
          "It can also be a point of inflection; check with the second derivative or gradient either side.",
      },
    ],
    retrieval: [
      { q: "Differentiate y = 4x³.", a: "12x²" },
      { q: "What condition defines a stationary point?", a: "dy/dx = 0" },
      { q: "Differentiate y = √x.", a: "½x^(−½) = 1/(2√x)" },
    ],
    quiz: [
      {
        id: "df1",
        q: "Differentiate y = x³.",
        options: ["3x²", "x²", "3x", "x⁴/4"],
        answer: 0,
        explain: "Using the power rule, d(x³)/dx = 3x².",
      },
      {
        id: "df2",
        q: "What is the gradient of y = x² + 5x at x = 2?",
        options: ["9", "14", "4", "10"],
        answer: 0,
        explain: "dy/dx = 2x + 5 = 9 at x = 2.",
      },
      {
        id: "df3",
        q: "If d²y/dx² > 0 at a stationary point, it is a…",
        options: ["Maximum", "Minimum", "Asymptote", "Root"],
        answer: 1,
        explain:
          "A positive second derivative means the curve is concave up: a minimum.",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "7357",
        section: "G1–G3 Differentiation",
        url: "https://www.aqa.org.uk/subjects/mathematics/a-level/mathematics-7357/specification",
      },
    ],
    reviewed: R,
    version: V_UPDATED,
  },
  {
    id: "alevel-bio-cell-division",
    courseId: "alevel-biology",
    title: "Mitosis and the cell cycle",
    summary:
      "The stages of the cell cycle and mitosis, and why mitosis matters.",
    objectives: [
      "Describe the stages of the cell cycle",
      "Describe prophase, metaphase, anaphase and telophase",
      "Calculate a mitotic index",
    ],
    explanation: [
      "The cell cycle has interphase (growth and DNA replication), mitosis (nuclear division) and cytokinesis (division of the cytoplasm).",
      "Prophase: chromosomes condense and become visible, the nuclear envelope breaks down and spindle fibres form.",
      "Metaphase: chromosomes line up along the equator of the cell, attached to spindle fibres by their centromeres.",
      "Anaphase: centromeres divide and sister chromatids are pulled to opposite poles.",
      "Telophase: chromosomes reach the poles and uncoil, and nuclear envelopes reform. Mitosis produces two genetically identical daughter cells, used for growth, repair and asexual reproduction.",
      "Mitotic index = number of cells in mitosis ÷ total number of cells observed.",
    ],
    keyTerms: [
      {
        term: "Interphase",
        definition: "The stage where the cell grows and DNA replicates.",
      },
      {
        term: "Sister chromatids",
        definition:
          "Two identical copies of a DNA molecule (chromatids), made by replication and joined at a centromere to form one chromosome.",
      },
      {
        term: "Spindle fibres",
        definition: "Protein fibres that separate chromatids during mitosis.",
      },
      {
        term: "Mitotic index",
        definition: "The proportion of cells undergoing mitosis.",
      },
    ],
    misconceptions: [
      {
        wrong: "DNA replicates during mitosis.",
        right:
          "DNA replicates during interphase (S phase), before mitosis starts.",
      },
      {
        wrong: "Mitosis produces genetically varied cells.",
        right:
          "Mitosis produces genetically identical cells; meiosis introduces variation.",
      },
    ],
    retrieval: [
      {
        q: "In which stage do chromosomes line up at the equator?",
        a: "Metaphase.",
      },
      { q: "When does DNA replication happen?", a: "Interphase (S phase)." },
      { q: "20 of 400 cells are in mitosis. Mitotic index?", a: "0.05 (5%)" },
    ],
    quiz: [
      {
        id: "cd1",
        q: "Which process produces two genetically identical daughter cells?",
        options: ["Meiosis", "Mitosis", "Fertilisation", "Transcription"],
        answer: 1,
        explain: "Mitosis produces two genetically identical daughter cells.",
      },
      {
        id: "cd2",
        q: "In which stage are sister chromatids pulled to opposite poles?",
        options: ["Prophase", "Metaphase", "Anaphase", "Telophase"],
        answer: 2,
        explain: "Centromeres divide in anaphase and chromatids separate.",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "7402",
        section: "3.2.2 All cells arise from other cells",
        url: "https://www.aqa.org.uk/subjects/biology/a-level/biology-7402/specification",
      },
    ],
    reviewed: R,
    version: V_UPDATED,
  },
  {
    id: "alevel-chem-equilibria",
    courseId: "alevel-chemistry",
    title: "Chemical equilibria",
    summary:
      "Dynamic equilibrium, Le Chatelier's principle and the equilibrium constant Kc.",
    objectives: [
      "Describe dynamic equilibrium",
      "Use Le Chatelier's principle to predict shifts in equilibrium position",
      "Write and calculate Kc for homogeneous equilibria",
    ],
    explanation: [
      "In a closed system, a reversible reaction reaches dynamic equilibrium when the forward and reverse rates are equal and concentrations stay constant.",
      "Le Chatelier's principle: if a change is made to a system at equilibrium, the position shifts to oppose the change.",
      "Increasing pressure shifts equilibrium towards the side with fewer gas molecules. Increasing temperature shifts it in the endothermic direction.",
      "A catalyst increases the rates of the forward and reverse reactions equally. It helps equilibrium be reached faster but does not change the position.",
      "For aA + bB ⇌ cC + dD, Kc = [C]ᶜ[D]ᵈ ÷ [A]ᵃ[B]ᵇ. Only temperature changes the value of Kc.",
    ],
    keyTerms: [
      {
        term: "Dynamic equilibrium",
        definition:
          "Forward and reverse reactions happen at equal rates, so concentrations stay constant.",
      },
      {
        term: "Le Chatelier's principle",
        definition: "A system at equilibrium shifts to oppose a change.",
      },
      {
        term: "Kc",
        definition: "The equilibrium constant in terms of concentrations.",
      },
      { term: "Closed system", definition: "No substances enter or leave." },
    ],
    misconceptions: [
      {
        wrong: "At equilibrium the reactions stop.",
        right: "Both reactions continue at equal rates. It is dynamic.",
      },
      {
        wrong: "Changing concentration changes Kc.",
        right:
          "The position shifts but Kc stays the same; only temperature changes Kc.",
      },
    ],
    retrieval: [
      {
        q: "What does a catalyst do to the position of equilibrium?",
        a: "Nothing. It only helps equilibrium be reached faster.",
      },
      { q: "What is the only factor that changes Kc?", a: "Temperature." },
      {
        q: "Increasing pressure shifts equilibrium towards…?",
        a: "The side with fewer gas molecules.",
      },
    ],
    quiz: [
      {
        id: "eq1",
        q: "What does a catalyst do to the position of equilibrium?",
        options: [
          "Moves it right",
          "Moves it left",
          "Does not change it",
          "Stops equilibrium",
        ],
        answer: 2,
        explain: "A catalyst speeds up forward and reverse reactions equally.",
      },
      {
        id: "eq2",
        q: "N₂ + 3H₂ ⇌ 2NH₃. Increasing pressure shifts equilibrium…",
        options: ["Left", "Right", "Not at all", "It depends on catalyst"],
        answer: 1,
        explain: "The right side has 2 gas molecules versus 4 on the left.",
      },
      {
        id: "eq3",
        q: "Which change alters the value of Kc?",
        options: [
          "Adding more reactant",
          "Increasing pressure",
          "Changing temperature",
          "Adding a catalyst",
        ],
        answer: 2,
        explain: "Only temperature changes Kc.",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "7405",
        section: "3.1.6 Chemical equilibria; 3.1.10 Kp",
        url: "https://www.aqa.org.uk/subjects/chemistry/a-level/chemistry-7405/specification",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "alevel-psych-research-methods",
    courseId: "alevel-psychology",
    title: "Research methods: experiments and variables",
    summary:
      "Independent and dependent variables, hypotheses, experimental designs and controls.",
    objectives: [
      "Identify and operationalise IV and DV",
      "Write directional and non-directional hypotheses",
      "Compare independent groups, repeated measures and matched pairs designs",
    ],
    explanation: [
      "The independent variable (IV) is manipulated by the researcher; the dependent variable (DV) is measured. Operationalising means defining variables so they can be measured precisely.",
      "A directional hypothesis predicts the direction of a difference; a non-directional one predicts a difference without saying which way.",
      "Independent groups: different participants in each condition (no order effects, but participant variables). Repeated measures: the same participants do all conditions (controls participant variables, but order effects, so use counterbalancing). Matched pairs: participants matched on key variables (reduces participant variables, but time-consuming).",
      "Extraneous variables could affect the DV; if they vary systematically with the IV they become confounding variables.",
    ],
    keyTerms: [
      {
        term: "Independent variable",
        definition: "The variable the researcher manipulates.",
      },
      {
        term: "Dependent variable",
        definition: "The variable that is measured.",
      },
      {
        term: "Counterbalancing",
        definition:
          "Varying the order of conditions to reduce order effects, e.g. ABBA.",
      },
      {
        term: "Confounding variable",
        definition:
          "A variable other than the IV that systematically affects the DV.",
      },
    ],
    misconceptions: [
      {
        wrong:
          "Repeated measures has participant variables as its main problem.",
        right:
          "Repeated measures controls participant variables; its main problem is order effects.",
      },
      {
        wrong: "Operationalised just means 'defined'.",
        right:
          "It means defined in a precise, measurable way (e.g. 'number of words recalled out of 20').",
      },
    ],
    retrieval: [
      {
        q: "Which design uses the same participants in each condition?",
        a: "Repeated measures.",
      },
      { q: "How can order effects be reduced?", a: "Counterbalancing." },
      {
        q: "What is a directional hypothesis?",
        a: "One that predicts the direction of the difference or relationship.",
      },
    ],
    quiz: [
      {
        id: "rm1",
        q: "Which design avoids order effects?",
        options: [
          "Repeated measures",
          "Independent groups",
          "Counterbalanced repeated measures",
          "Longitudinal",
        ],
        answer: 1,
        explain:
          "Each participant does only one condition, so there are no order effects.",
      },
      {
        id: "rm2",
        q: "'Participants who sleep 8 hours recall more words than those who sleep 4 hours' is…",
        options: [
          "A null hypothesis",
          "A directional hypothesis",
          "A non-directional hypothesis",
          "An aim",
        ],
        answer: 1,
        explain: "It predicts which condition will do better.",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "7182",
        section: "4.2.3 Research methods",
        url: "https://www.aqa.org.uk/subjects/psychology/a-level/psychology-7182/specification",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "alevel-econ-supply-demand",
    courseId: "alevel-economics",
    title: "Supply, demand and market equilibrium",
    summary:
      "What shifts demand and supply curves and how price and quantity respond.",
    objectives: [
      "Distinguish movements along from shifts of demand and supply curves",
      "Analyse changes in equilibrium price and quantity",
      "Explain price elasticity of demand",
    ],
    explanation: [
      "A change in the good's own price causes a movement along the demand or supply curve. Changes in other factors shift the curve.",
      "Demand shifts with income, prices of substitutes and complements, tastes, advertising and population.",
      "Supply shifts with costs of production, technology, indirect taxes, subsidies and the number of firms.",
      "Equilibrium is where demand equals supply. If demand rises, equilibrium price and quantity both rise. If supply rises, price falls and quantity rises.",
      "Price elasticity of demand (PED) = % change in quantity demanded ÷ % change in price. If |PED| > 1, demand is price elastic.",
    ],
    keyTerms: [
      {
        term: "Equilibrium",
        definition: "Where quantity demanded equals quantity supplied.",
      },
      {
        term: "Substitute",
        definition: "A good that can be used in place of another.",
      },
      { term: "Complement", definition: "A good used together with another." },
      {
        term: "PED",
        definition:
          "The responsiveness of quantity demanded to a change in price.",
      },
    ],
    misconceptions: [
      {
        wrong: "A rise in price shifts the demand curve left.",
        right:
          "A change in the good's own price causes a movement along the curve, not a shift.",
      },
      {
        wrong: "Elastic demand means demand changes a lot whatever happens.",
        right: "PED specifically measures responsiveness to price changes.",
      },
    ],
    retrieval: [
      {
        q: "What happens to equilibrium price if supply increases?",
        a: "It falls (and quantity rises).",
      },
      {
        q: "Price rises 10% and quantity demanded falls 20%. PED?",
        a: "−2 (price elastic)",
      },
      {
        q: "Give two factors that shift supply.",
        a: "E.g. costs, technology, taxes, subsidies, number of firms.",
      },
    ],
    quiz: [
      {
        id: "sd1",
        q: "Coffee becomes more expensive. What happens to demand for tea (a substitute)?",
        options: ["Shifts right", "Shifts left", "Movement along", "No change"],
        answer: 0,
        explain:
          "People switch to the substitute, so demand for tea increases.",
      },
      {
        id: "sd2",
        q: "An indirect tax on a good will usually…",
        options: [
          "Shift supply right",
          "Shift supply left",
          "Shift demand right",
          "Have no effect",
        ],
        answer: 1,
        explain: "Taxes raise costs for producers, reducing supply.",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "7136",
        section: "4.1.3 Price determination in a competitive market",
        url: "https://www.aqa.org.uk/subjects/economics/a-level/economics-7136/specification",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "btec-business-marketing-mix",
    courseId: "btec-business",
    title: "The marketing mix and target markets",
    summary: "The 4Ps, market segmentation and choosing a target market.",
    objectives: [
      "Explain the 4Ps of the marketing mix",
      "Describe ways to segment a market",
      "Justify marketing decisions for a target market",
    ],
    explanation: [
      "A target market is the particular group of customers a business aims to reach.",
      "Businesses segment markets by factors such as age, income, location, lifestyle and behaviour so they can meet customer needs more closely.",
      "The marketing mix (product, price, place and promotion) should fit together and suit the target market.",
      "In assignments, use evidence about a real business and justify decisions: explain why each choice suits that business and its customers.",
    ],
    keyTerms: [
      {
        term: "Target market",
        definition: "The intended customer group for a product or service.",
      },
      {
        term: "Market segmentation",
        definition:
          "Dividing a market into groups with similar characteristics.",
      },
      {
        term: "Marketing mix",
        definition: "Product, price, place and promotion (the 4Ps).",
      },
      {
        term: "USP",
        definition:
          "Unique selling point: what makes a product different from competitors.",
      },
    ],
    misconceptions: [
      {
        wrong: "Marketing just means advertising.",
        right: "Advertising is one part of promotion, which is one of the 4Ps.",
      },
      {
        wrong: "Describing the 4Ps is enough for higher grades.",
        right:
          "Higher grades usually require analysis and justified evaluation using evidence.",
      },
    ],
    retrieval: [
      { q: "Name the 4Ps.", a: "Product, price, place, promotion." },
      {
        q: "What is a target market?",
        a: "The group of customers a business aims to reach.",
      },
      {
        q: "Give two ways to segment a market.",
        a: "E.g. age, income, location, lifestyle, gender, behaviour.",
      },
    ],
    quiz: [
      {
        id: "mk1",
        q: "What does a target market describe?",
        options: [
          "All competitors",
          "The intended customer group",
          "A sales forecast",
          "A business objective",
        ],
        answer: 1,
        explain:
          "A target market is the particular group of customers a product aims to reach.",
      },
      {
        id: "mk2",
        q: "Which is part of 'place' in the marketing mix?",
        options: [
          "Discounts",
          "Social media adverts",
          "Where and how the product is sold",
          "Packaging design",
        ],
        answer: 2,
        explain:
          "Place covers distribution channels and where customers can buy.",
      },
    ],
    specRefs: [
      {
        board: "Pearson",
        code: "BTEC Nationals Business",
        section: "Unit 2 Developing a Marketing Campaign",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "btec-hsc-care-values",
    courseId: "btec-health-social-care",
    title: "Care values and person-centred practice",
    summary:
      "The values that guide care work and how they protect people who use services.",
    objectives: [
      "Describe key care values such as dignity, respect, confidentiality and safeguarding",
      "Explain person-centred care",
      "Apply care values to a scenario",
    ],
    explanation: [
      "Care values guide how practitioners support people. They include promoting dignity, respect and independence, maintaining confidentiality, safeguarding, promoting equality and effective communication.",
      "Person-centred care puts the individual at the centre of decisions, respecting their preferences, beliefs and choices.",
      "Confidentiality protects personal information and builds trust, but it has limits: if someone is at risk of harm, safeguarding procedures must be followed.",
      "When applying values to a case study, explain what the practitioner does and how it benefits the individual.",
    ],
    keyTerms: [
      {
        term: "Confidentiality",
        definition:
          "Keeping personal information private and sharing it only when appropriate.",
      },
      {
        term: "Safeguarding",
        definition:
          "Protecting people's health, wellbeing and rights, and preventing harm.",
      },
      {
        term: "Person-centred care",
        definition:
          "Care planned around the individual's needs, wishes and choices.",
      },
      {
        term: "Empowerment",
        definition:
          "Supporting individuals to take control of their own lives.",
      },
    ],
    misconceptions: [
      {
        wrong: "Confidentiality means never sharing anything.",
        right:
          "Information must be shared when someone is at risk of harm, following procedures.",
      },
      {
        wrong: "Treating everyone the same is always fair.",
        right:
          "Equality means meeting different needs so people have fair access to care.",
      },
    ],
    retrieval: [
      {
        q: "Why is confidentiality important in care?",
        a: "It protects personal information and builds trust.",
      },
      {
        q: "When can confidentiality be broken?",
        a: "When there is a risk of harm, following safeguarding procedures.",
      },
      {
        q: "What is person-centred care?",
        a: "Care built around the individual's needs, choices and preferences.",
      },
    ],
    quiz: [
      {
        id: "cv1",
        q: "Why is confidentiality important in care?",
        options: [
          "It speeds up paperwork",
          "It protects personal information and trust",
          "It removes consent",
          "It replaces safeguarding",
        ],
        answer: 1,
        explain:
          "Confidentiality protects private information and supports trust, while safeguarding duties still apply.",
      },
      {
        id: "cv2",
        q: "Which action best promotes independence?",
        options: [
          "Doing tasks for the person to save time",
          "Encouraging the person to do what they can with support",
          "Deciding their routine for them",
          "Limiting their choices",
        ],
        answer: 1,
        explain:
          "Supporting people to do what they can for themselves promotes independence.",
      },
    ],
    specRefs: [
      {
        board: "Pearson",
        code: "BTEC Tech Award HSC",
        section: "Component 2 Health and Social Care Services and Values",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "digital-cyber-threats",
    courseId: "btec-it",
    title: "Cyber security threats and protection",
    summary:
      "Common threats such as phishing and malware, and how organisations protect systems.",
    objectives: [
      "Describe common cyber threats",
      "Explain technical and human protection methods",
      "Explain authentication including multi-factor authentication",
    ],
    explanation: [
      "Common threats include malware (viruses, worms, ransomware), phishing and other social engineering. Vulnerabilities such as weak passwords and unpatched software make these attacks more likely to succeed.",
      "Phishing uses messages that pretend to be trustworthy to trick people into revealing information or clicking harmful links.",
      "Technical protections include firewalls, anti-malware, encryption, access controls, backups and keeping software updated.",
      "Human protections include staff training, clear policies and reporting procedures.",
      "Multi-factor authentication (MFA) requires two or more different types of evidence (something you know, have or are), so a stolen password alone is not enough.",
    ],
    keyTerms: [
      {
        term: "Phishing",
        definition:
          "Fraudulent messages designed to trick people into revealing information.",
      },
      {
        term: "Ransomware",
        definition: "Malware that encrypts data and demands payment.",
      },
      {
        term: "Encryption",
        definition:
          "Scrambling data so only authorised people with a key can read it.",
      },
      {
        term: "MFA",
        definition:
          "Multi-factor authentication: using more than one type of evidence to verify identity.",
      },
    ],
    misconceptions: [
      {
        wrong: "A firewall stops all cyber attacks.",
        right:
          "Firewalls filter network traffic but cannot stop phishing or insider threats alone.",
      },
      {
        wrong: "Two passwords count as MFA.",
        right:
          "MFA needs different factor types, e.g. a password plus a phone code.",
      },
    ],
    retrieval: [
      {
        q: "What is phishing?",
        a: "Fraudulent messages that trick people into revealing information or clicking harmful links.",
      },
      {
        q: "Name the three factor types in MFA.",
        a: "Something you know, have and are.",
      },
      {
        q: "Give two technical protections.",
        a: "E.g. firewalls, anti-malware, encryption, backups, updates, access controls.",
      },
    ],
    quiz: [
      {
        id: "cy1",
        q: "What is the purpose of multi-factor authentication?",
        options: [
          "Use a longer username",
          "Verify identity using more than one factor",
          "Encrypt every file",
          "Remove passwords",
        ],
        answer: 1,
        explain:
          "MFA asks for two or more different types of evidence to verify a user.",
      },
      {
        id: "cy2",
        q: "Which threat encrypts files and demands payment?",
        options: ["Spyware", "Ransomware", "Adware", "A firewall"],
        answer: 1,
        explain: "Ransomware locks data until a ransom is paid.",
      },
    ],
    specRefs: [
      {
        board: "Pearson",
        code: "BTEC Tech Award DIT",
        section: "Component 3 Effective Digital Working Practices",
      },
    ],
    reviewed: R,
    version: V_UPDATED,
  },
  {
    id: "tlevel-health-infection-control",
    courseId: "tlevel-health",
    title: "Infection prevention and control",
    summary:
      "The chain of infection and standard infection control precautions used in health settings.",
    objectives: [
      "Describe the chain of infection",
      "Explain standard infection control precautions",
      "Describe effective hand hygiene",
    ],
    explanation: [
      "The chain of infection links an infectious agent, a reservoir, a portal of exit, a mode of transmission, a portal of entry and a susceptible host. Breaking any link can prevent spread.",
      "Standard infection control precautions (SICPs) include patient placement and assessment for infection risk, hand hygiene, respiratory and cough hygiene, personal protective equipment (PPE), safe management of the care environment and of care equipment, safe management of linen, safe management of blood and body fluids, safe disposal of waste (including sharps) and occupational safety, including preventing sharps injuries.",
      "Hand hygiene is one of the most effective ways to reduce the spread of infection. Follow your setting's policy on when to use soap and water or alcohol hand rub.",
      "Always follow your placement setting's policies and procedures, and ask your supervisor if you are unsure.",
    ],
    keyTerms: [
      {
        term: "Chain of infection",
        definition: "The sequence of links needed for an infection to spread.",
      },
      {
        term: "PPE",
        definition:
          "Personal protective equipment such as gloves, aprons and masks.",
      },
      {
        term: "Susceptible host",
        definition: "A person who can become infected.",
      },
      {
        term: "Standard infection control precautions (SICPs)",
        definition:
          "Basic infection control measures used with everyone in care settings.",
      },
    ],
    misconceptions: [
      {
        wrong: "Wearing gloves replaces hand washing.",
        right: "Hand hygiene is still needed before and after glove use.",
      },
      {
        wrong: "Precautions are only for people known to be infectious.",
        right: "Standard infection control precautions apply to everyone, every time.",
      },
    ],
    retrieval: [
      {
        q: "How can the spread of infection be prevented?",
        a: "By breaking any link in the chain of infection.",
      },
      {
        q: "Name three standard infection control precautions (SICPs).",
        a: "E.g. hand hygiene, PPE, waste management, sharps safety, cleaning.",
      },
      { q: "Does wearing gloves remove the need for hand hygiene?", a: "No." },
    ],
    quiz: [
      {
        id: "ic1",
        q: "Which of these is a standard infection control precaution that applies to every patient?",
        options: [
          "Hand hygiene",
          "PPE only for patients known to be infectious",
          "Reusing single-use gloves between patients",
          "Skipping hand hygiene if gloves were worn",
        ],
        answer: 0,
        explain:
          "Standard infection control precautions, including hand hygiene, are used for all patients, all the time, whether or not an infection is known.",
      },
      {
        id: "ic2",
        q: "Which link is broken by effective hand hygiene?",
        options: [
          "Susceptible host",
          "Mode of transmission",
          "Infectious agent's DNA",
          "None",
        ],
        answer: 1,
        explain: "Hand hygiene stops hands transmitting microorganisms.",
      },
    ],
    specRefs: [
      {
        board: "Pearson",
        code: "T Level Health 610/7438/X",
        section: "Content area 2 (2.5.1 PPE and hand hygiene)",
        url: "https://qualifications.pearson.com/content/dam/pdf/TLevels/health/2026/specification-and-sample-assessment-materials/t-level-health-spec.pdf",
      },
      {
        board: "NHS England",
        code: "NIPCM",
        section: "Chapter 1 Standard infection control precautions",
        url: "https://www.england.nhs.uk/national-infection-prevention-and-control-manual-nipcm-for-england/chapter-1-standard-infection-control-precautions-sicps/",
      },
    ],
    reviewed: R,
    version: V_UPDATED,
  },
  {
    id: "fs-maths-ratio",
    courseId: "functional-skills-maths",
    title: "Ratio and proportion",
    summary:
      "Share amounts in a ratio, simplify ratios and scale recipes and plans.",
    objectives: [
      "Simplify ratios",
      "Share an amount in a given ratio",
      "Solve direct proportion problems in real contexts",
    ],
    explanation: [
      "A ratio compares quantities. Simplify by dividing all parts by a common factor: 12:8 = 3:2.",
      "To share in a ratio: add the parts, find the value of one part, then multiply. £60 in the ratio 2:3 → 5 parts, 1 part = £12, so £24 and £36.",
      "Direct proportion: if 4 tickets cost £18, one ticket costs £4.50, so 7 cost £31.50. Find one first (the unitary method).",
    ],
    workedExample: {
      question:
        "A recipe for 4 people uses 300 g of flour. How much for 10 people?",
      steps: [
        "For 1 person: 300 ÷ 4 = 75 g.",
        "For 10 people: 75 × 10 = 750 g.",
      ],
      answer: "750 g",
    },
    keyTerms: [
      {
        term: "Ratio",
        definition: "A comparison of two or more quantities, e.g. 2:3.",
      },
      {
        term: "Unitary method",
        definition: "Finding the value of one unit first, then scaling.",
      },
      {
        term: "Direct proportion",
        definition: "When one quantity doubles, the other doubles too.",
      },
    ],
    misconceptions: [
      {
        wrong: "Sharing £60 in the ratio 2:3 gives £20 and £30.",
        right: "There are 5 parts; one part is £12, giving £24 and £36.",
      },
    ],
    retrieval: [
      { q: "Simplify 15:10.", a: "3:2" },
      { q: "Share 40 in the ratio 1:3.", a: "10 and 30" },
      { q: "3 pens cost £2.40. How much do 5 cost?", a: "£4.00" },
    ],
    quiz: [
      {
        id: "ra1",
        q: "Share £45 in the ratio 4:5.",
        options: ["£20 and £25", "£18 and £27", "£4 and £5", "£22.50 each"],
        answer: 0,
        explain: "9 parts; 1 part = £5; £20 and £25.",
      },
      {
        id: "ra2",
        q: "Write 18:24 in its simplest form.",
        options: ["9:12", "3:4", "6:8", "2:3"],
        answer: 1,
        explain:
          "Divide both parts by the highest common factor, 6, to get 3:4.",
      },
    ],
    specRefs: [
      {
        board: "DfE",
        code: "Functional Skills Maths",
        section:
          "Using numbers: ratio and direct proportion (L1), ratio, direct and inverse proportion (L2)",
        url: "https://www.gov.uk/government/publications/functional-skills-subject-content-mathematics",
      },
    ],
    reviewed: R,
    version: V_UPDATED,
  },
  {
    id: "core-maths-estimation",
    courseId: "core-maths",
    title: "Estimation and Fermi problems",
    summary:
      "Make sensible assumptions to estimate quantities and judge whether answers are reasonable.",
    objectives: [
      "Break a large estimation problem into smaller steps",
      "State and justify assumptions",
      "Judge the reasonableness of an estimate",
    ],
    explanation: [
      "A Fermi problem asks for a reasonable estimate when exact data is not available, for example 'How many litres of water does a school use in a day?'",
      "Break the problem into parts you can estimate: number of people, uses per person, amount per use.",
      "Round to convenient numbers and state each assumption clearly. Marks usually reward sensible reasoning, not a single 'correct' answer.",
      "Finally, sense-check: is the answer the right order of magnitude? Could a small change in an assumption change it a lot?",
    ],
    workedExample: {
      question:
        "Estimate how many hours a Year 12 student spends on a phone in a year.",
      steps: [
        "Assume about 4 hours per day (stated assumption).",
        "4 × 365 = 1,460, which rounds to about 1,500 hours.",
        "Sense-check: about 17% of the year, which is plausible.",
      ],
      answer: "Roughly 1,500 hours (depending on assumptions)",
    },
    keyTerms: [
      {
        term: "Fermi estimate",
        definition: "A rough estimate built from reasoned assumptions.",
      },
      {
        term: "Order of magnitude",
        definition:
          "The power of ten when a number is written in standard form, e.g. 3,800 = 3.8 × 10³ has order of magnitude 10³.",
      },
      {
        term: "Assumption",
        definition:
          "A value or condition accepted as true to make a problem solvable.",
      },
    ],
    misconceptions: [
      {
        wrong: "There is one correct answer to an estimation question.",
        right:
          "Different sensible assumptions lead to different, equally valid estimates.",
      },
    ],
    retrieval: [
      {
        q: "What is a Fermi problem?",
        a: "An estimation problem solved by reasoned assumptions.",
      },
      {
        q: "What should you always state in an estimate?",
        a: "Your assumptions.",
      },
      { q: "What is the order of magnitude of 3,800?", a: "10³ (thousands)" },
    ],
    quiz: [
      {
        id: "fe1",
        q: "Which is most important in an estimation answer?",
        options: [
          "Many decimal places",
          "Clearly stated, sensible assumptions",
          "Using a calculator",
          "Matching the textbook exactly",
        ],
        answer: 1,
        explain: "Reasoning and assumptions earn the credit.",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "1350",
        section: "3.3 Estimation (Fermi estimation)",
      },
    ],
    reviewed: R,
    version: V_UPDATED,
  },
  {
    id: "epq-planning",
    courseId: "epq",
    title: "Planning an EPQ and referencing sources",
    summary:
      "Choose a focused question, plan milestones and record research properly.",
    objectives: [
      "Write a focused, researchable project question",
      "Plan milestones and keep a production log",
      "Evaluate and reference sources consistently",
    ],
    explanation: [
      "A strong EPQ question is focused and debatable, e.g. 'To what extent…?' rather than 'Everything about…'.",
      "Plan backwards from your deadline with milestones for research, drafting, review and your presentation. Record decisions and changes in your production log.",
      "Evaluate sources for authority, accuracy, purpose, currency and bias. Use a wide range, including academic sources where possible.",
      "Pick one referencing style (for example Harvard) and use it consistently. Keep track of references as you go rather than at the end.",
    ],
    keyTerms: [
      {
        term: "Production log",
        definition:
          "The record of your planning, decisions and reflections through the project.",
      },
      {
        term: "Referencing",
        definition: "Acknowledging the sources you use in a consistent format.",
      },
      {
        term: "Literature review",
        definition:
          "A summary and evaluation of existing research on your topic.",
      },
      {
        term: "Plagiarism",
        definition: "Presenting someone else's work or ideas as your own.",
      },
    ],
    misconceptions: [
      {
        wrong: "A broad question gives more to write about.",
        right:
          "A focused question allows deeper analysis and a clear conclusion.",
      },
      {
        wrong: "The production log is filled in at the end.",
        right: "It should be kept up to date throughout the project.",
      },
    ],
    retrieval: [
      {
        q: "What makes a good EPQ question?",
        a: "It is focused, researchable and debatable.",
      },
      {
        q: "Name three criteria for evaluating a source.",
        a: "E.g. authority, accuracy, purpose, currency, bias.",
      },
      {
        q: "What is a production log?",
        a: "A record of planning, decisions and reflection across the project.",
      },
    ],
    quiz: [
      {
        id: "ep1",
        q: "Which is the strongest EPQ question?",
        options: [
          "Climate change",
          "Everything about AI",
          "To what extent can urban tree planting reduce summer temperatures in UK cities?",
          "Is maths good?",
        ],
        answer: 2,
        explain: "It is focused, researchable and allows a reasoned judgement.",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "7993",
        section: "AO1 Manage, AO2 Use resources",
        url: "https://www.aqa.org.uk/subjects/projects/project-qualifications/epq-7993/specification",
      },
    ],
    reviewed: R,
    version: V,
  },
];
