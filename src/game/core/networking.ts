/**
 * Networking events: some buildings host live meet-ups where players in the
 * same room can meet each other (and fictional guests from that industry),
 * practise introducing themselves and swap cards (friend requests).
 *
 * Events rotate every half hour, so there is always one on when you walk in.
 */
export interface Guest {
  name: string;
  role: string;
  /** What the guest says first. */
  opener: string;
  /** Three replies: one is a strong networking move. */
  replies: [string, string, string];
  best: 0 | 1 | 2;
  /** Why the best reply works. */
  why: string;
}
export interface NetworkingEvent {
  id: string;
  title: string;
  industry: string;
  colour: string;
  blurb: string;
  guests: [Guest, Guest, Guest];
}

export const NETWORKING_EVENTS: NetworkingEvent[] = [
  {
    id: "tech", title: "Careers in Tech Mixer", industry: "Technology", colour: "#2b5fd9",
    blurb: "Software, games, cyber security and AI. Meet people who build the apps you use.",
    guests: [
      { name: "Priya Shah", role: "Software engineer", opener: "Hi! Are you into coding, or just curious about tech?",
        replies: ["I'm curious. What does a normal day look like for you?", "Can you get me a job at your company?", "Coding is boring, to be honest."], best: 0,
        why: "Asking about their day shows real interest and keeps the conversation going." },
      { name: "Tom Adeyemi", role: "Games designer", opener: "I make puzzle games. What do you like playing?",
        replies: ["Whatever's free.", "I love puzzle games. How do you test if a level is too hard?", "I don't really play games."], best: 1,
        why: "Linking your interest to their work, with a specific question, makes you memorable." },
      { name: "Grace Liu", role: "Cyber security analyst", opener: "We spend all day stopping hackers. Any questions?",
        replies: ["Is it like in films?", "What subjects helped you most to get into cyber security?", "Can you hack my friend's account?"], best: 1,
        why: "Asking which subjects helped turns a chat into advice you can use for your options." },
    ],
  },
  {
    id: "health", title: "Medicine & Healthcare Meet-up", industry: "Healthcare", colour: "#15987f",
    blurb: "Doctors, nurses, paramedics and physios share what the job is really like.",
    guests: [
      { name: "Dr Amara Okafor", role: "Junior doctor", opener: "Thinking about medicine? It's a long road but worth it.",
        replies: ["How long is the training?", "What made you choose medicine, and was work experience hard to find?", "Do doctors earn loads?"], best: 1,
        why: "A two-part question about motivation and work experience gets useful, personal advice." },
      { name: "Sam Patel", role: "Paramedic", opener: "Every shift is different in an ambulance.",
        replies: ["That sounds exciting. What's the most important skill on a shift?", "I faint at blood.", "Cool."], best: 0,
        why: "Asking about skills helps you see whether the job fits you." },
      { name: "Lucy Grant", role: "Physiotherapist", opener: "I help athletes get back to their sport after injuries.",
        replies: ["Do you work with famous people?", "I play netball. Which A levels would help me become a physio?", "I don't do sport."], best: 1,
        why: "Sharing something about yourself and asking a clear question builds a connection." },
    ],
  },
  {
    id: "creative", title: "Creative Industries Social", industry: "Creative", colour: "#d1468f",
    blurb: "Music, film, fashion and design. Bring your ideas.",
    guests: [
      { name: "Jade Morgan", role: "Music producer", opener: "I produce tracks for new artists. Do you make music?",
        replies: ["A bit, on my phone. How did you build your first portfolio?", "Can you make me famous?", "No."], best: 0,
        why: "Asking how they started gives you a next step for your own portfolio." },
      { name: "Ollie Brooks", role: "Film editor", opener: "Editing is where a film really comes together.",
        replies: ["Films are too long now.", "What software should a beginner learn?", "Do you meet actors?"], best: 1,
        why: "A practical question shows you're serious and gives you something to try tonight." },
      { name: "Mei Tanaka", role: "Fashion designer", opener: "I just finished a collection made from recycled fabric.",
        replies: ["That's clever. Where do you find ideas for a new collection?", "I only wear trainers.", "Is it expensive?"], best: 0,
        why: "A compliment plus a question about their process makes people enjoy talking to you." },
    ],
  },
  {
    id: "law", title: "Law & Public Service Evening", industry: "Law and government", colour: "#704c47",
    blurb: "Solicitors, barristers and civil servants on careers that shape the country.",
    guests: [
      { name: "Daniel Reid", role: "Solicitor", opener: "Law isn't all courtrooms. Most of my work is helping families.",
        replies: ["Do you need a law degree, or are there apprenticeships?", "I watch a lot of courtroom TV.", "Sounds boring."], best: 0,
        why: "Asking about different routes in (like apprenticeships) shows you've thought about your options." },
      { name: "Aisha Rahman", role: "Barrister", opener: "Speaking in court takes a lot of practice.",
        replies: ["I'd be too scared.", "How did you practise public speaking at school?", "Do you wear the wig?"], best: 1,
        why: "Turning a worry into a question about practice gives you a way to improve." },
      { name: "Chris Evans", role: "Civil servant", opener: "I work on transport policy for the government.",
        replies: ["The buses are always late.", "What does a policy adviser actually do day to day?", "Is that like being Prime Minister?"], best: 1,
        why: "Asking what the job really involves clears up mysteries about less well-known careers." },
    ],
  },
  {
    id: "engineering", title: "Engineering & Space Night", industry: "Engineering", colour: "#e2572b",
    blurb: "Bridges, rockets, robots and renewable energy.",
    guests: [
      { name: "Fatima Noor", role: "Aerospace engineer", opener: "My team is building parts for a satellite.",
        replies: ["Can I go to space?", "That's amazing. Which part are you working on, and what's the hardest bit?", "Maths is too hard for me."], best: 1,
        why: "Showing enthusiasm and asking about their challenge gets people sharing stories." },
      { name: "Ben Clarke", role: "Civil engineer", opener: "I helped design the new footbridge by the river.",
        replies: ["I walk over it every day! How long did it take to design?", "Bridges are just big planks.", "Was it expensive?"], best: 0,
        why: "Connecting their work to your life is a great conversation starter." },
      { name: "Leah Wong", role: "Robotics apprentice", opener: "I chose an apprenticeship instead of uni. I get paid to learn.",
        replies: ["Is that easier than uni?", "How did you apply, and what was the interview like?", "Robots will take all the jobs."], best: 1,
        why: "Asking about the application process gives you steps you can follow yourself." },
    ],
  },
  {
    id: "business", title: "Business & Start-ups Breakfast", industry: "Business", colour: "#d6a21b",
    blurb: "Founders, marketers and accountants. Pitch your idea.",
    guests: [
      { name: "Kemi Johnson", role: "Start-up founder", opener: "I started my company at nineteen, selling snacks at uni.",
        replies: ["How did you get your first customers?", "Are you rich?", "I could do that."], best: 0,
        why: "Asking about first customers shows you're thinking like a business person." },
      { name: "Raj Mehta", role: "Marketing manager", opener: "My job is getting people to notice a brand.",
        replies: ["Adverts are annoying.", "Which campaign are you proudest of, and why did it work?", "Can you promote my channel?"], best: 1,
        why: "Asking about their proudest work makes them want to help you." },
      { name: "Helen Ward", role: "Accountant", opener: "People think accounting is just numbers, but it's problem-solving.",
        replies: ["I'm doing business studies. What would surprise me about your job?", "I hate maths.", "Do you do taxes?"], best: 0,
        why: "Linking to your subject and asking an open question starts a proper conversation." },
    ],
  },
];

/** Buildings that host networking events, and how their events are offset. */
export const NETWORKING_VENUES: Record<string, { name: string; offset: number }> = {
  "town-hall": { name: "Town Hall · Council gallery", offset: 0 },
  starbucks: { name: "Hearth & Bean · Upstairs lounge", offset: 3 },
};

const SLOT = 30 * 60_000;
/** The event on now at a venue, and when it ends. */
export function eventAt(venue: string, now: number) {
  const v = NETWORKING_VENUES[venue] ?? { name: venue, offset: 0 };
  const slot = Math.floor(now / SLOT);
  const event = NETWORKING_EVENTS[(slot + v.offset) % NETWORKING_EVENTS.length];
  const next = NETWORKING_EVENTS[(slot + 1 + v.offset) % NETWORKING_EVENTS.length];
  return { event, next, endsAt: (slot + 1) * SLOT, venue: v.name };
}

/** A short line telling you how long is left. */
export function timeLeft(endsAt: number, now: number) {
  const m = Math.max(0, Math.ceil((endsAt - now) / 60_000));
  return m <= 1 ? "Ends in a minute" : `${m} minutes left`;
}
