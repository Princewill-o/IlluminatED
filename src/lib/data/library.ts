import type { LibraryResource } from "@/lib/types";

/**
 * A curated, learner-appropriate selection from the Educational section of FMHY
 * (https://fmhy.net/educational), checked 30 September 2026.
 * We deliberately exclude anything FMHY lists for downloading paid or copyrighted
 * courses or books without permission, torrent indexes, and adult-oriented material.
 */
export const LIBRARY_SOURCE = {
  name: "FMHY Educational",
  url: "https://fmhy.net/educational",
  checked: "2026-09-30",
};

export const LIBRARY: LibraryResource[] = [
  // Courses and video lessons
  {
    name: "Khan Academy",
    url: "https://www.khanacademy.org/",
    description:
      "Free video lessons and practice across maths, science and more.",
    category: "Courses & video lessons",
    subjects: ["Mathematics", "Biology", "Chemistry", "Physics", "Economics"],
  },
  {
    name: "OpenLearn",
    url: "https://www.open.edu/openlearn/",
    description: "Free short courses from The Open University.",
    category: "Courses & video lessons",
    subjects: ["All"],
    ukRelevant: true,
  },
  {
    name: "Gresham College",
    url: "https://www.gresham.ac.uk/",
    description: "Free public lectures from a London college, with recordings.",
    category: "Courses & video lessons",
    subjects: ["All"],
    ukRelevant: true,
  },
  {
    name: "MIT OpenCourseWare",
    url: "https://ocw.mit.edu/",
    description:
      "University course materials, good for stretch and challenge in Year 13.",
    category: "Courses & video lessons",
    subjects: ["Mathematics", "Physics", "Computer Science", "Economics"],
  },
  {
    name: "Crash Course",
    url: "https://thecrashcourse.com/",
    description: "Short, lively overview videos on many subjects.",
    category: "Courses & video lessons",
    subjects: ["Biology", "Chemistry", "History", "Psychology", "Economics"],
  },
  {
    name: "Saylor Academy",
    url: "https://learn.saylor.org/",
    description: "Free self-paced courses at college level.",
    category: "Courses & video lessons",
    subjects: ["All"],
  },
  {
    name: "Class Central",
    url: "https://www.classcentral.com/",
    description: "Search engine for free online courses across providers.",
    category: "Courses & video lessons",
    subjects: ["All"],
  },
  {
    name: "Google Digital Garage (UK)",
    url: "https://grow.google/intl/uk/courses-and-tools/",
    description: "Free digital skills courses.",
    category: "Courses & video lessons",
    subjects: ["Information Technology", "Business"],
    ukRelevant: true,
  },
  {
    name: "Carnegie Mellon OLI",
    url: "https://oli.cmu.edu/independent-learner-courses/",
    description: "Open, interactive courses for independent learners.",
    category: "Courses & video lessons",
    subjects: ["Statistics", "Biology", "Chemistry"],
  },
  {
    name: "Yale Open Courses",
    url: "https://oyc.yale.edu/courses",
    description: "Recorded Yale lecture courses.",
    category: "Courses & video lessons",
    subjects: ["History", "Economics", "Psychology"],
  },

  // Interactive simulations
  {
    name: "PhET simulations",
    url: "https://phet.colorado.edu/",
    description:
      "Interactive physics, chemistry, maths and biology simulations.",
    category: "Interactive simulations",
    subjects: ["Physics", "Chemistry", "Mathematics", "Biology"],
  },
  {
    name: "LabXchange",
    url: "https://www.labxchange.org/",
    description: "Interactive science simulations and learning pathways.",
    category: "Interactive simulations",
    subjects: ["Biology", "Chemistry"],
  },
  {
    name: "JavaLab",
    url: "https://javalab.org/en/",
    description: "Physics and chemistry simulations that run in the browser.",
    category: "Interactive simulations",
    subjects: ["Physics", "Chemistry"],
  },
  {
    name: "oPhysics",
    url: "https://ophysics.com/index.html",
    description: "Interactive physics simulations.",
    category: "Interactive simulations",
    subjects: ["Physics"],
  },
  {
    name: "Falstad simulations",
    url: "https://www.falstad.com/mathphysics.html",
    description: "Circuit, wave and maths simulators.",
    category: "Interactive simulations",
    subjects: ["Physics", "Mathematics"],
  },
  {
    name: "Ray Optics Simulation",
    url: "https://phydemo.app/ray-optics/",
    description: "Explore reflection, refraction and lenses.",
    category: "Interactive simulations",
    subjects: ["Physics"],
  },
  {
    name: "Academo",
    url: "https://academo.org/",
    description: "Interactive demonstrations for science and maths.",
    category: "Interactive simulations",
    subjects: ["Physics", "Mathematics"],
  },
  {
    name: "Explorabl.es",
    url: "https://explorabl.es/",
    description: "Interactive explanations you learn by playing with.",
    category: "Interactive simulations",
    subjects: ["All"],
  },

  // Maths
  {
    name: "Isaac Physics / Isaac Science",
    url: "https://isaacscience.org/",
    description:
      "Cambridge-built problem solving for physics and maths, designed for UK students.",
    category: "Mathematics",
    subjects: ["Physics", "Mathematics"],
    ukRelevant: true,
  },
  {
    name: "MadAsMaths",
    url: "https://www.madasmaths.com/",
    description:
      "Large collection of UK-style maths practice papers and worksheets.",
    category: "Mathematics",
    subjects: ["Mathematics", "Further Mathematics"],
    ukRelevant: true,
  },
  {
    name: "Mathspad interactives",
    url: "https://www.mathspad.co.uk/resources.php?interactives=1",
    description: "Interactive maths tools used in UK classrooms.",
    category: "Mathematics",
    subjects: ["Mathematics"],
    ukRelevant: true,
  },
  {
    name: "Math is Fun",
    url: "https://www.mathsisfun.com/",
    description: "Friendly explanations of maths ideas with examples.",
    category: "Mathematics",
    subjects: ["Mathematics", "Functional Skills Maths"],
  },
  {
    name: "Paul's Online Math Notes",
    url: "https://tutorial.math.lamar.edu/",
    description: "Clear calculus and algebra notes, useful for A level.",
    category: "Mathematics",
    subjects: ["Mathematics", "Further Mathematics"],
  },
  {
    name: "BetterExplained",
    url: "https://betterexplained.com/",
    description: "Intuitive explanations of maths concepts.",
    category: "Mathematics",
    subjects: ["Mathematics"],
  },
  {
    name: "3Blue1Brown",
    url: "https://www.3blue1brown.com/",
    description: "Visual explanations of calculus, linear algebra and more.",
    category: "Mathematics",
    subjects: ["Mathematics", "Further Mathematics"],
  },
  {
    name: "Mathigon",
    url: "https://mathigon.org/",
    description: "Interactive maths textbook and tools.",
    category: "Mathematics",
    subjects: ["Mathematics"],
  },
  {
    name: "Seeing Theory",
    url: "https://seeing-theory.brown.edu/",
    description: "Visual introduction to probability and statistics.",
    category: "Mathematics",
    subjects: ["Mathematics", "Statistics", "Psychology"],
  },
  {
    name: "AoPS Alcumus",
    url: "https://artofproblemsolving.com/alcumus",
    description: "Adaptive problem practice for strong mathematicians.",
    category: "Mathematics",
    subjects: ["Mathematics"],
  },
  {
    name: "Project Euler",
    url: "https://projecteuler.net/",
    description: "Maths and programming challenge problems.",
    category: "Mathematics",
    subjects: ["Mathematics", "Computer Science"],
  },
  {
    name: "WolframAlpha",
    url: "https://www.wolframalpha.com/",
    description:
      "Computational engine. Use it to check your working, not replace it.",
    category: "Mathematics",
    subjects: ["Mathematics", "Physics", "Chemistry"],
  },

  // Physics
  {
    name: "PhysicsClassroom",
    url: "https://www.physicsclassroom.com/",
    description: "Tutorials and interactives on core physics topics.",
    category: "Physics",
    subjects: ["Physics"],
  },
  {
    name: "HyperPhysics",
    url: "http://hyperphysics.phy-astr.gsu.edu/hbase/",
    description: "Concept-map style physics reference.",
    category: "Physics",
    subjects: ["Physics"],
  },
  {
    name: "The Feynman Lectures",
    url: "https://www.feynmanlectures.caltech.edu/",
    description:
      "Classic physics lectures, free to read online. Stretch reading.",
    category: "Physics",
    subjects: ["Physics"],
  },
  {
    name: "Bartosz Ciechanowski",
    url: "https://ciechanow.ski/",
    description: "Beautiful interactive articles explaining how things work.",
    category: "Physics",
    subjects: ["Physics", "Engineering"],
  },

  // Chemistry
  {
    name: "chemguide",
    url: "https://www.chemguide.co.uk",
    description:
      "Long-running UK chemistry explanations, especially good for A level.",
    category: "Chemistry",
    subjects: ["Chemistry"],
    ukRelevant: true,
  },
  {
    name: "Doc Brown's Chemistry",
    url: "https://docbrown.info/",
    description: "Extensive UK chemistry revision notes.",
    category: "Chemistry",
    subjects: ["Chemistry"],
    ukRelevant: true,
  },
  {
    name: "Ptable",
    url: "https://ptable.com/",
    description: "Interactive periodic table.",
    category: "Chemistry",
    subjects: ["Chemistry"],
  },
  {
    name: "Periodic Videos",
    url: "http://www.periodicvideos.com/",
    description: "University of Nottingham videos about every element.",
    category: "Chemistry",
    subjects: ["Chemistry"],
    ukRelevant: true,
  },
  {
    name: "ChemTube3D",
    url: "https://www.chemtube3d.com",
    description: "3D animations of structures and reaction mechanisms.",
    category: "Chemistry",
    subjects: ["Chemistry"],
  },
  {
    name: "Compound Interest",
    url: "https://www.compoundchem.com/infographics/",
    description: "Chemistry infographics.",
    category: "Chemistry",
    subjects: ["Chemistry"],
  },
  {
    name: "MolView",
    url: "https://app.molview.com/",
    description: "Draw and view molecules in 3D.",
    category: "Chemistry",
    subjects: ["Chemistry"],
  },
  {
    name: "LibreTexts Chemistry",
    url: "https://chem.libretexts.org",
    description: "Open chemistry textbooks.",
    category: "Chemistry",
    subjects: ["Chemistry"],
  },

  // Biology
  {
    name: "LibreTexts Biology",
    url: "https://bio.libretexts.org/Bookshelves",
    description: "Open biology textbooks.",
    category: "Biology",
    subjects: ["Biology"],
  },
  {
    name: "BioNinja",
    url: "https://ib.bioninja.com.au/",
    description: "Concise biology notes (IB-focused but useful for A level).",
    category: "Biology",
    subjects: ["Biology"],
  },
  {
    name: "OneZoom",
    url: "https://www.onezoom.org/",
    description:
      "Explore the tree of life, good for evolution and classification.",
    category: "Biology",
    subjects: ["Biology"],
  },
  {
    name: "iNaturalist",
    url: "https://www.inaturalist.org/",
    description: "Identify organisms, handy for ecology fieldwork.",
    category: "Biology",
    subjects: ["Biology", "Geography"],
  },

  // Humanities
  {
    name: "LitCharts",
    url: "https://www.litcharts.com/",
    description:
      "Literature guides: themes, characters and quotations (free parts).",
    category: "English & humanities",
    subjects: ["English Literature"],
  },
  {
    name: "The Punctuation Guide",
    url: "https://www.thepunctuationguide.com/",
    description: "Clear punctuation reference.",
    category: "English & humanities",
    subjects: ["English Language", "Functional Skills English"],
  },
  {
    name: "LibreTexts History",
    url: "https://human.libretexts.org/Bookshelves/History",
    description: "Open history textbooks.",
    category: "English & humanities",
    subjects: ["History"],
  },
  {
    name: "Smarthistory",
    url: "https://smarthistory.org/",
    description: "Art and cultural history.",
    category: "English & humanities",
    subjects: ["History", "Art and Design"],
  },
  {
    name: "Eyewitness to History",
    url: "http://www.eyewitnesstohistory.com/index.html",
    description: "First-hand accounts for practising source evaluation.",
    category: "English & humanities",
    subjects: ["History"],
  },
  {
    name: "Histography",
    url: "https://histography.io/",
    description: "Interactive timeline of historical events.",
    category: "English & humanities",
    subjects: ["History"],
  },

  // Geography & economics
  {
    name: "ArcGIS Living Atlas",
    url: "https://livingatlas.arcgis.com/en/home/",
    description: "Maps and geographic data layers.",
    category: "Geography & economics",
    subjects: ["Geography"],
  },
  {
    name: "The True Size Of",
    url: "https://thetruesize.com/",
    description: "Compare country sizes without map projection distortion.",
    category: "Geography & economics",
    subjects: ["Geography"],
  },
  {
    name: "UNESCO World Heritage List",
    url: "https://whc.unesco.org/en/list/",
    description: "Official list of World Heritage Sites.",
    category: "Geography & economics",
    subjects: ["Geography", "History"],
  },
  {
    name: "LizardPoint map quizzes",
    url: "https://lizardpoint.com/",
    description: "Map quizzes to learn locations.",
    category: "Geography & economics",
    subjects: ["Geography"],
  },
  {
    name: "CORE Econ",
    url: "https://www.core-econ.org/",
    description: "Free, modern economics textbooks.",
    category: "Geography & economics",
    subjects: ["Economics"],
  },
  {
    name: "Dollar Street (Gapminder)",
    url: "https://www.gapminder.org/dollar-street",
    description: "Compare how families live around the world by income.",
    category: "Geography & economics",
    subjects: ["Geography", "Economics"],
  },
  {
    name: "Atlas of Economic Complexity",
    url: "https://atlas.hks.harvard.edu/",
    description: "Visualise what countries trade.",
    category: "Geography & economics",
    subjects: ["Economics", "Geography"],
  },

  // Study skills
  {
    name: "Art of Memory",
    url: "https://artofmemory.com/",
    description: "Memory techniques such as memory palaces.",
    category: "Study skills",
    subjects: ["All"],
  },
  {
    name: "The Free Learning List",
    url: "https://freelearninglist.org/",
    description: "Curated list of free learning resources.",
    category: "Study skills",
    subjects: ["All"],
  },
  {
    name: "Wikiversity",
    url: "https://www.wikiversity.org/",
    description: "Open learning community and materials.",
    category: "Study skills",
    subjects: ["All"],
  },
  {
    name: "Information is Beautiful",
    url: "https://informationisbeautiful.net/",
    description: "Data visualisation examples, for ideas on presenting data.",
    category: "Study skills",
    subjects: ["All"],
  },
];

export const LIBRARY_CATEGORIES = Array.from(
  new Set(LIBRARY.map((l) => l.category)),
);
