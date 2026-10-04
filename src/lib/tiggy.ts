/** Ask Tiggy settings shared by the chat page, the API route and the pricing page. */

export type TiggyPlan = "free" | "premium";

export const TIGGY_PLANS: Record<
  TiggyPlan,
  {
    /** Free is a one-time allowance; Premium resets daily. Matches the latest Tiggy migration. */
    perDay: number;
    /** How many earlier messages (including the new one) are sent to the model. */
    history: number;
    /** Longest message a learner can send, in characters. */
    maxInput: number;
    /** Total characters of conversation sent with each request. */
    maxContext: number;
    /** Longest reply, in model tokens. */
    maxTokens: number;
    fullSolutions: boolean;
  }
> = {
  free: {
    perDay: 15,
    history: 6,
    maxInput: 1500,
    maxContext: 6000,
    maxTokens: 900,
    fullSolutions: false,
  },
  premium: {
    perDay: 200,
    history: 20,
    maxInput: 4000,
    maxContext: 30000,
    maxTokens: 2500,
    fullSolutions: true,
  },
};

export const TIGGY_DISCLAIMER =
  "Tiggy is an AI and can make mistakes. Check important things with your teacher or the specification.";

export const STARTER_PROMPTS: { label: string; text: string; send: boolean }[] =
  [
    {
      label: "Explain photosynthesis",
      text: "Explain photosynthesis",
      send: true,
    },
    {
      label: "Help me plan revision for my GCSEs",
      text: "Help me plan revision for my GCSEs",
      send: true,
    },
    // Needs the learner's own question and answer, so it fills the box instead of sending.
    {
      label: "Check my answer to…",
      text: "Check my answer to this question: ",
      send: false,
    },
    {
      label: "I'm stressed about exams",
      text: "I'm stressed about exams",
      send: true,
    },
  ];

export { PREMIUM_MONTHLY_LABEL as PREMIUM_PRICE_LABEL } from "@/lib/campaign";

export interface TiggyStatus {
  plan: TiggyPlan;
  used: number;
  limit: number;
  remaining: number;
}
