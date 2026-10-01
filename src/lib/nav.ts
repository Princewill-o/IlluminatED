export interface NavLink {
  title: string;
  href: string;
  description: string;
}
export interface NavGroup {
  label: string;
  items: NavLink[];
}

export const NAV: NavGroup[] = [
  {
    label: "Learn",
    items: [
      {
        title: "GCSE",
        href: "/gcse",
        description: "Years 10–11, with a Year 11 focus",
      },
      {
        title: "A level",
        href: "/a-level",
        description: "Years 12–13 subject routes",
      },
      { title: "BTEC", href: "/btec", description: "Level 2 and 3 by sector" },
      {
        title: "T Levels",
        href: "/t-levels",
        description: "Technical routes with placements",
      },
      {
        title: "Level 2 & 3",
        href: "/level-2-3",
        description: "Functional Skills, Core Maths, EPQ and more",
      },
      {
        title: "All courses",
        href: "/courses",
        description: "Search and filter every course",
      },
    ],
  },
  {
    label: "Practise",
    items: [
      {
        title: "Ask Tiggy",
        href: "/tiggy",
        description: "Your AI study helper for explanations and hints",
      },
      {
        title: "Quiz centre",
        href: "/quizzes",
        description: "Quick, topic, mixed and timed practice",
      },
      {
        title: "Flashcards",
        href: "/flashcards",
        description: "Key terms and retrieval questions",
      },
      {
        title: "Revision planner",
        href: "/revision",
        description: "Plan sessions and print study sheets",
      },
      {
        title: "Your dashboard",
        href: "/dashboard",
        description: "Progress by topic and what to revise next",
      },
      {
        title: "Grade calculator",
        href: "/calculator",
        description: "What you need on your remaining papers",
      },
      {
        title: "Get a tutor",
        href: "/tutors",
        description: "Homework, coursework guidance and exam prep",
      },
    ],
  },
  {
    label: "Resources",
    items: [
      {
        title: "Official resources",
        href: "/resources",
        description: "Specifications, past papers and outlines",
      },
      {
        title: "Free learning library",
        href: "/library",
        description: "Hand-picked free sites to learn more",
      },
      {
        title: "Qualification search",
        href: "/qualifications",
        description: "Search the Ofqual register",
      },
      {
        title: "Education data",
        href: "/data",
        description: "Published DfE statistics",
      },
      {
        title: "Reading lookup",
        href: "/reading",
        description: "Background reading and books",
      },
      {
        title: "Careers and apprenticeships",
        href: "/careers",
        description: "Explore apprenticeships, T Levels and university routes",
      },
    ],
  },
  {
    label: "Social",
    items: [
      {
        title: "IlluminatEDSocial",
        href: "/social",
        description: "Ask students about sixth form, uni and more",
      },
      {
        title: "Universities",
        href: "/social/universities",
        description: "What students say about each university",
      },
      {
        title: "Community guidelines",
        href: "/social/guidelines",
        description: "How we keep the forum safe",
      },
    ],
  },
  {
    label: "Help",
    items: [
      {
        title: "About IlluminatED",
        href: "/about",
        description: "What we cover and how it works",
      },
      {
        title: "FAQ",
        href: "/faq",
        description: "Exam boards, papers, data and more",
      },
      {
        title: "Your data",
        href: "/your-data",
        description: "What we save and how to delete it",
      },
      {
        title: "Accessibility",
        href: "/accessibility",
        description: "How we make the site usable",
      },
    ],
  },
];
