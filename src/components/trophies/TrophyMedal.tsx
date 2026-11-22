"use client";

import { useId, type ReactNode } from "react";
import type { TrophyState } from "@/lib/trophies";

/** Mix a hex color toward white (t > 0) or black (t < 0). */
function shade(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((c) => Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t)));
  return `rgb(${ch.join(",")})`;
}

const CY = 80; // medal centre

/** Emblems are drawn around (50, CY) in a ~44 unit box using stroke `s` and fill `f`. */
function Emblem({ id, s, f, hi }: { id: string; s: string; f: string; hi: string }) {
  const common = { stroke: s, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const txt = { fill: s, fontWeight: 800, textAnchor: "middle" as const, fontFamily: "system-ui, sans-serif" };
  let body: ReactNode;
  switch (id) {
    case "thousand-club": // barbell with 1000
      body = (
        <>
          <line x1="30" y1={CY - 6} x2="70" y2={CY - 6} {...common} strokeWidth={3} />
          <rect x="32" y={CY - 15} width="5" height="18" rx="1.5" fill={f} {...common} />
          <rect x="25" y={CY - 12} width="5" height="12" rx="1.5" fill={f} {...common} />
          <rect x="63" y={CY - 15} width="5" height="18" rx="1.5" fill={f} {...common} />
          <rect x="70" y={CY - 12} width="5" height="12" rx="1.5" fill={f} {...common} />
          <text x="50" y={CY + 15} fontSize="13" {...txt}>1000</text>
        </>
      );
      break;
    case "symmetry-master": // balanced scale
      body = (
        <>
          <line x1="50" y1={CY - 16} x2="50" y2={CY + 14} {...common} />
          <line x1="33" y1={CY - 12} x2="67" y2={CY - 12} {...common} />
          <path d={`M26 ${CY}L33 ${CY - 12}L40 ${CY}Z M60 ${CY}L67 ${CY - 12}L74 ${CY}Z`} fill={f} {...common} />
          <path d={`M24 ${CY}Q33 ${CY + 8} 42 ${CY}M58 ${CY}Q67 ${CY + 8} 76 ${CY}`} fill={f} {...common} />
          <path d={`M40 ${CY + 15}H60L55 ${CY + 10}H45Z`} fill={f} {...common} />
          <circle cx="50" cy={CY - 17} r="2.2" fill={hi} {...common} strokeWidth={1} />
        </>
      );
      break;
    case "weekend-warrior": // calendar with flame
      body = (
        <>
          <rect x="29" y={CY - 15} width="42" height="34" rx="4" fill={f} {...common} />
          <line x1="29" y1={CY - 7} x2="71" y2={CY - 7} {...common} />
          <line x1="38" y1={CY - 19} x2="38" y2={CY - 12} {...common} strokeWidth={3} />
          <line x1="62" y1={CY - 19} x2="62" y2={CY - 12} {...common} strokeWidth={3} />
          <path d={`M50 ${CY - 3}C54 ${CY + 3} 58 ${CY + 5} 56 ${CY + 11}C55 ${CY + 15} 45 ${CY + 15} 44 ${CY + 11}C43 ${CY + 7} 47 ${CY + 5} 47 ${CY}C49 ${CY + 1} 49 ${CY - 1} 50 ${CY - 3}Z`} fill={hi} {...common} strokeWidth={1.5} />
        </>
      );
      break;
    case "heavy-metal-century": // stacked plates with 100K
      body = (
        <>
          <rect x="27" y={CY + 5} width="46" height="10" rx="3" fill={f} {...common} />
          <rect x="31" y={CY - 5} width="38" height="9" rx="3" fill={f} {...common} />
          <rect x="35" y={CY - 14} width="30" height="8" rx="3" fill={f} {...common} />
          <text x="50" y={CY + 12.5} fontSize="8" {...txt}>100K</text>
        </>
      );
      break;
    case "apex-contender": // faceted diamond with three stars
      body = (
        <>
          <path d={`M36 ${CY - 6}L42 ${CY - 15}H58L64 ${CY - 6}L50 ${CY + 18}Z`} fill={f} {...common} />
          <path d={`M36 ${CY - 6}H64M45 ${CY - 6}L50 ${CY + 18}L55 ${CY - 6}L50 ${CY - 15}Z`} fill="none" {...common} strokeWidth={1.2} />
          {[32, 50, 68].map((x, i) => (
            <path key={x} d={`M${x} ${CY - 26 + (i === 1 ? -2 : 2)}l1.4 3h3.2l-2.6 2 1 3.2-3-1.9-3 1.9 1-3.2-2.6-2h3.2z`} fill={hi} stroke={s} strokeWidth={0.8} transform={`translate(0 ${i === 1 ? -1 : 3})`} />
          ))}
        </>
      );
      break;
    default: // unbreakable chain link
      body = (
        <>
          <rect x="27" y={CY - 9} width="28" height="18" rx="9" fill="none" {...common} strokeWidth={4} transform={`rotate(-35 50 ${CY})`} />
          <rect x="45" y={CY - 9} width="28" height="18" rx="9" fill="none" {...common} strokeWidth={4} transform={`rotate(-35 50 ${CY})`} />
          <rect x="27" y={CY - 9} width="28" height="18" rx="9" fill="none" stroke={hi} strokeWidth={1.2} transform={`rotate(-35 50 ${CY})`} />
        </>
      );
  }
  return <g>{body}</g>;
}

export default function TrophyMedal({ state, size = 96 }: { state: TrophyState; size?: number }) {
  const uid = useId().replace(/:/g, "");
  const { def, unlocked } = state;
  const c = def.color;
  const g = (n: string) => `${uid}-${n}`;
  const u = (n: string) => `url(#${g(n)})`;

  const rim = unlocked ? [shade(c, 0.6), c, shade(c, -0.35), shade(c, -0.6)] : ["#4B5563", "#374151", "#1F2937", "#111827"];
  const face = unlocked ? [shade(c, 0.45), c, shade(c, -0.3), shade(c, -0.5)] : ["#374151", "#2B3441", "#1F2937", "#161C26"];
  const ribA = unlocked ? c : "#374151";
  const ribB = unlocked ? shade(c, -0.45) : "#1F2937";
  const ink = unlocked ? shade(c, -0.6) : "#111827";
  const emblemFill = unlocked ? shade(c, 0.55) : "#2B3441";
  const emblemHi = unlocked ? "#FFFFFF" : "#4B5563";
  const label = `${def.name} medal, ${unlocked ? "unlocked" : "locked"}`;

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 100 124"
      width={size}
      height={(size * 124) / 100}
      className="shrink-0"
      style={unlocked ? { filter: `drop-shadow(0 0 ${size / 8}px ${c}88)` } : undefined}
    >
      <defs>
        <linearGradient id={g("rim")} x1="0.2" y1="0" x2="0.8" y2="1">
          {rim.map((s, i) => <stop key={i} offset={i / (rim.length - 1)} stopColor={s} />)}
        </linearGradient>
        <radialGradient id={g("face")} cx="0.35" cy="0.28" r="0.85">
          {face.map((s, i) => <stop key={i} offset={i / (face.length - 1)} stopColor={s} />)}
        </radialGradient>
        <linearGradient id={g("rA")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(ribA, 0.3)} /><stop offset="0.5" stopColor={ribA} /><stop offset="1" stopColor={shade(ribA, -0.3)} />
        </linearGradient>
        <linearGradient id={g("rB")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(ribB, 0.25)} /><stop offset="0.5" stopColor={ribB} /><stop offset="1" stopColor={shade(ribB, -0.3)} />
        </linearGradient>
        <linearGradient id={g("sh")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.55" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={g("clip")}><circle cx="50" cy={CY} r="36" /></clipPath>
      </defs>
      {unlocked && (
        <style>{`.${g("sw")}{animation:${g("k")} 4.5s ease-in-out infinite}@keyframes ${g("k")}{0%,55%{transform:translateX(-60px)}100%{transform:translateX(120px)}}@media (prefers-reduced-motion:reduce){.${g("sw")}{animation:none;opacity:0}}`}</style>
      )}
      {/* ribbon */}
      <path d="M30 2H50L58 44H40Z" fill={u("rA")} stroke={ink} strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M70 2H50L42 44H60Z" fill={u("rB")} stroke={ink} strokeWidth="0.8" strokeLinejoin="round" />
      <circle cx="50" cy="44" r="5" fill={u("rim")} stroke={ink} strokeWidth="0.8" />
      {/* medal body */}
      <circle cx="50" cy={CY} r="40" fill={u("rim")} stroke={ink} strokeWidth="1" />
      <circle cx="50" cy={CY} r="38.5" fill="none" stroke={rim[0]} strokeWidth="1.4" strokeDasharray="60 70" strokeDashoffset="-30" opacity="0.9" />
      <circle cx="50" cy={CY} r="38.5" fill="none" stroke={rim[3]} strokeWidth="1.4" strokeDasharray="60 70" strokeDashoffset="35" opacity="0.9" />
      <circle cx="50" cy={CY} r="36" fill={u("face")} stroke={ink} strokeWidth="1" />
      <circle cx="50" cy={CY} r="33" fill="none" stroke={unlocked ? shade(c, 0.5) : "#374151"} strokeWidth="0.6" opacity="0.7" />
      {/* engraved shadow then emblem */}
      <g transform="translate(0.8 1)" opacity={unlocked ? 0.35 : 0.6}>
        <Emblem id={def.id} s="#000" f="#000" hi="#000" />
      </g>
      <Emblem id={def.id} s={ink} f={emblemFill} hi={emblemHi} />
      {unlocked && (
        <g clipPath={u("clip")}>
          <rect className={g("sw")} x="0" y={CY - 40} width="22" height="80" fill={u("sh")} transform="skewX(-20)" />
        </g>
      )}
      {!unlocked && (
        <g transform="translate(68 100)">
          <circle r="11" fill="#111827" stroke="#4B5563" strokeWidth="1.2" />
          <path d="M-3.6 -1.5V-3.6a3.6 3.6 0 0 1 7.2 0V-1.5" fill="none" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round" />
          <rect x="-5" y="-1.5" width="10" height="7.5" rx="1.6" fill="#9CA3AF" />
        </g>
      )}
    </svg>
  );
}
