/** Independent role simulations with walk-in offices in IllumWorld. */
export const TRAINING_WORKPLACES = [
  { id: "jpmorgan-chase", name: "JPMorgan Chase", sector: "Finance", accent: "#234c79", role: "quantitative-researcher" },
  { id: "accenture", name: "Accenture", sector: "Technology consulting", accent: "#7c3eb4", role: "accenture-data-analyst" },
  { id: "aws", name: "Amazon Web Services", sector: "Cloud technology", accent: "#cb762b", role: "aws-solutions-architect" },
  { id: "deloitte", name: "Deloitte", sector: "Finance consulting", accent: "#407744", role: "deloitte-data-analyst" },
  { id: "cognizant", name: "Cognizant", sector: "AI research", accent: "#267582", role: "ai-engineer" },
  { id: "github", name: "GitHub", sector: "Software engineering", accent: "#4a536d", role: "software-engineer" },
  { id: "goldman-sachs", name: "Goldman Sachs", sector: "Finance", accent: "#32658f", role: "risk-analyst" },
  { id: "ibm", name: "IBM", sector: "Cyber security", accent: "#2b63b7", role: "ibm-cybersecurity-analyst" },
  { id: "walmart", name: "Walmart", sector: "Retail technology", accent: "#226eb2", role: "walmart-software-engineer" },
  { id: "tata", name: "Tata Group", sector: "Technology consulting", accent: "#2f719c", role: "tata-data-analyst" },
] as const;

export const trainingWorkplace = (id: string) => TRAINING_WORKPLACES.find(workplace => workplace.id === id);
