"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Key, Link2 } from "lucide-react";
import {
  DEMO_DDL,
  SQL_TOKEN_CLASS,
  tokenizeSql,
} from "@/lib/landing/highlight-sql";

type Stage = "grid" | "zoom" | "type" | "settle" | "erd";

/** One full cycle ≈ 14.7s. Durations are how long each stage is held. */
const SEQUENCE: { stage: Stage; duration: number }[] = [
  { stage: "grid", duration: 2000 },
  { stage: "zoom", duration: 1400 },
  { stage: "type", duration: 5200 },
  { stage: "settle", duration: 1900 },
  { stage: "erd", duration: 4200 },
];

const GRID_STAGE: Record<Stage, string> = {
  grid: "scale-100 opacity-60",
  zoom: "scale-[1.8] opacity-30",
  type: "scale-[2.1] opacity-20",
  settle: "scale-125 opacity-30",
  erd: "scale-110 opacity-45",
};

const SQL_STAGE: Record<Stage, string> = {
  grid: "opacity-0 scale-75 translate-y-6",
  zoom: "opacity-100 scale-100 translate-y-0",
  type: "opacity-100 scale-100 translate-y-0",
  settle: "opacity-0 scale-90 -translate-y-3 blur-sm",
  erd: "opacity-0 scale-90",
};

const ERD_STAGE: Record<Stage, string> = {
  grid: "opacity-0",
  zoom: "opacity-0",
  type: "opacity-100",
  settle: "opacity-100",
  erd: "opacity-100",
};

interface MiniColumn {
  name: string;
  type: string;
  pk?: boolean;
  fk?: boolean;
}

interface CardDef {
  name: string;
  columns: MiniColumn[];
  left: number;
  top: number;
  /** Transform applied while still "scattered" during the build. */
  scatter: string;
  /** typeProgress (0–1) at which this table pops into existence. */
  appearAt: number;
  floatDur: string;
  floatDelay: string;
}

const CARDS: CardDef[] = [
  {
    name: "users",
    left: 20,
    top: 70,
    scatter: "translate(70px, 60px) rotate(-5deg) scale(0.9)",
    appearAt: 0.16,
    floatDur: "7s",
    floatDelay: "0s",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "email", type: "text" },
      { name: "full_name", type: "text" },
      { name: "created_at", type: "timestamptz" },
    ],
  },
  {
    name: "posts",
    left: 400,
    top: 40,
    scatter: "translate(-60px, 70px) rotate(5deg) scale(0.9)",
    appearAt: 0.5,
    floatDur: "8s",
    floatDelay: "1s",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "author_id", type: "uuid", fk: true },
      { name: "title", type: "text" },
      { name: "published", type: "boolean" },
    ],
  },
  {
    name: "comments",
    left: 220,
    top: 300,
    scatter: "translate(40px, -70px) rotate(-4deg) scale(0.9)",
    appearAt: 0.82,
    floatDur: "7.5s",
    floatDelay: "0.5s",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "post_id", type: "uuid", fk: true },
      { name: "author_id", type: "uuid", fk: true },
      { name: "body", type: "text" },
    ],
  },
];

interface EdgeDef {
  d: string;
  highlight?: boolean;
  delay: number;
}

const EDGES: EdgeDef[] = [
  // posts.author_id -> users.id
  { d: "M 400 150 C 330 150, 300 150, 230 135", highlight: true, delay: 0 },
  // comments.post_id -> posts.id
  { d: "M 430 300 C 470 280, 500 250, 500 215", delay: 250 },
  // comments.author_id -> users.id
  { d: "M 230 320 C 150 320, 120 280, 120 235", delay: 450 },
];

export function HeroAnimation() {
  const [index, setIndex] = useState(0);
  const [loopKey, setLoopKey] = useState(0);
  const [typeProgress, setTypeProgress] = useState(0);
  const [active, setActive] = useState(true);
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Honour the user's reduced-motion preference: settle on the final ERD.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Pause the loop when the tab is hidden or the hero is scrolled off-screen.
  useEffect(() => {
    const el = rootRef.current;
    const sync = (inView: boolean) =>
      setActive(inView && document.visibilityState === "visible");

    const onVisibility = () => sync(true);
    document.addEventListener("visibilitychange", onVisibility);

    let observer: IntersectionObserver | null = null;
    if (el && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => sync(entry.isIntersecting),
        { threshold: 0.08 },
      );
      observer.observe(el);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      observer?.disconnect();
    };
  }, []);

  // Advance through the sequence; pausing simply stops scheduling the next step.
  useEffect(() => {
    if (reduced || !active) return;
    const timer = setTimeout(() => {
      const next = (index + 1) % SEQUENCE.length;
      // Looping back to the grid: restart the draw/pulse and clear typed code.
      if (next === 0) {
        setLoopKey((key) => key + 1);
        setTypeProgress(0);
      }
      setIndex(next);
    }, SEQUENCE[index].duration);
    return () => clearTimeout(timer);
  }, [index, active, reduced]);

  const stage: Stage = reduced ? "erd" : SEQUENCE[index].stage;

  // Drive the typewriter while in the "type" stage (reset to 0 happens on loop).
  useEffect(() => {
    if (stage !== "type" || reduced || !active) return;
    let raf = 0;
    const start = performance.now();
    const duration = SEQUENCE[index].duration;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setTypeProgress(progress);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage, index, active, reduced]);

  // Cursor-reactive parallax: publish pointer position as CSS vars (no re-render).
  useEffect(() => {
    if (reduced) return;
    const el = rootRef.current;
    if (!el) return;
    let raf = 0;
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const py = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--px", px.toFixed(3));
        el.style.setProperty("--py", py.toFixed(3));
      });
    };
    const onLeave = () => {
      el.style.setProperty("--px", "0");
      el.style.setProperty("--py", "0");
    };
    window.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const settled = stage === "settle" || stage === "erd";

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 overflow-hidden"
      style={{ "--px": 0, "--py": 0 } as CSSProperties}
    >
      {/* Base — solid black, always present, never transformed. */}
      <div className="absolute inset-0 bg-black" />

      {/* Faint ambient glows for depth, drifting with the cursor. */}
      <div
        className="hero-animated absolute -left-32 top-1/4 h-[28rem] w-[28rem] rounded-full bg-sky-500/10 blur-[130px] animate-[glow-pulse_9s_ease-in-out_infinite] transition-transform duration-500 ease-out"
        style={{ transform: "translate3d(calc(var(--px) * 30px), calc(var(--py) * 30px), 0)" }}
      />
      <div
        className="hero-animated absolute -right-24 bottom-0 h-[26rem] w-[26rem] rounded-full bg-zinc-400/10 blur-[130px] animate-[glow-pulse_11s_ease-in-out_infinite] transition-transform duration-500 ease-out"
        style={{ transform: "translate3d(calc(var(--px) * -30px), calc(var(--py) * -30px), 0)" }}
      />

      {/* Blueprint grid: parallax wrapper + scaling inner (fakes camera zoom). */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{ transform: "translate3d(calc(var(--px) * -20px), calc(var(--py) * -20px), 0)" }}
      >
        <div
          className={`hero-animated absolute inset-0 origin-center transition-all duration-[1200ms] ease-in-out animate-[grid-pan_18s_linear_infinite] ${GRID_STAGE[stage]}`}
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Radial fade so the grid melts into the edges. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      {/* SQL editor panel (typewriter), nudged right of centre. */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-[1100ms] ease-in-out md:pl-[18%] lg:pl-[26%] ${SQL_STAGE[stage]}`}
      >
        <SqlPanel
          typed={DEMO_DDL.slice(0, Math.floor(typeProgress * DEMO_DDL.length))}
          showCaret={stage === "type" || stage === "zoom"}
        />
      </div>

      {/* The resulting ER diagram (nudged right of centre). */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-[900ms] ease-in-out md:pl-[18%] lg:pl-[26%] ${ERD_STAGE[stage]}`}
        style={{ perspective: 1000 }}
      >
        <DemoErd
          loopKey={loopKey}
          stage={stage}
          settled={settled}
          typeProgress={typeProgress}
          reduced={reduced}
        />
      </div>
    </div>
  );
}

function SqlPanel({ typed, showCaret }: { typed: string; showCaret: boolean }) {
  const tokens = tokenizeSql(typed);

  return (
    <div className="w-[440px] max-w-[88vw] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/85 shadow-2xl shadow-black/60 backdrop-blur-sm">
      {/* Window chrome. */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-black/60 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-red-400/80" />
        <span className="h-3 w-3 rounded-full bg-amber-400/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
        <span className="ml-2 font-mono text-[11px] text-zinc-400">schema.sql</span>
      </div>

      {/* Code is typed out character by character. */}
      <div className="h-[260px] overflow-hidden">
        <pre className="px-5 py-3 font-mono text-[11px] leading-5 sm:text-xs">
          {tokens.map((token, i) => (
            <span key={i} className={SQL_TOKEN_CLASS[token.kind]}>
              {token.value}
            </span>
          ))}
          {showCaret && (
            <span className="hero-animated ml-px inline-block h-[1em] w-[2px] -translate-y-[1px] bg-sky-300 align-middle animate-[caret-blink_1s_step-end_infinite]" />
          )}
        </pre>
      </div>
    </div>
  );
}

function MiniCard({
  card,
  revealed,
  settled,
}: {
  card: CardDef;
  revealed: boolean;
  settled: boolean;
}) {
  return (
    <div className="absolute" style={{ left: card.left, top: card.top }}>
      {/* Settle layer: glides from scattered position into place. */}
      <div
        className="transition-all duration-[1200ms] ease-out"
        style={{
          opacity: revealed ? 1 : 0,
          transform: settled ? "none" : card.scatter,
        }}
      >
        {/* Float layer: gentle idle bob (independent transform). */}
        <div
          className="hero-animated w-[200px] overflow-hidden rounded-xl border border-zinc-300/80 bg-white shadow-xl shadow-black/30 animate-[float-y_var(--fd)_ease-in-out_infinite]"
          style={
            {
              "--fd": card.floatDur,
              animationDelay: card.floatDelay,
            } as CSSProperties
          }
        >
          <div className="border-b border-zinc-200 bg-gradient-to-r from-zinc-100 to-zinc-50 px-3 py-2">
            <p className="truncate text-sm font-semibold tracking-tight text-zinc-900">
              {card.name}
            </p>
          </div>
          <ul className="divide-y divide-zinc-100">
            {card.columns.map((column, i) => (
              <li
                key={column.name}
                className={`flex items-center justify-between gap-2 px-3 py-1.5 text-xs transition-all duration-500 ${
                  revealed ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                } ${
                  column.pk
                    ? "bg-amber-50/80"
                    : column.fk
                      ? "bg-sky-50/80"
                      : "bg-white"
                }`}
                style={{ transitionDelay: revealed ? `${i * 80}ms` : "0ms" }}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-800">{column.name}</p>
                  <p className="truncate font-mono text-[10px] leading-tight text-zinc-500">
                    {column.type}
                  </p>
                </div>
                {column.pk && <Key className="h-3 w-3 shrink-0 text-amber-600" />}
                {column.fk && <Link2 className="h-3 w-3 shrink-0 text-sky-600" />}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function DemoErd({
  loopKey,
  stage,
  settled,
  typeProgress,
  reduced,
}: {
  loopKey: number;
  stage: Stage;
  settled: boolean;
  typeProgress: number;
  reduced: boolean;
}) {
  const cardRevealed = (card: CardDef) =>
    settled || (stage === "type" && typeProgress >= card.appearAt);

  return (
    <div
      className="relative transition-transform duration-300 ease-out"
      style={{
        transform:
          "rotateX(calc(var(--py) * -5deg)) rotateY(calc(var(--px) * 7deg)) translate3d(calc(var(--px) * 12px), calc(var(--py) * 12px), 0)",
      }}
    >
      <div className="relative scale-[0.52] sm:scale-[0.68] md:scale-90 lg:scale-100">
        {/* Fixed 640×440 stage; cards positioned absolutely within. */}
        <div className="relative h-[440px] w-[640px]">
          <svg
            key={loopKey}
            className="absolute inset-0 h-full w-full overflow-visible"
            viewBox="0 0 640 440"
          >
            <defs>
              <marker
                id="arrow-gray"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
              </marker>
              <marker
                id="arrow-sky"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="#0ea5e9" />
              </marker>
            </defs>

            {/* Edges draw themselves in once the layout settles. */}
            <g
              className="transition-opacity duration-700"
              style={{ opacity: settled ? 1 : 0 }}
            >
              {EDGES.map((edge, i) => (
                <path
                  key={i}
                  id={`hero-edge-${i}`}
                  d={edge.d}
                  fill="none"
                  stroke={edge.highlight ? "#0ea5e9" : "#94a3b8"}
                  strokeWidth={edge.highlight ? 2 : 1.5}
                  markerEnd={edge.highlight ? "url(#arrow-sky)" : "url(#arrow-gray)"}
                  style={
                    settled
                      ? ({
                          strokeDasharray: 700,
                          strokeDashoffset: 700,
                          ["--edge-length"]: 700,
                          animation: `edge-draw 1.1s ease-out ${edge.delay}ms forwards`,
                        } as CSSProperties)
                      : undefined
                  }
                />
              ))}
            </g>

            {/* Relationship pulses travel each edge once settled. */}
            {stage === "erd" && !reduced && (
              <g>
                {EDGES.map((edge, i) => (
                  <circle key={i} r={3.5} fill={edge.highlight ? "#38bdf8" : "#cbd5e1"}>
                    <animateMotion
                      dur="2.4s"
                      begin={`${1 + i * 0.4}s`}
                      repeatCount="indefinite"
                    >
                      <mpath href={`#hero-edge-${i}`} />
                    </animateMotion>
                  </circle>
                ))}
              </g>
            )}
          </svg>

          {CARDS.map((card) => (
            <MiniCard
              key={card.name}
              card={card}
              revealed={cardRevealed(card)}
              settled={settled}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
