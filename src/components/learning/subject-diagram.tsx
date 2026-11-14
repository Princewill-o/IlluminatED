import styles from "./subjects.module.css";

import type { SubjectPack } from "@/lib/learning/packs";


/** Accessible schematic evidence, drawn for these lessons rather than decorative photos. */
export function SubjectDiagram({ kind }: { kind: SubjectPack["diagram"] }) {
  const titles: Record<SubjectPack["diagram"], string> = {
    percentage: "A hundred square with 25 shaded squares: 25% = one quarter",
    ratio: "Seven equal parts shared in the ratio three to four",
    profit: "Revenue £120 minus costs £65 leaves profit £55",
    cell: "Simplified plant cell with a cell wall, membrane, nucleus, chloroplasts and vacuole",
    particles: "Particle arrangements in a solid, liquid and gas; schematic and not to scale",
    circuit: "A closed series circuit with a 6 volt cell and a 12 ohm resistor; current is 0.5 amperes",
    evidence: "An argument connects an observation to an interpretation and acknowledges a limitation",
    language: "Analysis connects a precise quotation with its connotations and contextual effect",
    writing: "A useful piece of writing connects purpose, evidence, structure and revision",
  };
  return <figure className={styles.diagram}>
    <svg viewBox="0 0 620 250" role="img" aria-label={titles[kind]}>
      <title>{titles[kind]}</title>
      {kind === "percentage" && <>
        {Array.from({ length: 100 }, (_, i) => <rect key={i} x={24 + (i % 10) * 19} y={22 + Math.floor(i / 10) * 19} width="16" height="16" rx="3" fill={i < 25 ? "#a855f7" : "#d8deed"} />)}
        <text x="260" y="95" className={styles.largeLabel}>25 / 100</text><text x="260" y="136">= 0.25 = 25%</text><text x="260" y="180">25% of 80 = 20</text>
      </>}
      {kind === "ratio" && <>
        {Array.from({ length: 7 }, (_, i) => <g key={i}><rect x={30 + i * 80} y="60" width="65" height="75" rx="12" fill={i < 3 ? "#a855f7" : "#0891b2"} /><text x={62 + i * 80} y="105" textAnchor="middle" fill="#fff" className={styles.onColor}>12</text></g>)}
        <text x="150" y="178" textAnchor="middle">3 parts = 36</text><text x="430" y="178" textAnchor="middle">4 parts = 48</text><text x="310" y="221" textAnchor="middle">7 equal parts · 84 altogether</text>
      </>}
      {kind === "profit" && <>
        <rect x="40" y="40" width="540" height="50" rx="8" fill="#0891b2" /><text x="310" y="72" textAnchor="middle" className={styles.onColor}>Revenue £120</text>
        <rect x="40" y="114" width="292" height="50" rx="8" fill="#a855f7" /><text x="186" y="146" textAnchor="middle" className={styles.onColor}>Costs £65</text>
        <rect x="344" y="114" width="236" height="50" rx="8" fill="#0f766e" /><text x="462" y="146" textAnchor="middle" className={styles.onColor}>Profit £55</text>
        <text x="310" y="216" textAnchor="middle">Profit = revenue − all relevant costs</text>
      </>}
      {kind === "cell" && <>
        <rect x="38" y="32" width="285" height="180" rx="33" fill="#d1fae5" stroke="#0f766e" strokeWidth="8" /><rect x="49" y="43" width="263" height="158" rx="26" fill="#ecfdf5" stroke="#0891b2" strokeWidth="3" />
        <rect x="130" y="78" width="125" height="95" rx="24" fill="#bfdbfe" stroke="#2563eb" strokeWidth="2" /><circle cx="87" cy="110" r="23" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="3" />
        {[70,145,250].map((x) => <ellipse key={x} cx={x} cy="59" rx="15" ry="7" fill="#16a34a" />)}
        <path d="M325 45H370 M310 85H370 M88 110H370 M250 150H370 M250 59H350V205H370" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <text x="380" y="50">Cell wall</text><text x="380" y="90">Cell membrane</text><text x="380" y="115">Nucleus</text><text x="380" y="155">Permanent vacuole</text><text x="380" y="210">Chloroplasts</text>
      </>}
      {kind === "particles" && <>
        {[["Solid", 25], ["Liquid", 225], ["Gas", 425]].map(([label, x]) => <g key={label}><rect x={x} y="35" width="170" height="155" rx="14" fill="none" stroke="currentColor" strokeWidth="2" /><text x={Number(x) + 85} y="225" textAnchor="middle">{label}</text></g>)}
        {Array.from({ length: 16 }, (_, i) => <circle key={`s${i}`} cx={55 + (i % 4) * 32} cy={60 + Math.floor(i / 4) * 32} r="10" fill="#a855f7" />)}
        {Array.from({ length: 16 }, (_, i) => <circle key={`l${i}`} cx={249 + (i % 4) * 34 + (Math.floor(i / 4) % 2) * 8} cy={72 + Math.floor(i / 4) * 31} r="10" fill="#0891b2" />)}
        {[[448,63],[555,54],[495,113],[567,162],[445,165]].map(([x,y]) => <circle key={x} cx={x} cy={y} r="10" fill="#0f766e" />)}
      </>}
      {kind === "circuit" && <>
        <path d="M100 70H283 M307 70H520V185H365 M255 185H100V70" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M283 43V97 M307 55V85" stroke="currentColor" strokeWidth="5" /><rect x="255" y="165" width="110" height="40" fill="none" stroke="currentColor" strokeWidth="4" />
        <text x="295" y="28" textAnchor="middle">6 V supply</text><text x="310" y="239" textAnchor="middle">12 Ω resistor</text><text x="340" y="128">I = V/R = 0.5 A</text>
      </>}
      {["evidence", "language", "writing"].includes(kind) && <>
        {(kind === "evidence" ? ["Observe", "Interpret", "Check limits"] : kind === "language" ? ["Quote", "Explain", "Connect"] : ["Purpose", "Develop", "Revise"]).map((label, i) => <g key={label}>
          <rect x={24 + i * 205} y="65" width="170" height="110" rx="20" fill={i === 0 ? "#7c3aed" : i === 1 ? "#0e7490" : "#0f766e"} />
          <text x={109 + i * 205} y="125" textAnchor="middle" className={styles.onColor}>{label}</text>{i < 2 && <path d={`M${200+i*205} 120h20m-8-8 8 8-8 8`} fill="none" stroke="currentColor" strokeWidth="3" />}
        </g>)}
      </>}
    </svg>
    <figcaption>{titles[kind]}. Simplified learning diagram.</figcaption>
  </figure>;
}
