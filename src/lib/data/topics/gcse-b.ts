import type { Topic } from "@/lib/types";

const R = "2026-09-30";
const V = "1.0";
const V_UPDATED = "1.1";

export const GCSE_TOPICS_B: Topic[] = [
  {
    id: "gcse-chem-atomic-structure",
    courseId: "gcse-chemistry",
    title: "Atomic structure",
    summary:
      "Protons, neutrons and electrons, atomic and mass numbers, isotopes and electron configuration.",
    objectives: [
      "Describe the structure of an atom and the relative charge and mass of subatomic particles",
      "Use atomic number and mass number to work out numbers of particles",
      "Explain what isotopes are and write simple electron configurations",
    ],
    explanation: [
      "An atom has a tiny central nucleus containing protons and neutrons, surrounded by electrons in shells (energy levels). Most of an atom's mass is in the nucleus.",
      "Relative charges: proton +1, neutron 0, electron −1. Relative masses: proton 1, neutron 1, electron very small (about 1/2000).",
      "Atomic number = number of protons (and electrons in a neutral atom). Mass number = protons + neutrons, so neutrons = mass number − atomic number.",
      "Isotopes are atoms of the same element with the same number of protons but different numbers of neutrons.",
      "For the first 20 elements, the first shell holds up to 2 electrons and the second and third shells hold up to 8 each, e.g. sodium (11 electrons) is 2,8,1 and calcium (20 electrons) is 2,8,8,2.",
    ],
    workedExample: {
      question:
        "Chlorine-37 has atomic number 17. How many protons, neutrons and electrons does a chlorine-37 atom have?",
      steps: [
        "Protons = atomic number = 17.",
        "Electrons = protons in a neutral atom = 17.",
        "Neutrons = 37 − 17 = 20.",
      ],
      answer: "17 protons, 20 neutrons, 17 electrons",
    },
    keyTerms: [
      {
        term: "Atomic number",
        definition: "The number of protons in the nucleus of an atom.",
      },
      {
        term: "Mass number",
        definition: "The total number of protons and neutrons in an atom.",
      },
      {
        term: "Isotope",
        definition:
          "Atoms of the same element with different numbers of neutrons.",
      },
      {
        term: "Electron shell",
        definition: "An energy level that electrons occupy around the nucleus.",
      },
    ],
    misconceptions: [
      {
        wrong: "Isotopes have different numbers of protons.",
        right:
          "Isotopes have the same number of protons; only the neutron number differs.",
      },
      {
        wrong: "Electrons are in the nucleus.",
        right: "Electrons occupy shells around the nucleus.",
      },
    ],
    retrieval: [
      { q: "What is the charge of a neutron?", a: "0 (no charge)." },
      {
        q: "How do you calculate the number of neutrons?",
        a: "Mass number − atomic number.",
      },
      {
        q: "Write the electron configuration of magnesium (12 electrons).",
        a: "2,8,2",
      },
    ],
    quiz: [
      {
        id: "at1",
        q: "What is the charge of a neutron?",
        options: ["+1", "−1", "0", "It varies"],
        answer: 2,
        explain: "Neutrons have no electric charge.",
      },
      {
        id: "at2",
        q: "An atom has mass number 23 and atomic number 11. How many neutrons?",
        options: ["11", "12", "23", "34"],
        answer: 1,
        explain: "23 − 11 = 12 neutrons.",
      },
      {
        id: "at3",
        q: "What is the electron configuration of oxygen (8 electrons)?",
        options: ["2,6", "8", "2,8", "4,4"],
        answer: 0,
        explain: "The first shell holds 2, leaving 6 in the second shell.",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "8462",
        section: "4.1.1 A simple model of the atom",
        url: "https://www.aqa.org.uk/subjects/chemistry/gcse/chemistry-8462/specification",
      },
    ],
    reviewed: R,
    version: V_UPDATED,
  },
  {
    id: "gcse-chem-bonding",
    courseId: "gcse-chemistry",
    title: "Ionic and covalent bonding",
    summary:
      "How atoms bond by transferring or sharing electrons, and how structure affects properties.",
    objectives: [
      "Describe ionic bonding as electron transfer between metals and non-metals",
      "Describe covalent bonding as sharing pairs of electrons between non-metals",
      "Link structure to melting point and electrical conductivity",
    ],
    explanation: [
      "Ionic bonding happens between metals and non-metals. Metal atoms lose electrons to become positive ions; non-metal atoms gain electrons to become negative ions. Oppositely charged ions attract strongly.",
      "Ionic compounds form giant lattices with high melting points. They conduct electricity when molten or dissolved because the ions can move.",
      "Covalent bonding happens between non-metal atoms, which share pairs of electrons.",
      "Simple molecular substances (like water or carbon dioxide) have strong covalent bonds within molecules but weak intermolecular forces between them, so they have low melting and boiling points.",
      "Giant covalent structures (like diamond and silicon dioxide) have many strong covalent bonds and very high melting points.",
    ],
    keyTerms: [
      {
        term: "Ion",
        definition:
          "An atom or group of atoms with an electric charge from losing or gaining electrons.",
      },
      {
        term: "Covalent bond",
        definition: "A shared pair of electrons between two atoms.",
      },
      {
        term: "Intermolecular forces",
        definition: "Weak forces of attraction between molecules.",
      },
      {
        term: "Giant lattice",
        definition:
          "A regular three-dimensional arrangement of a very large number of particles.",
      },
    ],
    misconceptions: [
      {
        wrong: "Boiling water breaks covalent bonds.",
        right:
          "Boiling overcomes weak intermolecular forces; the O–H covalent bonds stay intact.",
      },
      {
        wrong: "Solid ionic compounds conduct electricity.",
        right:
          "In a solid the ions are fixed in place; they must be molten or dissolved to conduct.",
      },
    ],
    retrieval: [
      {
        q: "What type of bonding forms between a metal and a non-metal?",
        a: "Ionic bonding.",
      },
      {
        q: "Why does sodium chloride conduct when molten?",
        a: "Its ions are free to move and carry charge.",
      },
      {
        q: "Why do simple molecular substances have low boiling points?",
        a: "Only weak intermolecular forces need to be overcome.",
      },
    ],
    quiz: [
      {
        id: "bo1",
        q: "What happens to a metal atom in ionic bonding?",
        options: [
          "It gains electrons",
          "It loses electrons",
          "It shares electrons",
          "It gains protons",
        ],
        answer: 1,
        explain: "Metal atoms lose electrons to form positive ions.",
      },
      {
        id: "bo2",
        q: "Why does diamond have a very high melting point?",
        options: [
          "Weak intermolecular forces",
          "Free ions",
          "Many strong covalent bonds must be broken",
          "It is a metal",
        ],
        answer: 2,
        explain: "Diamond is a giant covalent structure.",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "8462",
        section: "4.2.1 Chemical bonds (ionic, covalent)",
        url: "https://www.aqa.org.uk/subjects/chemistry/gcse/chemistry-8462/specification",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "gcse-phys-energy",
    courseId: "gcse-physics",
    title: "Energy stores and transfers",
    summary:
      "Energy stores, conservation of energy, kinetic and gravitational potential energy, and efficiency.",
    objectives: [
      "Describe energy stores and the ways energy is transferred",
      "Calculate kinetic and gravitational potential energy",
      "Calculate efficiency",
    ],
    explanation: [
      "Energy is stored in stores such as kinetic, gravitational potential, elastic potential, thermal, chemical and nuclear. It is transferred by forces doing work, electrical currents, heating and radiation.",
      "Energy cannot be created or destroyed, only transferred between stores. In real systems some energy is dissipated, usually to the thermal store of the surroundings.",
      "Kinetic energy: Eₖ = ½ m v². Gravitational potential energy: Eₚ = m g h, where g is the gravitational field strength (about 9.8 N/kg on Earth; check which value your exam uses).",
      "Efficiency = useful output energy ÷ total input energy. It can be written as a decimal or percentage and can never be more than 1 (100%).",
    ],
    workedExample: {
      question: "A 2 kg ball moves at 3 m/s. What is its kinetic energy?",
      steps: ["Eₖ = ½ m v².", "= 0.5 × 2 × 3².", "= 0.5 × 2 × 9 = 9 J."],
      answer: "9 J",
    },
    keyTerms: [
      {
        term: "Conservation of energy",
        definition:
          "Energy can be transferred, stored or dissipated, but not created or destroyed.",
      },
      {
        term: "Dissipated",
        definition:
          "Energy spread out to the surroundings, usually as a less useful thermal store.",
      },
      {
        term: "Efficiency",
        definition: "Useful output energy ÷ total input energy.",
      },
      { term: "Joule (J)", definition: "The unit of energy." },
    ],
    misconceptions: [
      {
        wrong: "Energy is used up.",
        right:
          "Energy is transferred to other stores, often dissipated to the surroundings.",
      },
      {
        wrong: "Doubling speed doubles kinetic energy.",
        right: "Eₖ depends on v², so doubling speed quadruples kinetic energy.",
      },
    ],
    retrieval: [
      { q: "Write the equation for kinetic energy.", a: "Eₖ = ½ m v²" },
      {
        q: "A machine transfers 200 J usefully from 500 J input. Efficiency?",
        a: "0.4 or 40%",
      },
      {
        q: "Name four energy stores.",
        a: "Any four of: kinetic, gravitational potential, elastic potential, thermal, chemical, nuclear, magnetic, electrostatic.",
      },
    ],
    quiz: [
      {
        id: "eg1",
        q: "What happens to kinetic energy if speed doubles?",
        options: [
          "It doubles",
          "It halves",
          "It quadruples",
          "It stays the same",
        ],
        answer: 2,
        explain: "Eₖ is proportional to v², and 2² = 4.",
      },
      {
        id: "eg2",
        q: "A kettle has 80% efficiency and uses 1000 J. How much is wasted?",
        options: ["80 J", "200 J", "800 J", "1080 J"],
        answer: 1,
        explain: "Useful = 800 J, so 200 J is dissipated.",
      },
      {
        id: "eg3",
        q: "Which is the unit of energy?",
        options: ["Watt", "Newton", "Joule", "Pascal"],
        answer: 2,
        explain: "Energy is measured in joules (J).",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "8463",
        section: "4.1.1 Energy stores and systems",
        url: "https://www.aqa.org.uk/subjects/physics/gcse/physics-8463/specification",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "gcse-phys-forces",
    courseId: "gcse-physics",
    title: "Forces and Newton's laws",
    summary: "Resultant forces, weight, and Newton's three laws of motion.",
    objectives: [
      "Calculate resultant force and weight",
      "Apply F = m a",
      "Describe Newton's first and third laws",
    ],
    explanation: [
      "Forces are vectors: they have size and direction. The resultant force is the single force that has the same effect as all the forces acting together.",
      "Newton's first law: if the resultant force is zero, a stationary object stays still and a moving object keeps moving at the same speed in the same direction.",
      "Newton's second law: resultant force = mass × acceleration (F = m a). A larger resultant force gives a larger acceleration; a larger mass gives a smaller one.",
      "Weight is the force of gravity on a mass: W = m g. Mass is measured in kilograms, weight in newtons.",
      "Newton's third law: when two objects interact, they exert equal and opposite forces on each other. The two forces act on different objects.",
    ],
    workedExample: {
      question:
        "A 1200 kg car accelerates at 2 m/s². What resultant force acts on it?",
      steps: ["F = m a.", "F = 1200 × 2 = 2400 N."],
      answer: "2400 N",
    },
    keyTerms: [
      {
        term: "Resultant force",
        definition:
          "The single force that has the same effect as all the forces acting on an object.",
      },
      { term: "Newton (N)", definition: "The unit of force." },
      {
        term: "Weight",
        definition: "The force acting on an object due to gravity; W = m g.",
      },
      {
        term: "Vector",
        definition: "A quantity with both magnitude and direction.",
      },
    ],
    misconceptions: [
      {
        wrong: "A moving object needs a resultant force to keep moving.",
        right:
          "With zero resultant force it keeps moving at constant velocity.",
      },
      {
        wrong: "Third-law force pairs cancel out.",
        right: "They act on different objects, so they do not cancel.",
      },
    ],
    retrieval: [
      { q: "What is the unit of force?", a: "The newton (N)." },
      { q: "State Newton's second law as an equation.", a: "F = m a" },
      {
        q: "What is the weight of a 50 kg person if g = 9.8 N/kg?",
        a: "490 N",
      },
    ],
    quiz: [
      {
        id: "fo1",
        q: "What is the unit of force?",
        options: ["Joule", "Watt", "Newton", "Pascal"],
        answer: 2,
        explain: "Force is measured in newtons (N).",
      },
      {
        id: "fo2",
        q: "A 5 kg object has a resultant force of 20 N. Its acceleration is…",
        options: ["0.25 m/s²", "4 m/s²", "25 m/s²", "100 m/s²"],
        answer: 1,
        explain: "a = F ÷ m = 20 ÷ 5 = 4 m/s².",
      },
      {
        id: "fo3",
        q: "A car moves in a straight line at a constant 30 m/s. The resultant force is…",
        options: ["Forwards", "Backwards", "Zero", "Equal to its weight"],
        answer: 2,
        explain:
          "Constant velocity means no acceleration, so the resultant force is zero.",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "8463",
        section: "4.5 Forces; 4.5.6.2 Newton's laws",
        url: "https://www.aqa.org.uk/subjects/physics/gcse/physics-8463/specification",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "gcse-history-sources",
    courseId: "gcse-history",
    title: "Evaluating historical sources",
    summary:
      "Judge how useful or reliable a source is using its content, provenance and your own knowledge.",
    objectives: [
      "Use the content of a source as evidence",
      "Evaluate provenance: nature, origin and purpose",
      "Support judgements with contextual own knowledge",
    ],
    explanation: [
      "A source's usefulness depends on the question being asked. A biased poster can be very useful for studying propaganda, even if it is unreliable about events.",
      "Content: what does the source show or say? Pick specific details and link them to the enquiry.",
      "Provenance: who made it, when, why and for whom? Think about NOP: nature, origin, purpose. A private diary and a public speech have very different purposes.",
      "Own knowledge: use accurate contextual knowledge to confirm, challenge or add to what the source shows.",
      "Reach a supported judgement. Avoid simply saying a source is biased and therefore useless.",
    ],
    keyTerms: [
      {
        term: "Provenance",
        definition: "Where a source comes from: who created it, when and why.",
      },
      {
        term: "Primary source",
        definition: "A source created at the time being studied.",
      },
      {
        term: "Utility",
        definition: "How useful a source is for a particular enquiry.",
      },
      {
        term: "Interpretation",
        definition: "A later view of the past by a historian or other writer.",
      },
    ],
    misconceptions: [
      {
        wrong: "Biased sources are useless.",
        right:
          "Bias can itself be useful evidence, for example about attitudes or propaganda.",
      },
      {
        wrong: "Primary sources are always more reliable than secondary.",
        right:
          "Reliability depends on provenance and purpose, not only on date.",
      },
    ],
    retrieval: [
      { q: "What does NOP stand for?", a: "Nature, origin, purpose." },
      {
        q: "Can a biased source be useful? Why?",
        a: "Yes. It can show opinions, attitudes or propaganda methods.",
      },
      {
        q: "What three things should a utility answer use?",
        a: "Content, provenance and own knowledge.",
      },
    ],
    quiz: [
      {
        id: "hs1",
        q: "A government propaganda poster is most useful for studying…",
        options: [
          "Exact casualty figures",
          "How the government wanted people to think",
          "Private opinions of soldiers",
          "Weather at the time",
        ],
        answer: 1,
        explain:
          "Propaganda reveals the message and methods the government used.",
      },
      {
        id: "hs2",
        q: "What does 'provenance' mean?",
        options: [
          "How long a source is",
          "Where a source comes from and why it was made",
          "Whether it is a picture",
          "Its grade value",
        ],
        answer: 1,
        explain:
          "Provenance covers who made the source, when and for what purpose.",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "8145",
        section: "AO3 source analysis",
        url: "https://www.aqa.org.uk/subjects/history/gcse/history-8145/specification",
      },
    ],
    reviewed: R,
    version: V,
  },
  {
    id: "gcse-geog-tectonics",
    courseId: "gcse-geography",
    title: "Tectonic hazards",
    summary:
      "Plate boundaries, earthquakes, volcanoes and how people reduce the risk.",
    objectives: [
      "Describe the global distribution of earthquakes and volcanoes",
      "Explain processes at constructive, destructive and conservative plate margins",
      "Evaluate monitoring, prediction, protection and planning",
    ],
    explanation: [
      "The Earth's crust is broken into tectonic plates that move slowly, driven by processes in the mantle. Most earthquakes and volcanoes occur along plate margins.",
      "At constructive (divergent) margins, plates move apart and magma rises, forming new crust and relatively gentle eruptions.",
      "At destructive (convergent) margins, a denser oceanic plate subducts beneath another plate. Friction and pressure build, causing powerful earthquakes, and melting creates explosive volcanoes.",
      "At conservative margins, plates slide past each other. Pressure builds and is released as earthquakes, but there are no volcanoes.",
      "People reduce risk through monitoring, prediction, protection (e.g. earthquake-resistant buildings) and planning (e.g. evacuation routes and drills). Effects are usually greater where countries have fewer resources to prepare and respond.",
    ],
    keyTerms: [
      {
        term: "Plate margin",
        definition: "The boundary where two tectonic plates meet.",
      },
      {
        term: "Subduction",
        definition: "When a denser oceanic plate sinks beneath another plate.",
      },
      {
        term: "Primary effects",
        definition:
          "The immediate effects of a hazard, e.g. buildings collapsing.",
      },
      {
        term: "Secondary effects",
        definition:
          "Effects that result from primary effects, e.g. fires or disease.",
      },
    ],
    misconceptions: [
      {
        wrong: "Earthquakes can be accurately predicted.",
        right:
          "Earthquakes cannot yet be precisely predicted; monitoring helps assess risk. Volcanic eruptions are easier to forecast.",
      },
      {
        wrong: "All plate margins have volcanoes.",
        right: "Conservative margins produce earthquakes but no volcanoes.",
      },
    ],
    retrieval: [
      {
        q: "What happens at a destructive margin?",
        a: "A denser oceanic plate subducts under another plate, causing earthquakes and explosive volcanoes.",
      },
      {
        q: "Name the four ways of managing (reducing the risk of) tectonic hazards.",
        a: "Monitoring, prediction, protection, planning.",
      },
      {
        q: "Give a secondary effect of an earthquake.",
        a: "E.g. fires, tsunamis, disease, homelessness, economic loss.",
      },
    ],
    quiz: [
      {
        id: "tc1",
        q: "Which margin has earthquakes but no volcanoes?",
        options: ["Constructive", "Destructive", "Conservative", "All of them"],
        answer: 2,
        explain:
          "At conservative margins plates slide past each other; no magma rises.",
      },
      {
        id: "tc2",
        q: "Which is a primary effect of an earthquake?",
        options: [
          "Disease spreading",
          "Buildings collapsing",
          "Loss of tourism",
          "Food shortages weeks later",
        ],
        answer: 1,
        explain: "Collapse happens immediately as the ground shakes.",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "8035",
        section: "3.1.1.2 Tectonic hazards",
        url: "https://www.aqa.org.uk/subjects/geography/gcse/geography-8035/specification",
      },
    ],
    reviewed: R,
    version: V_UPDATED,
  },
  {
    id: "gcse-cs-binary",
    courseId: "gcse-computer-science",
    title: "Binary and data representation",
    summary:
      "Convert between denary, binary and hexadecimal and understand units of data.",
    objectives: [
      "Convert between denary and 8-bit binary",
      "Convert between binary and hexadecimal",
      "Use units of data from bits to terabytes",
    ],
    explanation: [
      "Computers use binary (base 2) because their circuits have two states: on and off. Each binary digit is a bit.",
      "In an 8-bit number the place values are 128, 64, 32, 16, 8, 4, 2, 1. For example, 01001101 = 64 + 8 + 4 + 1 = 77.",
      "Hexadecimal (base 16) uses 0–9 and A–F (A = 10 … F = 15). Each hex digit represents exactly 4 bits (a nibble), so 1111 0101 = F5.",
      "Units: 8 bits = 1 byte and 4 bits = 1 nibble. OCR uses 1 kilobyte (KB) = 1000 bytes but also accepts 1024. AQA uses 1 kB = 1000 bytes and 1 kibibyte (KiB) = 1024 bytes. Pearson Edexcel uses binary multiples, e.g. 1 kibibyte (KiB) = 1024 bytes. Check which your board expects.",
    ],
    workedExample: {
      question: "Convert 1011 0110 to denary and hexadecimal.",
      steps: [
        "Place values: 128 + 32 + 16 + 4 + 2 = 182.",
        "Split into nibbles: 1011 = 11 = B, 0110 = 6.",
        "Hex = B6.",
      ],
      answer: "182 in denary, B6 in hexadecimal",
    },
    keyTerms: [
      { term: "Bit", definition: "A single binary digit, 0 or 1." },
      { term: "Byte", definition: "A group of 8 bits." },
      { term: "Nibble", definition: "4 bits; one hexadecimal digit." },
      {
        term: "Hexadecimal",
        definition: "Base 16 number system using 0–9 and A–F.",
      },
    ],
    misconceptions: [
      {
        wrong: "Hexadecimal is used because computers process it directly.",
        right:
          "Computers still process binary; hex is a shorter, more readable way for humans to write it.",
      },
      {
        wrong: "The largest 8-bit number is 256.",
        right: "It is 255 (11111111); there are 256 values from 0 to 255.",
      },
    ],
    retrieval: [
      { q: "Convert 00101010 to denary.", a: "42" },
      {
        q: "What is the largest number an 8-bit binary number can hold?",
        a: "255",
      },
      { q: "Convert hex 3C to binary.", a: "0011 1100" },
    ],
    quiz: [
      {
        id: "bi1",
        q: "What is 00010101 in denary?",
        options: ["19", "21", "25", "37"],
        answer: 1,
        explain: "16 + 4 + 1 = 21.",
      },
      {
        id: "bi2",
        q: "What is 1110 1010 in hexadecimal?",
        options: ["EA", "AE", "E10", "D9"],
        answer: 0,
        explain: "1110 = 14 = E and 1010 = 10 = A.",
      },
      {
        id: "bi3",
        q: "How many bits are in a byte?",
        options: ["4", "8", "10", "16"],
        answer: 1,
        explain: "One byte is 8 bits.",
      },
    ],
    specRefs: [
      {
        board: "AQA",
        code: "8525",
        section: "3.3 Fundamentals of data representation",
        url: "https://www.aqa.org.uk/subjects/computer-science-and-it/gcse/computer-science-8525/specification",
      },
      {
        board: "OCR",
        code: "J277",
        section: "1.2 Memory and storage",
      },
      {
        board: "Pearson",
        code: "1CP2",
        section: "Topic 2 Data",
      },
    ],
    reviewed: R,
    version: V_UPDATED,
  },
];
