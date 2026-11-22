"use client";

import { useCallback, useEffect, useId, useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import type { Tier } from "@/lib/types";
import "./medallion.css";

/* ---------- helpers ---------- */

/** Regular or star polygon path. */
function poly(n: number, r: number, start: number, cx = 50, cy = 50, inner?: number): string {
  const pts: string[] = [];
  const count = inner ? n * 2 : n;
  for (let i = 0; i < count; i++) {
    const rr = inner && i % 2 ? inner : r;
    const a = ((start + (i * 360) / count) * Math.PI) / 180;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
}

/** Scale about the medallion centre. */
const T = (k: number, cy: number) => `translate(50 ${cy}) scale(${k}) translate(-50 ${-cy})`;
const MIRROR = "translate(100 0) scale(-1 1)";

/** Left wing as fanned feather leaves; mirror for the right side. */
function Wing({ root, n, len, a0, step, fill, back, stroke, sw }: {
  root: [number, number]; n: number; len: number; a0: number; step: number;
  fill: string; back: string; stroke: string; sw: number;
}) {
  const row = (scale: number, shift: number, f: string, key: string) =>
    Array.from({ length: n }, (_, i) => {
      const L = len * scale * (1 - i * 0.1);
      const w = L * 0.19;
      const d = `M0 0 C${w} ${-L * 0.25} ${w} ${-L * 0.8} 0 ${-L} C${-w} ${-L * 0.8} ${-w} ${-L * 0.25} 0 0 Z`;
      return <path key={key + i} d={d} fill={f} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" transform={`translate(${root[0]} ${root[1]}) rotate(${a0 + i * step + shift})`} />;
    });
  return <g>{row(1.08, 9, back, "b")}{row(1, 0, fill, "f")}</g>;
}

interface Ctx {
  p: string[]; // 5 metal stops, light to dark
  e: string; // emblem metal gradient url
  a: string; // accent gradient url
  d: boolean; // fine detail allowed
  m: number; // stroke multiplier for tiny sizes
  field: string; // clip url for the recessed field
  lg: string;
  sp: string;
}

interface Design {
  name: string;
  p: string[];
  accent: [string, string, string];
  shape: string;
  cy?: number;
  glow?: string;
  trim?: boolean;
  curls?: number;
  wings?: (c: Ctx) => ReactNode;
  rim?: (c: Ctx) => ReactNode;
  fieldArt?: (c: Ctx) => ReactNode;
  emblem: (c: Ctx) => ReactNode;
}

const GOLD = ["#FFF6B0", "#FFE24A", "#FFD700", "#C79A00", "#8A6500"];

/* ---------- per tier designs ---------- */

const DESIGNS: Design[] = [
  {
    // 1 Wood: Timber Warden
    name: "Timber Warden",
    p: ["#C9965A", "#A06B36", "#8B5A2B", "#5E3A19", "#3A2210"],
    accent: ["#F2C48A", "#CD7F32", "#7A4416"],
    shape: "M50 5 Q68 11 86 14 V50 C86 73 68 88 50 95 C32 88 14 73 14 50 V14 Q32 11 50 5 Z",
    rim: (c) => (
      <g stroke="#0e1013" strokeWidth={0.8 * c.m} strokeLinejoin="round">
        {[false, true].map((mir) => (
          <g key={String(mir)} transform={mir ? MIRROR : undefined}>
            <path d="M14 14 Q22 12.5 31 10.5 V17 L20 19 L19 31 H14 Z" fill="#2b2f36" />
            {c.d && <><circle cx="24" cy="14.5" r="1.3" fill="#8b929c" stroke="none" /><circle cx="17" cy="25" r="1.3" fill="#8b929c" stroke="none" /></>}
          </g>
        ))}
        <path d="M39 86 L50 95 L61 86 L50 80 Z" fill="#2b2f36" />
      </g>
    ),
    fieldArt: (c) => (
      <g fill="none">
        {[8, 14, 20, 26, 32].map((r) => (
          <g key={r}>
            <ellipse cx="51" cy="53" rx={r} ry={r * 1.12} stroke={c.p[1]} strokeWidth={0.5} opacity={0.5} />
            <ellipse cx="50" cy="52" rx={r} ry={r * 1.12} stroke={c.p[4]} strokeWidth={0.9 * c.m} opacity={0.7} />
          </g>
        ))}
      </g>
    ),
    emblem: (c) => (
      <g stroke={c.p[4]} strokeWidth={1 * c.m} strokeLinejoin="round" fill={c.a}>
        <path d="M50 36 V30 Q54 27 58 29" fill="none" strokeLinecap="round" />
        <path d="M36 47 C36 35 64 35 64 47 Z" />
        <path d="M38 47 H62 C62 63 56 73 50 77 C44 73 38 63 38 47 Z" />
        {c.d && <path d="M40 41 L46 47 M46 38 L54 47 M54 38 L60 45" fill="none" stroke={c.p[4]} strokeWidth={0.6} opacity={0.6} />}
      </g>
    ),
  },
  {
    // 2 Bronze: Forge Vanguard
    name: "Forge Vanguard",
    p: ["#F2C48A", "#E09A52", "#CD7F32", "#8F5420", "#5A3213"],
    accent: ["#FFD9A8", "#E58A3A", "#7A3A12"],
    shape: poly(8, 46, -67.5),
    glow: "#FF7A2A",
    rim: (c) => c.d ? (
      <g>
        {Array.from({ length: 8 }, (_, i) => {
          const a = ((-67.5 + i * 45) * Math.PI) / 180;
          const x = 50 + 40 * Math.cos(a);
          const y = 50 + 40 * Math.sin(a);
          return <g key={i}><circle cx={x} cy={y} r="2.6" fill={c.p[4]} /><circle cx={x - 0.4} cy={y - 0.5} r="1.9" fill={c.p[0]} /><circle cx={x - 0.7} cy={y - 0.8} r="0.6" fill="#fff" /></g>;
        })}
      </g>
    ) : null,
    fieldArt: (c) => (
      <g fill="none">
        <path d={poly(8, 46, -67.5)} transform={T(0.84, 50)} stroke="#FF8A3D" strokeWidth={3} opacity={0.28} />
        <path d={poly(8, 46, -67.5)} transform={T(0.84, 50)} stroke="#FFB070" strokeWidth={1} opacity={0.7} />
        {c.d && <circle cx="50" cy="50" r="23" stroke={c.p[3]} strokeWidth={0.5} opacity={0.5} />}
      </g>
    ),
    emblem: (c) => {
      const bar = (rot: number) => (
        <g transform={`rotate(${rot} 50 50)`} stroke={c.p[4]} strokeWidth={0.9 * c.m} strokeLinejoin="round" fill={c.e}>
          <rect x="21" y="48.2" width="58" height="3.6" rx="1.2" />
          <rect x="24" y="37" width="6" height="26" rx="1.6" />
          <rect x="31" y="41" width="4" height="18" rx="1.2" />
          <rect x="70" y="37" width="6" height="26" rx="1.6" />
          <rect x="65" y="41" width="4" height="18" rx="1.2" />
        </g>
      );
      return <g>{bar(-38)}{bar(38)}<circle cx="50" cy="50" r="3" fill={c.a} stroke={c.p[4]} strokeWidth={0.8 * c.m} /></g>;
    },
  },
  {
    // 3 Silver: Steel Sentinel
    name: "Steel Sentinel",
    p: ["#FFFFFF", "#E8EAEE", "#C0C0C0", "#8A8F99", "#D9DCE2"],
    accent: ["#FFFFFF", "#B8C0CC", "#5C6573"],
    shape: "M50 4 L80 17 L74 54 C68 74 58 87 50 96 C42 87 32 74 26 54 L20 17 Z",
    wings: (c) => (
      <g>
        {[false, true].map((mir) => (
          <g key={String(mir)} transform={mir ? MIRROR : undefined}>
            <Wing root={[24, 42]} n={c.d ? 5 : 3} len={c.d ? 26 : 24} a0={-2} step={c.d ? -20 : -32} fill={c.e} back="#8A8F99" stroke="#4b515c" sw={0.8 * c.m} />
          </g>
        ))}
      </g>
    ),
    emblem: (c) => (
      <g stroke="#4b515c" strokeWidth={1 * c.m} strokeLinejoin="round">
        <path d="M33 32 L50 46 L67 32 V41 L50 55 L33 41 Z" fill={c.e} />
        <path d="M33 47 L50 61 L67 47 V56 L50 70 L33 56 Z" fill={c.e} />
        {c.d && <path d="M37 36 L50 47 L63 36 M37 51 L50 62 L63 51" fill="none" stroke="#fff" strokeWidth={0.6} opacity={0.8} />}
      </g>
    ),
  },
  {
    // 4 Gold: Solar Sovereign
    name: "Solar Sovereign",
    p: GOLD,
    accent: ["#FF8A8A", "#E11D48", "#7F0F28"],
    shape: "M50 4 C58 11 72 13 88 11 V46 C88 70 70 88 50 96 C30 88 12 70 12 46 V11 C28 13 42 11 50 4 Z",
    curls: 25,
    fieldArt: (c) => c.d ? (
      <g fill="none" strokeLinecap="round">
        {Array.from({ length: 24 }, (_, i) => {
          const a = ((i * 15) * Math.PI) / 180;
          const r0 = 9;
          const r1 = i % 2 ? 30 : 42;
          const seg = (dx: number, col: string, op: number) => (
            <line key={`${i}${dx}`} x1={50 + dx + r0 * Math.cos(a)} y1={52 + dx + r0 * Math.sin(a)} x2={50 + dx + r1 * Math.cos(a)} y2={52 + dx + r1 * Math.sin(a)} stroke={col} strokeWidth={0.7} opacity={op} />
          );
          return <g key={i}>{seg(0.5, c.p[0], 0.5)}{seg(0, c.p[3], 0.8)}</g>;
        })}
      </g>
    ) : null,
    emblem: (c) => (
      <g stroke={c.p[4]} strokeWidth={1 * c.m} strokeLinejoin="round">
        <path d="M30 64 L26 38 L40 51 L50 32 L60 51 L74 38 L70 64 Z" fill={c.e} />
        <rect x="30" y="64" width="40" height="8" rx="1.6" fill={c.e} />
        <circle cx="26" cy="37" r="3" fill={c.p[0]} />
        <circle cx="50" cy="31" r="3.4" fill={c.p[0]} />
        <circle cx="74" cy="37" r="3" fill={c.p[0]} />
        <circle cx="50" cy="68" r="2.4" fill={c.a} stroke="none" />
        {c.d && <path d="M36 58 L33 46 M64 58 L67 46" fill="none" stroke={c.p[0]} strokeWidth={0.7} opacity={0.8} />}
      </g>
    ),
  },
  {
    // 5 Platinum: Glacier Apex
    name: "Glacier Apex",
    p: ["#E6F8FF", "#9BE0FB", "#38BDF8", "#1B84B8", "#0B4F73"],
    accent: ["#FFFFFF", "#7FD3F7", "#1B84B8"],
    shape: "M50 4 L81 15 L90 46 L74 80 L50 96 L26 80 L10 46 L19 15 Z",
    trim: true,
    fieldArt: (c) => c.d ? (
      <g fill="none" stroke="#BDEBFF" strokeWidth={0.5} opacity={0.6}>
        <path d="M50 52 L20 20 M50 52 L82 26 M50 52 L86 62 M50 52 L28 86 M50 52 L66 88" />
      </g>
    ) : null,
    emblem: (c) => {
      const R = 28;
      const r = 12;
      const pt = (i: number, rad: number) => {
        const a = ((-90 + i * 36) * Math.PI) / 180;
        return [50 + rad * Math.cos(a), 53 + rad * Math.sin(a)] as const;
      };
      return (
        <g stroke="#0B4F73" strokeWidth={0.7 * c.m} strokeLinejoin="round">
          {Array.from({ length: 5 }, (_, k) => {
            const v = pt(k * 2, R);
            const l = pt(k * 2 - 1, r);
            const rr = pt(k * 2 + 1, r);
            return (
              <g key={k}>
                <path d={`M50 53 L${l[0]} ${l[1]} L${v[0]} ${v[1]} Z`} fill="#E6F8FF" />
                <path d={`M50 53 L${v[0]} ${v[1]} L${rr[0]} ${rr[1]} Z`} fill={k % 2 ? "#38BDF8" : "#1B9AD8"} />
              </g>
            );
          })}
          {c.d && <circle cx="50" cy="53" r="3" fill="#fff" stroke="none" opacity={0.85} />}
        </g>
      );
    },
  },
  {
    // 6 Diamond: Prism Paragon
    name: "Prism Paragon",
    p: ["#E0E3FF", "#B3B9FB", "#818CF8", "#4F55C9", "#2A2C80"],
    accent: ["#FFFFFF", "#C7CCFF", "#5058C8"],
    shape: "M50 5 A45 45 0 1 1 50 95 A45 45 0 1 1 50 5 Z",
    emblem: (c) => {
      const half = (rot: number, front: boolean) => (
        <path
          d={front ? "M-35 0 A35 12.5 0 0 0 35 0" : "M-35 0 A35 12.5 0 0 1 35 0"}
          transform={`translate(50 50) rotate(${rot})`}
          fill="none"
          stroke={front ? "#F3F5FF" : "#6068D8"}
          strokeWidth={(front ? 2.4 : 1.8) * c.m}
          strokeLinecap="round"
        />
      );
      return (
        <g>
          {half(52, false)}{half(-52, false)}
          <g stroke="#2A2C80" strokeWidth={0.9 * c.m} strokeLinejoin="round">
            <path d="M38 34 H62 L71 47 H29 Z" fill="#E0E3FF" />
            <path d="M29 47 H71 L50 76 Z" fill={c.e} />
            {c.d && <path d="M38 34 L43 47 L50 34 L57 47 L62 34 M43 47 L50 76 L57 47" fill="none" stroke="#fff" strokeWidth={0.6} opacity={0.8} />}
          </g>
          {half(52, true)}{half(-52, true)}
        </g>
      );
    },
  },
  {
    // 7 Champion: Crimson Warlord
    name: "Crimson Warlord",
    p: ["#FF8CA0", "#F43F5E", "#B3152F", "#5C0C1A", "#1A070C"],
    accent: ["#FF9BAE", "#F43F5E", "#8F1029"],
    shape: "M50 3 L57 14 L70 9 L71 22 L87 22 L83 38 L92 50 L80 62 L77 78 L61 82 L50 96 L39 82 L23 78 L20 62 L8 50 L17 38 L13 22 L29 22 L30 9 L43 14 Z",
    emblem: (c) => (
      <g>
        <g fill={c.lg}>
          {[-1, 1].flatMap((side) =>
            Array.from({ length: c.d ? 7 : 4 }, (_, i) => {
              const phi = ((c.d ? 14 : 22) + i * (c.d ? 21 : 34)) * (Math.PI / 180);
              const x = 50 + side * 31 * Math.sin(phi);
              const y = 52 + 31 * Math.cos(phi);
              const rot = (Math.atan2(-Math.sin(phi), side * Math.cos(phi)) * 180) / Math.PI + side * 18;
              return <ellipse key={`${side}${i}`} cx={x} cy={y} rx={6.6} ry={2.9} transform={`rotate(${rot} ${x} ${y})`} stroke="#8A6500" strokeWidth={0.7 * c.m} />;
            }),
          )}
        </g>
        <g stroke="#1A070C" strokeWidth={0.9 * c.m} strokeLinejoin="round" fill={c.a}>
          <path d="M28 34 C33 50 41 55 50 55 C59 55 67 50 72 34 C65 43 58 46 50 46 C42 46 35 43 28 34 Z" />
          <path d="M50 20 L58 50 L50 80 L42 50 Z" />
        </g>
        {c.d && <path d="M50 28 L53 50 L50 70" fill="none" stroke="#FFC2CC" strokeWidth={0.7} opacity={0.8} />}
      </g>
    ),
  },
  {
    // 8 Titan: Storm Colossus
    name: "Storm Colossus",
    p: ["#7B828E", "#555C68", "#3A3F49", "#262A31", "#15171C"],
    accent: ["#FFE0A0", "#F97316", "#9A2F05"],
    shape: "M30 5 H70 L84 20 V60 L70 94 H30 L16 60 V20 Z",
    wings: (c) => (
      <g>
        {[false, true].map((mir) => (
          <g key={String(mir)} transform={mir ? MIRROR : undefined} stroke="#7A2A05" strokeWidth={0.7 * c.m} strokeLinejoin="round">
            {[[24, -22], [40, 0], [56, 22]].map(([y, rot]) => (
              <path key={y} d="M0 -3.4 L-9 -4.8 L-6.5 -1.4 L-18 0 L-9.5 2 L-12 5 L0 3.4 Z" fill={c.a} transform={`translate(17 ${y}) rotate(${rot}) scale(${c.d ? 1 : 1.25})`} />
            ))}
          </g>
        ))}
      </g>
    ),
    fieldArt: (c) => (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 18 L45 32 L54 42 L46 54 L55 66 L49 82 M46 54 L34 58 L28 70 M54 42 L66 40 L72 30" stroke="#F97316" strokeWidth={4 * c.m} opacity={0.3} />
        <path d="M50 18 L45 32 L54 42 L46 54 L55 66 L49 82 M46 54 L34 58 L28 70 M54 42 L66 40 L72 30" stroke="#FFC46B" strokeWidth={1.2 * c.m} />
      </g>
    ),
    emblem: (c) => (
      <g stroke="#7A2A05" strokeWidth={0.9 * c.m} strokeLinejoin="round">
        <path d="M57 24 L37 55 H49 L43 80 L65 46 H53 Z" fill={c.a} />
        {c.d && <path d="M55 29 L42 52" fill="none" stroke="#FFF1C9" strokeWidth={0.7} opacity={0.8} />}
      </g>
    ),
  },
  {
    // 9 Olympian: Celestial Mythic
    name: "Celestial Mythic",
    p: ["#FFF3B8", "#FDE047", "#EAB308", "#B07D06", "#6B4A02"],
    accent: ["#FFE9A0", "#FB923C", "#B45309"],
    shape: "M50 3 L60 10 H72 L76 18 H88 V50 C88 72 70 88 50 96 C30 88 12 72 12 50 V18 H24 L28 10 H40 Z",
    glow: "#FDE047",
    wings: (c) => (
      <g>
        {[false, true].map((mir) => (
          <g key={String(mir)} transform={mir ? MIRROR : undefined}>
            <Wing root={[15, 44]} n={c.d ? 6 : 4} len={25} a0={4} step={c.d ? -17 : -24} fill={c.e} back={c.a} stroke="#6B4A02" sw={0.7 * c.m} />
          </g>
        ))}
      </g>
    ),
    fieldArt: (c) => (
      <g>
        <circle cx="50" cy="50" r="34" fill={c.sp} opacity={0.5} />
        {c.d && [[28, 30], [72, 30], [24, 56], [76, 56], [34, 78], [66, 78]].map(([x, y]) => (
          <path key={`${x}${y}`} d={`M${x} ${y - 3} L${x + 0.8} ${y - 0.8} L${x + 3} ${y} L${x + 0.8} ${y + 0.8} L${x} ${y + 3} L${x - 0.8} ${y + 0.8} L${x - 3} ${y} L${x - 0.8} ${y - 0.8} Z`} fill="#FFF8D6" opacity={0.9} />
        ))}
      </g>
    ),
    emblem: (c) => (
      <g stroke="#6B4A02" strokeWidth={0.9 * c.m} strokeLinejoin="round" fill={c.e}>
        <ellipse cx="50" cy="25" rx="12" ry="3.6" fill="none" stroke="#FFF3B8" strokeWidth={1.8 * c.m} />
        <path d="M29 47 L50 31 L71 47 Z" />
        <rect x="31" y="47" width="38" height="4" />
        {[34, 44, 54, 64].map((x) => <rect key={x} x={x - 2.5} y="51" width="5" height="16" rx="0.8" />)}
        <rect x="28" y="67" width="44" height="3.4" />
        <rect x="25" y="70.4" width="50" height="3.4" />
        {c.d && <path d="M50 36 L51.2 39 L54 40 L51.2 41 L50 44 L48.8 41 L46 40 L48.8 39 Z" fill="#fff" stroke="none" />}
      </g>
    ),
  },
];

/* ---------- component ---------- */

const CURL = "M47 0 C40 -2 33 1 31 7 C30 11 34 13 36 10 C37 8 35 6 33.5 7";
const clamp = (v: number) => Math.max(-1, Math.min(1, v));

export function RankBadge({ tier, size = 48, className, title }: { tier: Tier; size?: number; className?: string; title?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const root = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);
  const pt = useRef({ x: 0, y: 0 });

  const live = size >= 28;
  const simple = size <= 24;
  const des = DESIGNS[Math.min(Math.max(tier.index, 0), DESIGNS.length - 1)];
  const { p } = des;
  const cy = des.cy ?? 50;
  const label = title ?? `${tier.name} rank badge`;
  const glow = des.glow ?? tier.color;
  const ctx: Ctx = { p, e: `url(#e${uid})`, a: `url(#a${uid})`, d: !simple, m: simple ? 1.8 : 1, field: `url(#fc${uid})`, lg: `url(#lg${uid})`, sp: `url(#sp${uid})` };

  const apply = useCallback(() => {
    raf.current = 0;
    const el = root.current;
    if (!el) return;
    const { x, y } = pt.current;
    const s = el.style;
    s.setProperty("--ry", `${(x * 18).toFixed(2)}deg`);
    s.setProperty("--rx", `${(-y * 18).toFixed(2)}deg`);
    s.setProperty("--nx", x.toFixed(3));
    s.setProperty("--ny", y.toFixed(3));
    s.setProperty("--mx", (x * 30).toFixed(1));
    s.setProperty("--my", (y * 30).toFixed(1));
    s.setProperty("--ang", `${(25 + x * 35).toFixed(1)}deg`);
    s.setProperty("--hov", "1");
  }, []);

  const onMove = (e: PointerEvent<HTMLSpanElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !r.height) return;
    pt.current = { x: clamp(((e.clientX - r.left) / r.width) * 2 - 1), y: clamp(((e.clientY - r.top) / r.height) * 2 - 1) };
    e.currentTarget.dataset.hover = "1";
    if (!raf.current) raf.current = requestAnimationFrame(apply);
  };
  const onLeave = (e: PointerEvent<HTMLSpanElement>) => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
    const el = e.currentTarget;
    delete el.dataset.hover;
    for (const k of ["--rx", "--ry", "--nx", "--ny", "--mx", "--my", "--ang", "--hov"]) el.style.removeProperty(k);
  };
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  let h = 0;
  for (const ch of uid) h = (h * 31 + ch.charCodeAt(0)) % 5000;

  const wrapStyle = {
    width: size,
    height: size,
    filter: `drop-shadow(0 0 ${simple ? 1.5 : Math.max(3, size * 0.06)}px ${glow}${des.glow ? "CC" : "99"})`,
    "--par": `${(size * 0.025).toFixed(2)}px`,
    "--z": `${(size * 0.1).toFixed(2)}px`,
    "--dl": `-${h}ms`,
  } as CSSProperties;

  const m = ctx.m;
  const fieldD = des.shape;
  const sw = (n: number) => n * m;
  const ring = (k: number, w: number, extra: Record<string, string | number>, col: string, op = 1, off = 0) => (
    <path d={fieldD} fill="none" stroke={col} strokeWidth={w / k} opacity={op} strokeLinecap="round" transform={`${off ? "translate(0.5 0.5) " : ""}${T(k, cy)}`} {...extra} />
  );

  const base = (
    <svg className="rbm-layer" viewBox="0 0 100 100" aria-hidden focusable="false">
      <title>{label}</title>
      <defs>
        <linearGradient id={`f${uid}`} x1="0" y1="0" x2="0.8" y2="1">
          {p.map((c, i) => <stop key={i} offset={i / 4} stopColor={c} />)}
        </linearGradient>
        <linearGradient id={`e${uid}`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={p[0]} /><stop offset="0.35" stopColor={p[1]} /><stop offset="0.7" stopColor={p[2]} /><stop offset="1" stopColor={p[3]} />
        </linearGradient>
        <linearGradient id={`a${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={des.accent[0]} /><stop offset="0.5" stopColor={des.accent[1]} /><stop offset="1" stopColor={des.accent[2]} />
        </linearGradient>
        <linearGradient id={`b${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" /><stop offset="0.5" stopColor="#fff" stopOpacity="0" /><stop offset="0.55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id={`i${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p[4]} /><stop offset="1" stopColor={p[3]} />
        </linearGradient>
        <radialGradient id={`r${uid}`} cx="0.3" cy="0.2" r="0.85">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.08" /><stop offset="1" stopColor="#000" stopOpacity="0.2" />
        </radialGradient>
        <radialGradient id={`sp${uid}`}>
          <stop offset="0" stopColor={p[0]} stopOpacity="0.6" /><stop offset="1" stopColor={p[0]} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`lg${uid}`} x1="0" y1="0" x2="0.5" y2="1">
          {GOLD.map((c, i) => <stop key={i} offset={i / 4} stopColor={c} />)}
        </linearGradient>
        <linearGradient id={`t${uid}`} x1="0" y1="0" x2="1" y2="1">
          {["#FFFFFF", "#9AA3AD", "#F4F7FA", "#6B7480", "#E8ECF0"].map((c, i) => <stop key={i} offset={i / 4} stopColor={c} />)}
        </linearGradient>
        <clipPath id={`fc${uid}`}><path d={fieldD} transform={T(0.83, cy)} /></clipPath>
        {!simple && (
          <filter id={`n${uid}`} x="-10%" y="-10%" width="120%" height="120%">
            <feComponentTransfer in="SourceAlpha" result="inv"><feFuncA type="table" tableValues="1 0" /></feComponentTransfer>
            <feGaussianBlur in="inv" stdDeviation="2.2" result="bl" />
            <feOffset in="bl" dx="0" dy="2.4" result="of" />
            <feFlood floodColor="#000" floodOpacity="0.75" result="fl" />
            <feComposite in="fl" in2="of" operator="in" result="sh" />
            <feComposite in="sh" in2="SourceAlpha" operator="in" result="cl" />
            <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="cl" /></feMerge>
          </filter>
        )}
      </defs>
      {tier.index === 8 && (
        <g className="rbm-halo" opacity={0.75}>
          {Array.from({ length: 16 }, (_, i) => (
            <path key={i} d="M50 50 L47.2 -12 L52.8 -12 Z" fill={p[1]} opacity={i % 2 ? 0.4 : 0.8} transform={`rotate(${i * 22.5} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="50" fill="none" stroke={p[0]} strokeWidth={0.8} opacity={0.6} />
        </g>
      )}
      {des.wings?.({ ...ctx, e: `url(#e${uid})`, a: `url(#a${uid})` })}
      {/* extrusion: side wall slices */}
      <path d={fieldD} fill={p[4]} transform="translate(0 3.2)" />
      <path d={fieldD} fill={p[3]} stroke={p[4]} strokeWidth={0.6} transform="translate(0 1.6)" />
      {/* face */}
      <path d={fieldD} fill={`url(#f${uid})`} stroke={p[4]} strokeWidth={sw(0.8)} strokeLinejoin="round" />
      <path d={fieldD} fill={`url(#r${uid})`} />
      {des.trim && ring(0.975, sw(2.4), { stroke: `url(#t${uid})` }, `url(#t${uid})`)}
      {ctx.d && (
        <g>
          {ring(0.945, 1.1, { strokeDasharray: `0.01 ${2.5 / 0.945}` }, p[0], 0.7, 1)}
          {ring(0.945, 1.1, { strokeDasharray: `0.01 ${2.5 / 0.945}` }, p[4], 0.75)}
          {ring(0.905, 0.6, { strokeDasharray: `${5 / 0.905} ${1.6 / 0.905} 0.01 ${1.6 / 0.905}` }, p[0], 0.6, 1)}
          {ring(0.905, 0.6, { strokeDasharray: `${5 / 0.905} ${1.6 / 0.905} 0.01 ${1.6 / 0.905}` }, p[4], 0.65)}
          {des.curls !== undefined && [false, true].map((mir) => (
            <g key={String(mir)} transform={mir ? MIRROR : undefined} fill="none" strokeLinecap="round">
              <path d={CURL} transform={`translate(0.5 ${des.curls! + 0.5})`} stroke={p[0]} strokeWidth={0.7} opacity={0.6} />
              <path d={CURL} transform={`translate(0 ${des.curls})`} stroke={p[4]} strokeWidth={0.7} opacity={0.85} />
            </g>
          ))}
        </g>
      )}
      {des.rim?.(ctx)}
      {/* bevel: light top, dark bottom */}
      <path d={fieldD} fill="none" stroke={`url(#b${uid})`} strokeWidth={sw(1.5) / 0.875} strokeLinejoin="round" transform={T(0.875, cy)} />
      {/* recessed field with inset shadow */}
      <g filter={simple ? undefined : `url(#n${uid})`}>
        <path d={fieldD} fill={`url(#i${uid})`} transform={T(0.83, cy)} />
        <g clipPath={ctx.field}>{des.fieldArt?.(ctx)}</g>
      </g>
    </svg>
  );

  const top = (
    <svg className="rbm-layer rbm-top" viewBox="0 0 100 100" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`sw${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.55" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`sc${uid}`}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`fa${uid}`}><path d={fieldD} /></clipPath>
        {!simple && (
          <filter id={`d${uid}`} x="-10%" y="-10%" width="120%" height="125%">
            <feDropShadow dx="0.6" dy="1.4" stdDeviation="0.7" floodColor="#000" floodOpacity="0.55" />
          </filter>
        )}
      </defs>
      <g filter={simple ? undefined : `url(#d${uid})`}>{des.emblem(ctx)}</g>
      {live && (
        <g clipPath={`url(#fa${uid})`} pointerEvents="none">
          <g className="rbm-aim">
            <g className="rbm-sweep"><rect x="-6" y="-40" width="22" height="180" fill={`url(#sw${uid})`} transform="rotate(0)" /></g>
          </g>
          <circle className="rbm-spec" cx="50" cy="50" r="30" fill={`url(#sc${uid})`} />
        </g>
      )}
    </svg>
  );

  return (
    <span
      ref={root}
      role="img"
      aria-label={label}
      className={className ? `rbm ${className}` : "rbm"}
      data-live={live ? "1" : undefined}
      style={wrapStyle}
      onPointerMove={live ? onMove : undefined}
      onPointerLeave={live ? onLeave : undefined}
    >
      <span className="rbm-tilt">{base}{top}</span>
    </span>
  );
}

export default RankBadge;
