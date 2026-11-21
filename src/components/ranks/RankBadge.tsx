"use client";

import { useId, type ReactNode } from "react";
import type { Tier } from "@/lib/types";

/** Blend a hex color toward white (t > 0) or black (t < 0). */
function shade(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const to = t < 0 ? 0 : 255;
  const k = Math.abs(t);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (to - v) * k));
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const SHIELD = "M50 6 L88 18 V50 C88 72 70 88 50 95 C30 88 12 72 12 50 V18 Z";
const WING = "M85 46 C97 42 101 28 99 14 C94 21 91 22 85 23 C91 26 89 29 83 31 C89 34 87 38 81 40 C86 41 86 44 85 46 Z";
const WING_LINES = "M84 24 C90 26 95 22 98 16 M82 31 C89 33 94 29 98 22 M80 39 C87 40 93 36 97 29";

const KEYFRAMES = `@keyframes rb-spin{to{transform:rotate(360deg)}}
.rb-halo{transform-origin:50px 50px;animation:rb-spin 14s linear infinite}
@media (prefers-reduced-motion:reduce){.rb-halo{animation:none}}`;

function Wings({ fill, stroke, scale = 1 }: { fill: string; stroke: string; scale?: number }) {
  const place = scale === 1 ? "" : `translate(50 46) scale(${scale}) translate(-50 -46)`;
  return (
    <g transform={place}>
      {[false, true].map((m) => (
        <g key={String(m)} transform={m ? "translate(100 0) scale(-1 1)" : undefined}>
          <path d={WING} fill={fill} stroke={stroke} strokeWidth={1} strokeLinejoin="round" />
          <path d={WING_LINES} fill="none" stroke={stroke} strokeWidth={0.8} strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

export function RankBadge({ tier, size = 48, className, title }: { tier: Tier; size?: number; className?: string; title?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const c = tier.color;
  const hi = shade(c, 0.55);
  const lo = shade(c, -0.5);
  const deep = shade(c, -0.72);
  const g = `g${uid}`;
  const gi = `gi${uid}`;
  const f = `f${uid}`;
  const cl = `c${uid}`;
  const metal = `url(#${g})`;
  const emblem = `url(#${gi})`;
  const label = title ?? `${tier.name} rank badge`;

  let body: ReactNode;
  switch (tier.index) {
    case 0: // Wood: grain lines
      body = (
        <g fill="none" stroke={lo} strokeLinecap="round">
          <g clipPath={`url(#${cl})`} strokeWidth={1.2} opacity={0.75}>
            <path d="M10 28 C35 24 60 34 90 28" /><path d="M10 40 C35 36 60 46 90 40" /><path d="M10 64 C35 60 60 70 90 64" /><path d="M10 78 C35 74 60 84 90 78" />
          </g>
          <ellipse cx="50" cy="52" rx="13" ry="9" strokeWidth={2} />
          <ellipse cx="50" cy="52" rx="7" ry="4.5" strokeWidth={1.6} />
          <circle cx="50" cy="52" r="1.6" fill={lo} />
        </g>
      );
      break;
    case 1: // Bronze: rivets around rim + chevron
      body = (
        <g>
          {[[50, 12], [78, 22], [82, 46], [74, 68], [50, 87], [26, 68], [18, 46], [22, 22]].map(([x, y]) => (
            <g key={`${x}-${y}`}><circle cx={x} cy={y} r={3} fill={deep} /><circle cx={x - 0.6} cy={y - 0.6} r={2.1} fill={hi} /></g>
          ))}
          <path d="M32 44 L50 30 L68 44 V54 L50 42 L32 54 Z M32 62 L50 48 L68 62 V72 L50 60 L32 72 Z" fill={emblem} stroke={deep} strokeWidth={1.2} strokeLinejoin="round" />
        </g>
      );
      break;
    case 2: // Silver: wings handled below; center blade
      body = <path d="M50 26 L58 50 L50 74 L42 50 Z M36 46 H64 V52 H36 Z" fill={emblem} stroke={deep} strokeWidth={1.2} strokeLinejoin="round" />;
      break;
    case 3: // Gold: crown
      body = (
        <g stroke={deep} strokeWidth={1.2} strokeLinejoin="round">
          <path d="M30 64 L27 36 L40 50 L50 31 L60 50 L73 36 L70 64 Z" fill={emblem} />
          <rect x="30" y="64" width="40" height="7" rx="1.5" fill={emblem} />
          <circle cx="27" cy="35" r="2.6" fill={hi} /><circle cx="50" cy="30" r="2.8" fill={hi} /><circle cx="73" cy="35" r="2.6" fill={hi} />
          <circle cx="50" cy="56" r="3" fill="#ef4444" stroke="none" />
        </g>
      );
      break;
    case 4: { // Platinum: faceted star
      const pts = Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 ? 11 : 27;
        const a = (-90 + i * 36) * (Math.PI / 180);
        return [50 + r * Math.cos(a), 53 + r * Math.sin(a)] as const;
      });
      body = (
        <g stroke={deep} strokeWidth={1} strokeLinejoin="round">
          <polygon points={pts.map((p) => p.join(",")).join(" ")} fill={emblem} />
          {pts.map((p, i) => i % 2 === 0 && <line key={i} x1="50" y1="53" x2={p[0]} y2={p[1]} />)}
          {pts.map((p, i) => i % 2 === 1 && <line key={i} x1="50" y1="53" x2={p[0]} y2={p[1]} opacity={0.6} />)}
        </g>
      );
      break;
    }
    case 5: // Diamond gem
      body = (
        <g stroke={deep} strokeWidth={1} strokeLinejoin="round">
          <path d="M34 38 H66 L76 50 L50 78 L24 50 Z" fill={emblem} />
          <path d="M24 50 H76 M34 38 L42 50 L50 38 L58 50 L66 38 M42 50 L50 78 L58 50" fill="none" />
          <path d="M34 38 L42 50 L50 38 Z" fill={hi} opacity={0.7} stroke="none" />
        </g>
      );
      break;
    case 6: { // Champion: laurel wreath around flame
      const leaves = [-1, 1].flatMap((side) =>
        Array.from({ length: 6 }, (_, i) => {
          const phi = (25 + i * 24) * (Math.PI / 180);
          const x = 50 + side * 25 * Math.sin(phi);
          const y = 55 + 25 * Math.cos(phi);
          const rot = (Math.atan2(-Math.sin(phi), side * Math.cos(phi)) * 180) / Math.PI;
          return <ellipse key={`${side}${i}`} cx={x} cy={y} rx={6} ry={2.8} transform={`rotate(${rot} ${x} ${y})`} fill={emblem} stroke={deep} strokeWidth={0.8} />;
        }),
      );
      body = (
        <g>
          {leaves}
          <path d="M50 30 C58 42 63 48 58 60 C56 67 44 67 42 60 C39 52 46 48 47 41 C49 44 50 46 52 47 C53 42 50 38 50 30 Z" fill={emblem} stroke={deep} strokeWidth={1.2} strokeLinejoin="round" />
          <path d="M50 52 C54 56 55 60 52 63 C49 65 46 62 47 59 C48 57 50 56 50 52 Z" fill={hi} />
        </g>
      );
      break;
    }
    case 7: // Titan: thunderbolt
      body = (
        <g>
          <circle cx="50" cy="52" r="26" fill="none" stroke={deep} strokeWidth={1.5} strokeDasharray="3 3" />
          <path d="M57 24 L36 55 H48 L41 80 L66 46 H53 Z" fill={emblem} stroke={deep} strokeWidth={1.3} strokeLinejoin="round" />
        </g>
      );
      break;
    default: // Olympian: radiant halo, winged crown
      body = (
        <g stroke={deep} strokeWidth={1.1} strokeLinejoin="round">
          <path d="M34 62 L31 40 L42 51 L50 35 L58 51 L69 40 L66 62 Z" fill={emblem} />
          <rect x="34" y="62" width="32" height="6" rx="1.5" fill={emblem} />
          <circle cx="50" cy="34" r="2.6" fill={hi} />
          <path d="M50 46 L53 52 L50 58 L47 52 Z" fill="#fff" stroke="none" />
        </g>
      );
  }

  const winged = tier.index === 2 || tier.index === 8;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={{ overflow: "visible", flexShrink: 0 }}
    >
      <title>{label}</title>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={hi} /><stop offset="0.45" stopColor={c} /><stop offset="1" stopColor={lo} />
        </linearGradient>
        <linearGradient id={gi} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(c, 0.7)} /><stop offset="0.5" stopColor={hi} /><stop offset="1" stopColor={c} />
        </linearGradient>
        <filter id={f} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={c} floodOpacity="0.75" />
        </filter>
        <clipPath id={cl}><path d={SHIELD} /></clipPath>
      </defs>
      {tier.index === 8 && (
        <g>
          <style>{KEYFRAMES}</style>
          <g className="rb-halo" opacity={0.85}>
            {Array.from({ length: 16 }, (_, i) => (
              <path key={i} d="M50 50 L47.5 -10 L52.5 -10 Z" fill={hi} opacity={i % 2 ? 0.45 : 0.8} transform={`rotate(${i * 22.5} 50 50)`} />
            ))}
          </g>
          <circle cx="50" cy="50" r="48" fill="none" stroke={hi} strokeWidth={1} opacity={0.6} />
        </g>
      )}
      <g filter={`url(#${f})`}>
        {winged && <Wings fill={metal} stroke={deep} scale={tier.index === 8 ? 1 : 0.95} />}
        <path d={SHIELD} fill={metal} stroke={deep} strokeWidth={1.5} strokeLinejoin="round" />
        <g transform="translate(50 50) scale(0.84) translate(-50 -50)">
          <path d={SHIELD} fill={deep} fillOpacity={0.55} stroke={hi} strokeWidth={1.6} strokeLinejoin="round" />
        </g>
        <path d="M50 8 L86 19 V50 C86 70 69 85 50 92" fill="none" stroke={hi} strokeWidth={0.8} opacity={0.6} />
        {body}
      </g>
    </svg>
  );
}

export default RankBadge;
