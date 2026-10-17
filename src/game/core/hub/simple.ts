/**
 * Rules and computer players for the quick Games Hub games: noughts and crosses,
 * Connect Four and draughts. Every state is plain JSON so it can be sent to other
 * players over a realtime room.
 */

// ── Noughts and crosses ──
export type TttCell = 0 | 1 | 2; // empty, X (player 0), O (player 1)
export interface TttState {
  board: TttCell[];
  turn: 0 | 1;
  winner: 0 | 1 | null;
  draw: boolean;
}
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
export const tttNew = (): TttState => ({ board: Array(9).fill(0), turn: 0, winner: null, draw: false });
export function tttWinner(b: TttCell[]): 0 | 1 | null {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return (b[a] - 1) as 0 | 1;
  return null;
}
export function tttMove(s: TttState, i: number): TttState {
  if (s.winner !== null || s.draw || s.board[i]) return s;
  const board = [...s.board];
  board[i] = (s.turn + 1) as TttCell;
  const winner = tttWinner(board);
  return { board, turn: (1 - s.turn) as 0 | 1, winner, draw: winner === null && board.every(Boolean) };
}
/** Perfect play (minimax). */
export function tttAi(s: TttState): number {
  const me = s.turn;
  const score = (b: TttCell[], turn: 0 | 1, depth: number): number => {
    const w = tttWinner(b);
    if (w !== null) return w === me ? 10 - depth : depth - 10;
    if (b.every(Boolean)) return 0;
    let best = turn === me ? -99 : 99;
    for (let i = 0; i < 9; i++)
      if (!b[i]) {
        b[i] = (turn + 1) as TttCell;
        const v = score(b, (1 - turn) as 0 | 1, depth + 1);
        b[i] = 0;
        best = turn === me ? Math.max(best, v) : Math.min(best, v);
      }
    return best;
  };
  let pick = -1;
  let best = -99;
  const b = [...s.board];
  for (let i = 0; i < 9; i++)
    if (!b[i]) {
      b[i] = (me + 1) as TttCell;
      const v = score(b, (1 - me) as 0 | 1, 1) + Math.random() * 0.1;
      b[i] = 0;
      if (v > best) [best, pick] = [v, i];
    }
  return pick;
}

// ── Connect Four ──
export const C4_COLS = 7;
export const C4_ROWS = 6;
export interface C4State {
  board: number[]; // row-major, 0 empty, 1/2 players
  turn: 0 | 1;
  winner: 0 | 1 | null;
  draw: boolean;
  last: number | null;
  line: number[];
}
export const c4New = (): C4State => ({ board: Array(C4_COLS * C4_ROWS).fill(0), turn: 0, winner: null, draw: false, last: null, line: [] });
function c4Line(b: number[], at: number): number[] {
  const v = b[at];
  const r0 = Math.floor(at / C4_COLS);
  const c0 = at % C4_COLS;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [at];
    for (const s of [1, -1])
      for (let k = 1; k < 4; k++) {
        const r = r0 + dr * k * s;
        const c = c0 + dc * k * s;
        if (r < 0 || r >= C4_ROWS || c < 0 || c >= C4_COLS || b[r * C4_COLS + c] !== v) break;
        cells.push(r * C4_COLS + c);
      }
    if (cells.length >= 4) return cells;
  }
  return [];
}
export const c4Drop = (b: number[], col: number) => {
  for (let r = C4_ROWS - 1; r >= 0; r--) if (!b[r * C4_COLS + col]) return r * C4_COLS + col;
  return -1;
};
export function c4Move(s: C4State, col: number): C4State {
  if (s.winner !== null || s.draw) return s;
  const at = c4Drop(s.board, col);
  if (at < 0) return s;
  const board = [...s.board];
  board[at] = s.turn + 1;
  const line = c4Line(board, at);
  return { board, turn: (1 - s.turn) as 0 | 1, winner: line.length ? s.turn : null, draw: !line.length && board.every(Boolean), last: at, line };
}
/** A decent computer player: win, block, then look two moves ahead favouring the centre. */
export function c4Ai(s: C4State): number {
  const me = s.turn + 1;
  const them = 3 - me;
  const cols = [3, 2, 4, 1, 5, 0, 6].filter((c) => c4Drop(s.board, c) >= 0);
  const wins = (b: number[], who: number, c: number) => {
    const at = c4Drop(b, c);
    if (at < 0) return false;
    const nb = [...b];
    nb[at] = who;
    return c4Line(nb, at).length > 0;
  };
  for (const c of cols) if (wins(s.board, me, c)) return c;
  for (const c of cols) if (wins(s.board, them, c)) return c;
  // Don't play under a square that hands them a win.
  const safe = cols.filter((c) => {
    const at = c4Drop(s.board, c);
    const nb = [...s.board];
    nb[at] = me;
    return !cols.some((c2) => wins(nb, them, c2));
  });
  const pool = safe.length ? safe : cols;
  return pool[Math.random() < 0.75 ? 0 : Math.floor(Math.random() * pool.length)];
}

// ── Draughts (English rules: men move forward diagonally, must capture, kings move both ways) ──
export interface DraughtsState {
  board: number[]; // 64 squares: 0 empty, 1/2 men, 3/4 kings (player 0 = 1/3 at the bottom)
  turn: 0 | 1;
  winner: 0 | 1 | null;
  /** A piece mid multi-jump that must keep capturing. */
  chain: number | null;
}
export interface DMove {
  from: number;
  to: number;
  cap: number | null;
}
export function draughtsNew(): DraughtsState {
  const board = Array(64).fill(0);
  for (let i = 0; i < 64; i++) {
    const r = Math.floor(i / 8);
    const c = i % 8;
    if ((r + c) % 2 === 1) {
      if (r < 3) board[i] = 2;
      if (r > 4) board[i] = 1;
    }
  }
  return { board, turn: 0, winner: null, chain: null };
}
const owner = (v: number) => (v === 1 || v === 3 ? 0 : v === 2 || v === 4 ? 1 : -1);
function pieceMoves(b: number[], i: number): DMove[] {
  const v = b[i];
  const p = owner(v);
  if (p < 0) return [];
  const king = v > 2;
  const dirs = king ? [-1, 1] : [p === 0 ? -1 : 1];
  const r = Math.floor(i / 8);
  const c = i % 8;
  const out: DMove[] = [];
  for (const dr of dirs)
    for (const dc of [-1, 1]) {
      const r1 = r + dr;
      const c1 = c + dc;
      if (r1 < 0 || r1 > 7 || c1 < 0 || c1 > 7) continue;
      const j = r1 * 8 + c1;
      if (!b[j]) out.push({ from: i, to: j, cap: null });
      else if (owner(b[j]) === 1 - p) {
        const r2 = r1 + dr;
        const c2 = c1 + dc;
        if (r2 >= 0 && r2 <= 7 && c2 >= 0 && c2 <= 7 && !b[r2 * 8 + c2]) out.push({ from: i, to: r2 * 8 + c2, cap: j });
      }
    }
  return out;
}
export function draughtsMoves(s: DraughtsState): DMove[] {
  if (s.winner !== null) return [];
  const all = s.chain !== null ? pieceMoves(s.board, s.chain).filter((m) => m.cap !== null) : s.board.flatMap((v, i) => (owner(v) === s.turn ? pieceMoves(s.board, i) : []));
  const caps = all.filter((m) => m.cap !== null);
  return caps.length ? caps : s.chain !== null ? [] : all;
}
export function draughtsMove(s: DraughtsState, m: DMove): DraughtsState {
  const board = [...s.board];
  let v = board[m.from];
  board[m.from] = 0;
  if (m.cap !== null) board[m.cap] = 0;
  const row = Math.floor(m.to / 8);
  const crowned = (v === 1 && row === 0) || (v === 2 && row === 7);
  if (crowned) v += 2;
  board[m.to] = v;
  let next: DraughtsState = { board, turn: s.turn, winner: null, chain: null };
  if (m.cap !== null && !crowned) {
    const more = pieceMoves(board, m.to).filter((x) => x.cap !== null);
    if (more.length) return { ...next, chain: m.to };
  }
  next = { ...next, turn: (1 - s.turn) as 0 | 1 };
  if (!draughtsMoves(next).length) next.winner = s.turn;
  return next;
}
/** Greedy computer: takes the most pieces, crowns when it can, avoids leaving pieces hanging. */
export function draughtsAi(s: DraughtsState): DMove | null {
  const moves = draughtsMoves(s);
  if (!moves.length) return null;
  const value = (m: DMove) => {
    const n = draughtsMove(s, m);
    let v = (m.cap !== null ? 10 : 0) + (n.board[m.to] > 2 && s.board[m.from] <= 2 ? 6 : 0);
    // Can they capture back straight away?
    if (n.turn !== s.turn && draughtsMoves(n).some((x) => x.cap === m.to)) v -= 8;
    return v + Math.random();
  };
  return moves.reduce((a, b) => (value(b) > value(a) ? b : a));
}
