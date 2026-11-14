export type SubjectProduct = "maths" | "science" | "english";
export type PackQuestion = { prompt: string; options: string[]; answer: number; explanation: string };
export type SubjectPack = {
  product: SubjectProduct; slug: string; title: string; level: string; minutes: number;
  summary: string; outcomes: string[]; explanation: string[];
  workedExample: { question: string; steps: string[]; answer: string };
  diagram: "percentage" | "ratio" | "profit" | "cell" | "particles" | "circuit" | "evidence" | "language" | "writing";
  evidence?: { title: string; text: string };
  questions: PackQuestion[];
  writing?: { prompt: string; model: string; rubric: { criterion: string; guidance: string }[] };
};

/** Original IllumED mini-packs. These are focused practice, not a complete exam specification. */
const CORE_PACKS: SubjectPack[] = [
  {
    product: "maths", slug: "percentages", title: "Percentages that make sense", level: "KS3 · GCSE foundation", minutes: 15,
    summary: "Connect fractions, hundred squares and multipliers to solve everyday percentage problems.",
    outcomes: ["Find a percentage of an amount", "Increase and decrease with multipliers", "Use the original amount for percentage change"],
    explanation: ["Percent means out of 100: 25% = 25/100 = 0.25. Finding 25% of an amount means multiplying by 0.25, or dividing by 4.", "For mental calculations, find 10% by dividing by 10 and 1% by dividing by 100. Combine these: 15% = 10% + 5%.", "An increase of 20% keeps the original 100% and adds 20%, so multiply by 1.20. A decrease of 20% leaves 80%, so multiply by 0.80.", "Percentage change = (change ÷ original amount) × 100. A fall from £80 to £60 is 20 ÷ 80 × 100 = 25%, not 20%.", "An increase and a decrease of the same percentage do not cancel: £100 × 1.20 × 0.80 = £96. The second percentage uses a different base."],
    workedExample: { question: "A £64 coat is reduced by 15%. What is its sale price?", steps: ["Find the remaining percentage: 100% − 15% = 85%.", "Convert to a multiplier: 85/100 = 0.85.", "Calculate £64 × 0.85 = £54.40.", "Check: 10% is £6.40 and 5% is £3.20, so the £9.60 discount gives the same result."], answer: "£54.40" },
    diagram: "percentage",
    questions: [
      { prompt: "What is 15% of 80?", options: ["8", "12", "15", "68"], answer: 1, explanation: "10% is 8 and 5% is 4. Add them: 12." },
      { prompt: "Which multiplier increases an amount by 8%?", options: ["0.08", "0.92", "1.08", "8"], answer: 2, explanation: "Keep the original 100% plus 8%: 108% = 1.08." },
      { prompt: "A price rises from £40 to £50. What is the percentage increase?", options: ["10%", "20%", "25%", "50%"], answer: 2, explanation: "The change is £10. Divide by the original £40: 10/40 × 100 = 25%." },
      { prompt: "£200 is reduced by 30%. What remains?", options: ["£60", "£140", "£170", "£230"], answer: 1, explanation: "70% remains: 200 × 0.70 = £140." },
    ],
  },
  {
    product: "maths", slug: "ratio-proportion", title: "Ratio and proportion", level: "KS3 · GCSE foundation", minutes: 15,
    summary: "Use equal-sized parts to share quantities and scale recipes without guesswork.",
    outcomes: ["Simplify ratios using a common factor", "Share an amount in a ratio", "Use unit rates to scale direct proportions"],
    explanation: ["A ratio compares quantities in a stated order. Red:blue = 2:3 means two red parts for every three blue parts. There are five parts altogether.", "Simplify every part by the same factor: 12:18 = 2:3 after dividing both numbers by 6. You cannot subtract the same number from both parts.", "To share an amount, add the ratio parts, divide the total by that sum, then multiply each part. £60 in the ratio 2:3 gives five parts of £12: £24 and £36.", "Direct proportion means the same scale factor applies to both quantities. If 4 portions use 300 g flour, one portion uses 75 g and 10 portions use 750 g.", "Units matter. Convert to the same units before comparing or simplifying. 50 cm:2 m is 50:200 = 1:4."],
    workedExample: { question: "Share 84 tokens between Ada and Ben in the ratio 3:4.", steps: ["Add the parts: 3 + 4 = 7.", "One part = 84 ÷ 7 = 12 tokens.", "Ada gets 3 × 12 = 36; Ben gets 4 × 12 = 48.", "Check: 36 + 48 = 84, and 36:48 simplifies to 3:4."], answer: "Ada 36 tokens; Ben 48 tokens" },
    diagram: "ratio",
    questions: [
      { prompt: "Simplify 18:24.", options: ["3:4", "6:8", "9:12", "1:6"], answer: 0, explanation: "Divide both parts by their highest common factor, 6." },
      { prompt: "£90 is shared in the ratio 2:3. What is the larger share?", options: ["£18", "£30", "£36", "£54"], answer: 3, explanation: "There are five parts of £18; the larger share is 3 × £18 = £54." },
      { prompt: "6 identical tickets cost £42. What do 10 cost at the same rate?", options: ["£46", "£60", "£70", "£420"], answer: 2, explanation: "One ticket costs £7. Ten cost 10 × £7 = £70." },
      { prompt: "What is 25 cm:1 m in simplest form?", options: ["25:1", "1:4", "4:1", "1:25"], answer: 1, explanation: "1 m = 100 cm. The ratio 25:100 simplifies to 1:4." },
    ],
  },
  {
    product: "maths", slug: "profit-financial-maths", title: "Profit and financial maths", level: "GCSE · everyday finance", minutes: 18,
    summary: "Separate revenue, costs and profit, then make a budget that balances.",
    outcomes: ["Calculate revenue, total costs and profit", "Distinguish markup from profit margin", "Calculate simple interest and a remaining budget"],
    explanation: ["Revenue is money earned from sales: selling price × number sold. Profit is revenue minus all relevant costs. A negative result is a loss.", "Fixed costs stay the same over the chosen output range, such as a stall fee. Variable costs change with each item, such as ingredients. Total costs = fixed costs + variable cost per item × number made.", "Markup compares profit per item with its cost: (profit ÷ cost) × 100. Margin compares profit with selling price: (profit ÷ selling price) × 100. A £6 item sold for £10 has 66.7% markup but 40% margin, before other costs.", "Simple interest = principal × annual rate as a decimal × time in years. £200 at 5% simple interest for 3 years earns £30. Compound interest adds each period's interest to the balance, so it is different.", "A budget lists income and spending over the same period. Include essentials and a buffer before deciding what is affordable. These examples teach calculations, not recommendations for financial products."],
    workedExample: { question: "A stall sells 30 snacks for £4 each. Ingredients cost £1.50 per snack and the stall fee is £20. Find profit.", steps: ["Revenue = 30 × £4 = £120.", "Variable costs = 30 × £1.50 = £45.", "Total costs = £45 + £20 = £65.", "Profit = £120 − £65 = £55. This assumes all 30 snacks were made and sold and no other costs apply."], answer: "£55 profit" },
    diagram: "profit",
    questions: [
      { prompt: "Revenue is £240 and total costs are £175. What is profit?", options: ["£65", "£175", "£240", "£415"], answer: 0, explanation: "Profit = revenue − total costs = 240 − 175 = £65." },
      { prompt: "An item costs £8 and sells for £10. What is its profit margin before other costs?", options: ["2%", "20%", "25%", "80%"], answer: 1, explanation: "Margin uses selling price: £2 profit ÷ £10 × 100 = 20%." },
      { prompt: "Find simple interest on £300 at 4% per year for 2 years.", options: ["£12", "£24", "£24.48", "£324"], answer: 1, explanation: "Interest alone is 300 × 0.04 × 2 = £24. £324 is the final balance." },
      { prompt: "You earn £180, spend £95 on essentials and reserve £25. What is left?", options: ["£35", "£60", "£85", "£110"], answer: 1, explanation: "180 − 95 − 25 = £60 remains after spending and reserving the buffer." },
    ],
  },
  {
    product: "science", slug: "cells-microscopy", title: "Cells and microscopy", level: "KS3 · GCSE biology", minutes: 18,
    summary: "Read cell diagrams, choose useful observations and calculate magnification.",
    outcomes: ["Compare typical plant and animal cells", "Calculate magnification with consistent units", "Describe a careful microscopy observation"],
    explanation: ["Typical animal cells have a cell membrane, cytoplasm, a nucleus, mitochondria and ribosomes. The membrane controls movement of substances; the nucleus contains genetic material.", "Typical plant cells also have a cellulose cell wall and a permanent vacuole. Photosynthetic plant cells contain chloroplasts, where photosynthesis happens. Root cells usually do not have chloroplasts.", "Magnification = image size ÷ actual size. Both sizes must use the same units. 1 mm = 1,000 micrometres (µm). Resolution is the ability to distinguish nearby points; making a blurred image larger does not improve resolution.", "Start viewing a prepared slide with the lowest-power objective, centre the specimen and focus before using a higher power. Follow your teacher's safety instructions with glass, stains and equipment.", "A scientific drawing uses clear single lines, labels and a scale or magnification. Record what you observe; do not add structures just because a textbook diagram shows them."],
    workedExample: { question: "A cell image is 20 mm long. Its actual length is 50 µm. What is the magnification?", steps: ["Convert image length to micrometres: 20 × 1,000 = 20,000 µm.", "Magnification = image size ÷ actual size.", "20,000 ÷ 50 = 400.", "Write ×400. Magnification is a ratio with no length unit."], answer: "×400" },
    diagram: "cell",
    questions: [
      { prompt: "Which structure controls movement into and out of a cell?", options: ["Nucleus", "Cell membrane", "Cell wall", "Vacuole"], answer: 1, explanation: "The cell membrane regulates movement of substances into and out of the cell." },
      { prompt: "Which statement about chloroplasts is most accurate?", options: ["All cells have them", "All animal cells have them", "Photosynthetic plant cells contain them", "They store genetic material in every cell"], answer: 2, explanation: "Chloroplasts enable photosynthesis. Not all plant cells photosynthesise." },
      { prompt: "An image is 10 mm long and the actual object is 0.05 mm. Find magnification.", options: ["×0.5", "×20", "×200", "×500"], answer: 2, explanation: "Both units are mm, so 10 ÷ 0.05 = 200." },
      { prompt: "What does improved resolution allow?", options: ["Any image to grow without blur", "Closer points to be distinguished", "A specimen to become larger", "The removal of all measurement error"], answer: 1, explanation: "Resolution describes the ability to distinguish two close points as separate." },
    ],
  },
  {
    product: "science", slug: "particles-materials", title: "Particles and materials", level: "KS3 · GCSE chemistry", minutes: 16,
    summary: "Explain states of matter, changes of state and fair comparisons of materials.",
    outcomes: ["Use a particle model for solids, liquids and gases", "Explain physical changes without inventing new particles", "Choose controlled variables for a materials test"],
    explanation: ["In a solid, particles are close together and vibrate about fixed positions. In a liquid, they stay close but move past each other. Gas particles are far apart and move rapidly in random directions.", "Heating transfers energy. During melting, particles overcome enough of the attractions holding them in fixed positions to move past each other. The particles themselves do not melt or expand; their arrangement changes.", "A change of state is a physical change: the substance stays the same. In a closed system, mass is conserved. Apparent loss during evaporation happens when vapour escapes the measured container.", "Material properties depend on structure and bonding. Test the property relevant to the use: water absorption for a rain cover, flexibility for a hinge, and electrical conductivity for a wire.", "For a fair test, change one independent variable, measure a dependent variable and control other conditions. Repeat readings and consider their spread before claiming one material is better."],
    workedExample: { question: "Three equal-size materials absorb 8 g, 2 g and 5 g of water after five minutes. Which is the best starting choice for a waterproof cover?", steps: ["Identify the property: low water absorption is useful for this purpose.", "Keep area, initial dryness, water exposure and test time the same.", "Material B absorbs least: 2 g.", "Repeat the test and check strength and durability before making a final choice."], answer: "Material B is the best candidate from this test; more evidence is needed." },
    diagram: "particles",
    questions: [
      { prompt: "Which description best fits a liquid?", options: ["Particles fixed and motionless", "Particles close and able to move past each other", "Particles very far apart in a regular grid", "Particles change into a new element"], answer: 1, explanation: "Liquid particles remain close but move past each other, so the liquid can flow." },
      { prompt: "When ice melts in a sealed container, what happens to total mass?", options: ["It increases", "It decreases", "It stays the same", "It becomes zero"], answer: 2, explanation: "No matter leaves the closed system; melting is a physical change." },
      { prompt: "Which should be controlled when comparing water absorption?", options: ["Only the material type", "The measured absorption", "Sample area and immersion time", "The conclusion"], answer: 2, explanation: "Keep sample area and time constant so material type is the meaningful difference." },
      { prompt: "Why repeat measurements?", options: ["To guarantee no error", "To assess consistency and reduce random error in a mean", "To choose only the result you like", "To change all variables"], answer: 1, explanation: "Repeats reveal spread and support a more reliable mean; they do not remove systematic error." },
    ],
  },
  {
    product: "science", slug: "electricity-circuits", title: "Electricity and circuits", level: "KS3 · GCSE physics", minutes: 18,
    summary: "Trace current, compare series and parallel circuits and apply V = IR.",
    outcomes: ["Explain current and potential difference", "Compare series and parallel rules", "Calculate resistance safely from low-voltage evidence"],
    explanation: ["Current is the rate of flow of charge, measured in amperes (A). Potential difference is energy transferred per unit charge, measured in volts (V). Current is not used up by a lamp; energy is transferred.", "In a series circuit there is one complete path, so current is the same through each component. The supply potential difference is shared between components.", "In parallel, branches provide separate paths. Potential difference is the same across each branch connected to the supply; total current is the sum of branch currents.", "Resistance = potential difference ÷ current, or V = IR. For an ohmic conductor at constant temperature, current is proportional to potential difference.", "Connect an ammeter in series and a voltmeter in parallel across a component. This lesson uses diagrams and calculations only. Never experiment with mains electricity; practical work needs approved low-voltage equipment and supervision."],
    workedExample: { question: "A resistor has a potential difference of 6 V and a current of 0.5 A. Find its resistance.", steps: ["Choose R = V ÷ I.", "Substitute consistent units: R = 6 V ÷ 0.5 A.", "6 ÷ 0.5 = 12.", "State the unit: ohms (Ω). Check 0.5 A × 12 Ω = 6 V."], answer: "12 Ω" },
    diagram: "circuit",
    questions: [
      { prompt: "What is the current after a lamp in a simple series loop?", options: ["Zero", "Less because current is used up", "The same as before the lamp", "Always 1 A"], answer: 2, explanation: "Current is the same throughout a series loop. The lamp transfers energy, not charge away." },
      { prompt: "A 3 Ω resistor carries 2 A. Find the potential difference.", options: ["1.5 V", "5 V", "6 V", "9 V"], answer: 2, explanation: "Use potential difference = current × resistance: V = I × R = 2 × 3 = 6 V." },
      { prompt: "Where is a voltmeter connected?", options: ["In series only", "In parallel across the component", "In place of every wire", "Directly across mains by a learner"], answer: 1, explanation: "A voltmeter measures the difference between two points, so connects in parallel across the component." },
      { prompt: "Two parallel branches carry 0.2 A and 0.3 A. What is total current?", options: ["0.1 A", "0.25 A", "0.5 A", "0.6 A"], answer: 2, explanation: "At the junction the currents add: 0.2 + 0.3 = 0.5 A." },
    ],
  },
  {
    product: "english", slug: "reading-evidence", title: "Read closely, prove your point", level: "KS3 · GCSE English language", minutes: 18,
    summary: "Separate inference from observation and select short, relevant evidence.",
    outcomes: ["Make an inference supported by the text", "Choose precise quotations", "Explain how evidence supports an interpretation"],
    explanation: ["An observation says what the text explicitly tells us. An inference is a reasonable interpretation built from those details. A useful inference can be challenged and supported; it is not a fact merely because it sounds plausible.", "Choose a brief quotation that directly supports the point. Copy its wording accurately and put it in quotation marks. A long quotation can hide the detail you actually need.", "Build an analytical paragraph around point, evidence and explanation. Explain the link between the chosen words and your reading instead of ending immediately after the quotation.", "Consider alternatives and context. A character looking at a clock might be impatient or worried about a deadline. Read surrounding details before deciding.", "The passage below is original IllumED writing. Practice scores show understanding of this pack; they are not predictions of an exam grade."],
    evidence: { title: "Original extract: The unopened door", text: "Maya stood outside the workshop. Through the glass she could see her finished chair under a white sheet. She checked the folded invitation again, smoothing its corners with her thumb. When laughter rose from inside, she stepped back into the rain." },
    workedExample: { question: "What can we infer about Maya's feelings?", steps: ["Point: Maya appears anxious about entering the workshop.", "Evidence: she repeatedly checks the invitation and then ‘stepped back into the rain’.", "Explain: the unnecessary checking suggests hesitation, while retreating from the warm, lively room makes avoidance visible.", "Qualify: the extract does not state why she is anxious, so claiming she dislikes everyone would go beyond the evidence."], answer: "A supported interpretation links her hesitation to specific actions without inventing a cause." },
    diagram: "evidence",
    questions: [
      { prompt: "Which statement is an explicit observation?", options: ["Maya fears every person inside", "Maya steps back into the rain", "Maya has lost the invitation", "Maya dislikes making chairs"], answer: 1, explanation: "The extract directly states that she steps back into the rain. The others add unsupported details." },
      { prompt: "Which detail most directly supports hesitation?", options: ["The chair exists", "The workshop has glass", "She checks the invitation again", "The sheet is white"], answer: 2, explanation: "Repeated checking before entering is relevant evidence of hesitation." },
      { prompt: "What should follow a quotation in analysis?", options: ["An explanation of how it supports the point", "A new unrelated quotation", "A claim that no other reading is possible", "Nothing"], answer: 0, explanation: "Explain the connection between the language or action and your interpretation." },
      { prompt: "Which inference stays closest to the evidence?", options: ["Maya is planning a crime", "Maya is certainly angry at her father", "Maya seems reluctant to enter", "Maya cannot read"], answer: 2, explanation: "Her checking and retreat support reluctance. The text does not establish the other claims." },
    ],
    writing: { prompt: "In 80–150 words, explain how the extract presents Maya's hesitation. Use two brief quotations and consider one alternative interpretation.", model: "Maya's small repeated actions suggest hesitation. She checks the invitation ‘again’, implying that she already knows she is welcome but still needs reassurance. Her decision to step ‘back into the rain’ makes that uncertainty physical: she accepts discomfort instead of joining the lively room. Alternatively, smoothing the paper could show excitement and care rather than fear. However, her retreat when she hears laughter makes anxiety the stronger reading. The passage leaves its cause open, so it would be premature to claim that a particular guest has upset her.", rubric: [{ criterion: "Clear interpretation", guidance: "State a specific idea about hesitation rather than retelling the whole extract." }, { criterion: "Precise evidence", guidance: "Select two accurate, brief quotations and explain each." }, { criterion: "Reasoned judgement", guidance: "Consider a plausible alternative and decide which reading the details support." }] },
  },
  {
    product: "english", slug: "language-analysis", title: "How language shapes a scene", level: "KS3 · GCSE English language", minutes: 20,
    summary: "Move beyond spotting techniques to explain the effect of a writer's choices.",
    outcomes: ["Identify a meaningful word or image", "Explain connotations in context", "Connect sentence choices to pace"],
    explanation: ["Analysis asks how a choice creates meaning. Naming a simile or an adjective is only the start; explain what the comparison or word suggests in this particular scene.", "Connotations are associations a word may carry. ‘Crawled’ can suggest slow movement, weakness or unease, depending on context. Avoid listing meanings unrelated to the passage.", "Imagery invites a reader to imagine through description or comparison. A metaphor presents one thing as another; a simile makes a comparison using ‘like’ or ‘as’. These labels help precision but do not replace interpretation.", "Sentence length and punctuation influence pace alongside content. A brief sentence can interrupt a flowing description. Avoid claiming that every short sentence always creates tension.", "Use tentative, justified language: ‘suggests’ and ‘may imply’ allow interpretation while evidence keeps it focused. Different responses can be convincing if they explain the words carefully."],
    evidence: { title: "Original extract: After closing", text: "The market shutters clattered down like shields. A ribbon of rain twisted between the empty stalls, and the last bus dragged its yellow light along the road. Then the power failed. Every window went black." },
    workedExample: { question: "How does the writer make the market feel exposed?", steps: ["Choose the comparison ‘like shields’.", "Explain how shields suggest protection against a threat, turning ordinary shutters into defensive objects.", "Connect this to the empty stalls and failing light, which remove signs of busy human life.", "Discuss the interruption ‘Then the power failed’: its directness ends the flowing description and makes the loss of safety abrupt."], answer: "Link the defensive image and abrupt interruption to a reasoned reading of the atmosphere." },
    diagram: "language",
    questions: [
      { prompt: "Which quotation is a simile?", options: ["‘like shields’", "‘Every window’", "‘the road’", "‘Then the power failed’"], answer: 0, explanation: "‘Like’ explicitly compares the shutters with shields." },
      { prompt: "Which analysis best explains ‘dragged its yellow light’?", options: ["It is a verb", "It tells us buses exist", "‘Dragged’ makes the movement seem slow and effortful", "Yellow always means happiness"], answer: 2, explanation: "This response connects a precise word with a plausible effect in context." },
      { prompt: "What is a useful way to discuss the short sentence about the power?", options: ["Every short sentence creates the same effect", "It abruptly interrupts the flowing description here", "It proves the writer dislikes electricity", "It has no meaning because it is short"], answer: 1, explanation: "Explain the effect of this sentence in this sequence, avoiding a universal rule." },
      { prompt: "Which claim needs better evidence?", options: ["The market is empty", "The shutters are compared with shields", "The writer definitely wants every reader to feel joy", "The power fails"], answer: 2, explanation: "A claim about every reader's definite feelings is unsupported and conflicts with the surrounding details." },
    ],
    writing: { prompt: "Write 100–180 words analysing how two language choices make the scene feel unsettling. Include one word-level comment and one sentence-level comment.", model: "The comparison of shutters to ‘shields’ introduces the idea of defence, as if the ordinary market needs protection from something beyond it. This implication makes the empty setting feel vulnerable. The bus then ‘dragged’ its light along the road; the verb suggests effort and slow movement, so even the last source of warmth seems reluctant to leave. After the flowing description, ‘Then the power failed’ interrupts with a brief, direct statement. The change in rhythm makes darkness arrive suddenly. Together, the defensive image and the broken flow make the scene unsettling without naming a specific danger.", rubric: [{ criterion: "Relevant choices", guidance: "Select two small details that support the atmosphere you identify." }, { criterion: "Developed explanation", guidance: "Explain associations and effects in context rather than naming techniques alone." }, { criterion: "Sentence-level insight", guidance: "Discuss a specific change in pace or structure with evidence." }] },
  },
  {
    product: "english", slug: "writing-audience", title: "Write for a real audience", level: "KS3 · GCSE English language", minutes: 20,
    summary: "Plan, draft and improve a clear argument for a purpose and audience.",
    outcomes: ["Choose an appropriate tone and form", "Build a reasoned paragraph", "Revise for accuracy and accessibility"],
    explanation: ["Before writing, decide your purpose, audience and form. A letter to a headteacher has different conventions and tone from a message to a friend, even if the subject is the same.", "A useful argument states a proposal, gives reasons and evidence, and addresses a reasonable objection. Do not invent statistics and present them as real evidence.", "Use paragraphs to guide a reader: introduce the issue, develop connected reasons, consider a counterargument and finish with a specific action. Each paragraph should have a clear job.", "A formal tone can still be direct and readable. Prefer concrete requests and respectful wording. Rhetorical questions or repetition help only when they support the purpose.", "Revision is more than correcting spelling. Check whether the reader knows what you want, whether your evidence supports it, and whether sentences and punctuation make the argument easy to follow."],
    evidence: { title: "Writing brief", text: "Your school is considering a quiet lunchtime reading area. Write a formal proposal to the headteacher suggesting a four-week trial. There is an unused classroom available, but staff supervision time is limited. No survey results have been collected." },
    workedExample: { question: "How could you open the proposal?", steps: ["Name the audience and maintain a respectful formal tone.", "State a specific request: a four-week trial of a quiet reading room.", "Offer a reason without invented numbers: some pupils may value a calm alternative.", "Acknowledge supervision and propose a manageable next step rather than ignoring the constraint."], answer: "‘I propose a four-week trial of a quiet reading room, subject to an agreed supervision plan.’" },
    diagram: "writing",
    questions: [
      { prompt: "Who is the intended audience for the brief?", options: ["A close friend", "The headteacher", "A book character", "An anonymous game rival"], answer: 1, explanation: "The brief explicitly asks for a proposal to the headteacher." },
      { prompt: "Which use of evidence is responsible?", options: ["Invent a 95% survey result", "Claim everyone supports the idea", "Suggest collecting pupil feedback during the trial", "Ignore supervision completely"], answer: 2, explanation: "No survey exists. Proposing feedback gathering is honest and useful." },
      { prompt: "Which sentence best fits a formal proposal?", options: ["You must do this or else", "Yo, open the room", "Could we trial the room for four weeks and review attendance?", "Everyone who disagrees is wrong"], answer: 2, explanation: "It gives a respectful, specific and reviewable request." },
      { prompt: "What is the most useful final revision check?", options: ["Add as many long words as possible", "Check purpose, evidence, organisation and accuracy", "Remove every full stop", "Repeat the first point ten times"], answer: 1, explanation: "Effective revision improves meaning and organisation as well as spelling and punctuation." },
    ],
    writing: { prompt: "Write a 150–250 word proposal for the reading-room trial. Address the supervision constraint, avoid invented statistics and finish with a clear next step.", model: "Dear Headteacher,\n\nI propose a four-week trial of a quiet lunchtime reading room in the unused classroom. It could offer pupils a calm place to read independently and make better use of an available space.\n\nThe trial would need a realistic supervision plan. Rather than opening every day immediately, we could begin with two lunchtimes a week if a member of staff is available. A sign-in sheet, a clear capacity limit and agreed expectations would help the supervising adult manage the room. Student volunteers could organise books, but would not replace staff responsibility.\n\nThere is no survey evidence yet, so we should not assume demand. During the trial we could record attendance and invite brief pupil and staff feedback. After four weeks, we could compare the benefits with the supervision time required.\n\nPlease could we discuss whether a small trial is practical before announcing it to pupils?\n\nYours sincerely,\nA student representative", rubric: [{ criterion: "Purpose and audience", guidance: "Make a clear, respectful request suited to a headteacher." }, { criterion: "Reasoned organisation", guidance: "Develop reasons and a practical response to supervision." }, { criterion: "Accuracy and integrity", guidance: "Use clear paragraphs and punctuation; do not present invented evidence as fact." }] },
  },
];

export const SUPPORT_PACKS: SubjectPack[] = [
  {
    product: "science", slug: "inspection-evidence", title: "Inspection: evidence before conclusions", level: "Applied science · workplace practice", minutes: 10,
    summary: "Use observations, measurements and limitations to make a defensible inspection note.",
    outcomes: ["Separate an observation from a cause", "Compare like-for-like measurements", "Explain uncertainty and a sensible next check"],
    explanation: ["Record location, date, instrument and units so another person can understand what was measured. ‘A damp patch is visible below the window’ is an observation; ‘the roof is leaking’ is a possible cause needing evidence.", "Compare readings taken with the same method and conditions. A moisture meter reading is evidence to interpret alongside the material, calibration and weather; it is not a complete diagnosis.", "Repeat measurements when safe and report variation. Recommend an appropriate further check when evidence is insufficient, and use qualified professionals for structural, gas, asbestos or electrical concerns."],
    evidence: { title: "Practice inspection record (fictional)", text: "Room A, north window: visible brown staining below the sill. Three comparative moisture readings: 22, 23 and 22 on the meter's relative scale. An interior reference wall reads 10. Rain fell the previous night. The window exterior has not been inspected. These readings are not percentages." },
    workedExample: { question: "What conclusion does this evidence support?", steps: ["State the observation: staining and higher relative readings near the window.", "Compare with the reference reading, acknowledging the meter's relative scale.", "Offer water ingress or condensation as possibilities, not a confirmed cause.", "Recommend a qualified inspection of seals and surrounding areas before repairs are specified."], answer: "Elevated readings need further investigation; the source is not yet confirmed." },
    diagram: "evidence",
    questions: [
      { prompt: "Which is an observation?", options: ["The roof has definitely failed", "Staining is visible below the sill", "The occupant caused the damage", "Replacing the wall will solve it"], answer: 1, explanation: "Visible staining is directly recorded. The other statements assume a cause or solution." },
      { prompt: "How should 22 on this meter be reported?", options: ["22% moisture", "22 metres", "22 on the stated relative scale", "A guaranteed structural failure"], answer: 2, explanation: "The brief specifies a relative scale, not a percentage." },
      { prompt: "Why record an interior reference reading?", options: ["To provide a comparison under a stated method", "To prove every wall is identical", "To replace calibration", "To remove all uncertainty"], answer: 0, explanation: "A reference helps comparison; it does not remove material differences or calibration needs." },
      { prompt: "What is the appropriate next step?", options: ["Declare a cause without checking", "Hide the uncertainty", "Recommend further qualified investigation", "Attempt unsafe electrical repairs"], answer: 2, explanation: "The source remains uncertain, so report limits and arrange an appropriate further check." },
    ],
  },
  {
    product: "english", slug: "condition-report", title: "Write a clear condition report", level: "Applied English · workplace practice", minutes: 12,
    summary: "Turn inspection notes into a concise, neutral report with evidence and next steps.",
    outcomes: ["Use neutral, precise wording", "Separate findings, interpretation and action", "State limits without hiding useful evidence"],
    explanation: ["A condition report helps a reader decide what to investigate next. Use headings for location, findings, limitations and recommended action.", "Replace vague judgement with specific observations: ‘a 20 cm stain below the north window’ is more useful than ‘the wall looks awful’. Do not blame a person without evidence.", "Distinguish what is seen, what may explain it, and what remains unverified. Keep technical claims within the evidence and refer hazards to a qualified professional."],
    evidence: { title: "Original practice notes", text: "North-facing bedroom. Brown stain, approximately 20 cm wide, below the window sill. Relative meter readings 22–23; interior reference 10. Exterior not accessed. No source confirmed. Resident asks what happens next." },
    workedExample: { question: "How can the findings be written neutrally?", steps: ["Location: north-facing bedroom, below window sill.", "Finding: an approximately 20 cm brown stain; relative meter readings 22–23 compared with 10 at the reference wall.", "Limitation: exterior not accessed and cause unconfirmed.", "Action: arrange qualified investigation of the window and surrounding area before specifying repairs."], answer: "Use measured findings, an explicit limitation and a practical next action." },
    diagram: "writing",
    questions: [
      { prompt: "Which sentence is most neutral and precise?", options: ["The resident ruined everything", "An approximately 20 cm stain is visible below the sill", "The room is disgusting", "The building is certainly unsafe"], answer: 1, explanation: "It states a measurable observation without unsupported blame or diagnosis." },
      { prompt: "Where should the uninspected exterior be mentioned?", options: ["Nowhere", "As a limitation", "As proof of a leak", "As a made-up photograph"], answer: 1, explanation: "The inaccessible exterior limits the conclusions and should be stated." },
      { prompt: "Which action fits the evidence?", options: ["Confirm a roof leak", "Order structural demolition", "Arrange a qualified investigation of the window area", "Guarantee no further problem"], answer: 2, explanation: "Further investigation is proportionate because the source has not been confirmed." },
      { prompt: "What should a useful report distinguish?", options: ["Findings, interpretation, limits and next steps", "Rumours and insults", "Only the writer's feelings", "Only a final price"], answer: 0, explanation: "This separation helps readers understand the strength and practical meaning of the evidence." },
    ],
    writing: { prompt: "Write a 100–180 word condition note for the resident using Findings, Limitations and Next steps. Do not claim a confirmed cause.", model: "Findings\nA brown stain approximately 20 cm wide is visible below the window sill in the north-facing bedroom. Comparative meter readings were 22–23 on the instrument's relative scale; an interior reference wall read 10. These are comparative readings, not moisture percentages.\n\nLimitations\nThe exterior was not accessed, and the source of the staining has not been confirmed. The observations alone do not establish whether water ingress, condensation or another cause is responsible.\n\nNext steps\nArrange a qualified inspection of the window, seals and surrounding area. Record the findings before specifying repairs. The resident should receive an update after that inspection, including the proposed action and any remaining uncertainty.", rubric: [{ criterion: "Evidence", guidance: "Include the location, approximate size and correctly described readings." }, { criterion: "Neutral judgement", guidance: "State that the source is unconfirmed and avoid blame." }, { criterion: "Useful action", guidance: "Give a proportionate next step in clear, accessible language." }] },
  },
];

const EXTRA_QUESTIONS: Record<string, PackQuestion[]> = {
  percentages: [
    { prompt: "A £50 price is increased by 20%, then reduced by 20%. What is the final price?", options: ["£50", "£48", "£40", "£52"], answer: 1, explanation: "50 × 1.20 × 0.80 = 48. The two changes use different starting amounts." },
    { prompt: "After a 10% discount a ticket costs £36. What was the original price?", options: ["£39.60", "£40", "£46", "£32.40"], answer: 1, explanation: "£36 is 90% of the original. Divide by 0.90 to obtain £40." },
    { prompt: "Express 0.075 as a percentage.", options: ["0.75%", "7.5%", "75%", "750%"], answer: 1, explanation: "Multiply a decimal by 100 to express it as a percentage: 0.075 × 100 = 7.5%." },
    { prompt: "A quantity falls from 150 to 120. Find the percentage decrease.", options: ["20%", "25%", "30%", "80%"], answer: 0, explanation: "The decrease is 30 out of the original 150: 30/150 × 100 = 20%." },
  ],
  "ratio-proportion": [
    { prompt: "Red:blue counters = 3:5. What fraction of all counters is red?", options: ["3/5", "5/8", "3/8", "5/3"], answer: 2, explanation: "There are eight parts altogether and three are red, so the fraction is 3/8." },
    { prompt: "A recipe for 4 uses 300 g flour. How much is needed for 6?", options: ["200 g", "450 g", "600 g", "1,800 g"], answer: 1, explanation: "The scale factor is 6/4 = 1.5. Multiply 300 g by 1.5 to get 450 g." },
    { prompt: "Share 72 in the ratio 1:2:3. What is the middle share?", options: ["12", "18", "24", "36"], answer: 2, explanation: "Six parts share 72, so each part is 12. The middle share is two parts: 24." },
    { prompt: "Paint A:B = 2:7. If A is 10 litres, how much B is needed?", options: ["14 litres", "25 litres", "35 litres", "70 litres"], answer: 2, explanation: "Two parts represent 10 litres, so one part is 5 litres. Seven parts are 35 litres." },
  ],
  "profit-financial-maths": [
    { prompt: "20 items sell for £6 each. What is revenue?", options: ["£26", "£100", "£120", "£140"], answer: 2, explanation: "Revenue is selling price × number sold: £6 × 20 = £120, before costs." },
    { prompt: "Fixed costs are £30 and variable cost is £2 per item. What is total cost for 15 items?", options: ["£30", "£45", "£60", "£90"], answer: 2, explanation: "Total cost = £30 + 15 × £2 = £60." },
    { prompt: "A £12 item is sold for £15. What is the markup on cost?", options: ["3%", "20%", "25%", "80%"], answer: 2, explanation: "Markup compares the £3 difference with the £12 cost: 3/12 × 100 = 25%." },
    { prompt: "Revenue is £95 but total costs are £110. What is the result?", options: ["£15 profit", "£15 loss", "£205 profit", "Break-even"], answer: 1, explanation: "Profit = 95 − 110 = −£15, so this is a £15 loss." },
  ],
  "cells-microscopy": [
    { prompt: "Which structure is present in a typical plant cell but not a typical animal cell?", options: ["Cytoplasm", "Cell membrane", "Cellulose cell wall", "Ribosome"], answer: 2, explanation: "Plants have a cellulose cell wall; both typical plant and animal cells have the other listed structures." },
    { prompt: "Convert 0.2 mm to micrometres.", options: ["0.0002 µm", "2 µm", "20 µm", "200 µm"], answer: 3, explanation: "1 mm = 1,000 µm, so 0.2 × 1,000 = 200 µm." },
    { prompt: "Which objective should normally be used to find a specimen first?", options: ["The lowest-power objective", "Always the highest-power objective", "No objective", "Any lens without focusing"], answer: 0, explanation: "Low power gives a wider field of view, making the specimen easier to find and centre." },
    { prompt: "A 50 µm object is magnified ×100. How long is its image?", options: ["0.5 µm", "5 mm", "50 mm", "500 mm"], answer: 1, explanation: "Image size = actual size × magnification: 50 µm × 100 = 5,000 µm. Divide by 1,000 to convert to 5 mm." },
  ],
  "particles-materials": [
    { prompt: "What happens to individual particles when a solid melts?", options: ["They melt into smaller particles", "They become a new element", "They can move past each other as the arrangement changes", "They stop moving"], answer: 2, explanation: "Melting changes the arrangement and movement; the substance's particles do not themselves melt." },
    { prompt: "Which state usually has particles far apart and moving randomly?", options: ["Solid", "Liquid", "Gas", "All states equally"], answer: 2, explanation: "Gas particles are much farther apart than in solids or liquids and move randomly." },
    { prompt: "In an absorption test, what is the dependent variable?", options: ["Type of material deliberately changed", "Mass of water absorbed", "Time held constant", "Sample area held constant"], answer: 1, explanation: "The dependent variable is measured: in this test, how much water the material absorbs." },
    { prompt: "A material has low water absorption. What can this alone establish?", options: ["It is also strongest", "It will last forever", "It absorbed little under the stated test conditions", "It is suitable for every purpose"], answer: 2, explanation: "One property test supports a limited conclusion; strength and durability need other evidence." },
  ],
  "electricity-circuits": [
    { prompt: "Which unit measures current?", options: ["Volt", "Ohm", "Ampere", "Joule per kilogram"], answer: 2, explanation: "Current is measured in amperes, written A." },
    { prompt: "A resistor has 12 V across it and carries 3 A. What is resistance?", options: ["0.25 Ω", "4 Ω", "9 Ω", "36 Ω"], answer: 1, explanation: "Resistance = potential difference ÷ current. R = V/I = 12/3 = 4 Ω." },
    { prompt: "Two branches are connected in parallel across a 6 V supply. What is the potential difference across each?", options: ["3 V", "6 V", "12 V", "It must be zero"], answer: 1, explanation: "Each branch connected across the supply has the same potential difference: 6 V." },
    { prompt: "Which is appropriate for a learner's practical circuit?", options: ["Unsupervised mains wiring", "Opening a mains socket", "Approved low-voltage equipment with supervision", "Bypassing a fuse"], answer: 2, explanation: "Practical work needs approved low-voltage equipment and appropriate supervision. Never experiment with mains electricity." },
  ],
  "reading-evidence": [
    { prompt: "Why are short quotations often useful?", options: ["They remove the need to explain", "They focus attention on relevant words", "They always guarantee full marks", "They let you change the writer's wording"], answer: 1, explanation: "Brief, accurate quotations isolate the detail your interpretation depends on." },
    { prompt: "What can we safely say about the cause of Maya's hesitation?", options: ["It is certainly a dislike of chairs", "Her father is definitely inside", "The extract leaves the cause uncertain", "She has definitely never visited before"], answer: 2, explanation: "The text supplies signs of hesitation but does not establish its cause." },
    { prompt: "Which phrase introduces a properly qualified interpretation?", options: ["This proves every reader thinks", "This may suggest", "There is no other possible reading", "I need no evidence because"], answer: 1, explanation: "‘May suggest’ acknowledges interpretation while still allowing you to justify it with details." },
    { prompt: "What makes an alternative interpretation useful?", options: ["It is unrelated to the passage", "It contradicts every detail", "It is plausible and can be compared against evidence", "It is longer than the first interpretation"], answer: 2, explanation: "A useful alternative is grounded in the same text, so you can weigh which interpretation is better supported." },
  ],
  "language-analysis": [
    { prompt: "What is missing from ‘The writer uses a simile’?", options: ["A technique name", "A connection between a precise example and its meaning", "A statement that the text has words", "A longer technique list"], answer: 1, explanation: "Naming a technique needs to be followed by evidence and an explanation of its meaning or effect." },
    { prompt: "Which association of ‘shields’ fits this scene?", options: ["Protection against a threat", "A guaranteed celebration", "A bus timetable", "A literal proof of medieval warfare"], answer: 0, explanation: "Shields suggest defence, which supports a reading of vulnerability in the empty market." },
    { prompt: "How is ‘a ribbon of rain’ best described?", options: ["A literal clothing label", "A metaphor that gives rain a narrow, twisting shape", "A numerical fact", "A dialogue tag"], answer: 1, explanation: "Rain is presented as a ribbon, inviting the reader to picture its narrow, twisting form." },
    { prompt: "Which is the strongest analytical method?", options: ["List every technique without examples", "Describe only your own unrelated memory", "Select a detail, explain its connotations and connect it to the scene", "Assume one word means the same in all texts"], answer: 2, explanation: "Focused evidence and contextual explanation produce analysis rather than feature spotting." },
  ],
  "writing-audience": [
    { prompt: "Which ending gives a clear next step?", options: ["That's all, whatever", "Please could we discuss the supervision plan before announcing a trial?", "Everyone knows this is perfect", "There can be no objections"], answer: 1, explanation: "It asks for a specific, practical action while respecting the audience." },
    { prompt: "What is a useful counterargument to address?", options: ["Limited staff supervision time", "An invented celebrity opinion", "The writer's favourite colour", "A random unrelated complaint"], answer: 0, explanation: "The brief identifies supervision as a real constraint; addressing it strengthens the proposal." },
    { prompt: "Which statement handles the lack of survey data honestly?", options: ["95% have agreed, although none were asked", "Demand is guaranteed", "We could collect attendance and feedback during the trial", "Evidence does not matter"], answer: 2, explanation: "Proposing data collection acknowledges what is unknown and offers a way to evaluate demand." },
    { prompt: "What should each paragraph normally do?", options: ["Repeat exactly the previous paragraph", "Develop a connected point that serves the purpose", "Contain the same number of words", "Avoid all punctuation"], answer: 1, explanation: "Paragraphs organise a sequence of relevant points and guide the reader through the argument." },
  ],
};

export const SUBJECT_PACKS = CORE_PACKS.map((pack) => ({ ...pack, questions: [...pack.questions, ...EXTRA_QUESTIONS[pack.slug]] }));
export const ALL_SUBJECT_PACKS = [...SUBJECT_PACKS, ...SUPPORT_PACKS];
export function findSubjectPack(product: string, slug: string) {
  return ALL_SUBJECT_PACKS.find((pack) => pack.product === product && pack.slug === slug);
}

export function gradePack(pack: SubjectPack, answers: number[]) {
  if (answers.length !== pack.questions.length || answers.some((a, i) => !Number.isInteger(a) || a < 0 || a >= pack.questions[i].options.length)) throw new Error("Answer every question with a valid option.");
  const correct = answers.map((answer, index) => answer === pack.questions[index].answer);
  return { score: correct.filter(Boolean).length, maxScore: pack.questions.length, correct };
}

export function practiceSet(pack: SubjectPack, round = 0) {
  const size = Math.min(4, pack.questions.length);
  return Array.from({ length: size }, (_, i) => (round * size + i) % pack.questions.length);
}

/** Race ordering prioritises accuracy; speed breaks ties. No currency or exam grade is awarded. */
export function racePoints(score: number, maxScore: number, elapsedSeconds: number) {
  if (!Number.isInteger(score) || !Number.isInteger(maxScore) || score < 0 || maxScore < 1 || score > maxScore || !Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) throw new Error("Invalid race result");
  return Math.round((score / maxScore) * 100) * 1000 + Math.max(0, 999 - Math.floor(elapsedSeconds));
}
