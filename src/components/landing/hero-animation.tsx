"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Key, Link2 } from "lucide-react";
import {
  DEMO_DDL,
  SQL_TOKEN_CLASS,
  tokenizeSql,
} from "@/lib/landing/highlight-sql";

type Stage = "grid" | "zoom" | "sql" | "morph" | "erd";

/** One full cycle ≈ 13.6s. Durations are how long each stage is held. */
const SEQUENCE: { stage: Stage; duration: number }[] = [
  { stage: "grid", duration: 2200 },
  { stage: "zoom", duration: 1700 },
  { stage: "sql", duration: 4200 },
  { stage: "morph", duration: 1900 },
  { stage: "erd", duration: 3600 },
];

const GRID_STAGE: Record<Stage, string> = {
  grid: "scale-100 opacity-60",
  zoom: "scale-[1.8] opacity-30",
  sql: "scale-[2.1] opacity-20",
  morph: "scale-125 opacity-30",
  erd: "scale-110 opacity-45",
};

const SQL_STAGE: Record<Stage, string> = {
  grid: "opacity-0 scale-75 translate-y-6",
  zoom: "opacity-100 scale-100 translate-y-0",
  sql: "opacity-100 scale-100 translate-y-0",
  morph: "opacity-0 scale-90 -translate-y-3 blur-sm",
  erd: "opacity-0 scale-90",
};

const ERD_STAGE: Record<Stage, string> = {
  grid: "opacity-0 scale-90",
  zoom: "opacity-0 scale-90",
  sql: "opacity-0 scale-95",
  morph: "opacity-100 scale-100",
  erd: "opacity-100 scale-100",
};

export function HeroAnimation() {
  const [index, setIndex] = useState(0);
  const [loopKey, setLoopKey] = useState(0);
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
      setIndex(next);
      if (next === 0) setLoopKey((key) => key + 1);
    }, SEQUENCE[index].duration);
    return () => clearTimeout(timer);
  }, [index, active, reduced]);

  const stage: Stage = reduced ? "erd" : SEQUENCE[index].stage;

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden">
      {/* Base — solid black, always present, never transformed. */}
      <div className="absolute inset-0 bg-black" />

      {/* Faint ambient glows for depth (kept subtle against black). */}
      <div className="hero-animated absolute -left-32 top-1/4 h-[28rem] w-[28rem] rounded-full bg-sky-500/10 blur-[130px] animate-[glow-pulse_9s_ease-in-out_infinite]" />
      <div className="hero-animated absolute -right-24 bottom-0 h-[26rem] w-[26rem] rounded-full bg-zinc-400/10 blur-[130px] animate-[glow-pulse_11s_ease-in-out_infinite]" />

      {/* Blueprint grid lines — scale to fake the camera zoom. */}
      <div
        className={`hero-animated absolute inset-0 origin-center transition-all duration-[1200ms] ease-in-out animate-[grid-pan_18s_linear_infinite] ${GRID_STAGE[stage]}`}
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial fade so the grid melts into the edges. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      {/* SQL editor panel (nudged right of centre). */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-[1100ms] ease-in-out md:pl-[18%] lg:pl-[26%] ${SQL_STAGE[stage]}`}
      >
        <SqlPanel />
      </div>

      {/* The resulting ER diagram (nudged right of centre). */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-[1100ms] ease-in-out md:pl-[18%] lg:pl-[26%] ${ERD_STAGE[stage]}`}
      >
        <DemoErd loopKey={loopKey} animate={!reduced} />
      </div>
    </div>
  );
}

function SqlPanel() {
  const tokens = tokenizeSql(DEMO_DDL);
  const code = (
    <pre className="px-5 py-3 font-mono text-[11px] leading-5 sm:text-xs">
      {tokens.map((token, i) => (
        <span key={i} className={SQL_TOKEN_CLASS[token.kind]}>
          {token.value}
        </span>
      ))}
    </pre>
  );

  return (
    <div className="w-[440px] max-w-[88vw] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/85 shadow-2xl shadow-black/60 backdrop-blur-sm">
      {/* Window chrome. */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-black/60 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-red-400/80" />
        <span className="h-3 w-3 rounded-full bg-amber-400/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
        <span className="ml-2 font-mono text-[11px] text-zinc-400">schema.sql</span>
      </div>

      {/* Scrolling code track (rendered twice for a seamless loop). */}
      <div className="relative h-[260px] overflow-hidden">
        <div className="hero-animated animate-[code-scroll_16s_linear_infinite]">
          {code}
          {code}
        </div>
        {/* Top/bottom fade. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-zinc-950/95 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950/95 to-transparent" />
      </div>
    </div>
  );
}

interface MiniColumn {
  name: string;
  type: string;
  pk?: boolean;
  fk?: boolean;
}

function MiniCard({
  name,
  columns,
  style,
  className,
}: {
  name: string;
  columns: MiniColumn[];
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      style={style}
      className={`absolute w-[200px] overflow-hidden rounded-xl border border-zinc-300/80 bg-white shadow-xl shadow-black/30 ${className ?? ""}`}
    >
      <div className="border-b border-zinc-200 bg-gradient-to-r from-zinc-100 to-zinc-50 px-3 py-2">
        <p className="truncate text-sm font-semibold tracking-tight text-zinc-900">
          {name}
        </p>
      </div>
      <ul className="divide-y divide-zinc-100">
        {columns.map((column) => (
          <li
            key={column.name}
            className={`flex items-center justify-between gap-2 px-3 py-1.5 text-xs ${
              column.pk
                ? "bg-amber-50/80"
                : column.fk
                  ? "bg-sky-50/80"
                  : "bg-white"
            }`}
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
  );
}

/** Decorative edge with a staggered draw-in animation. */
function Edge({
  d,
  highlight,
  delay,
  animate,
}: {
  d: string;
  highlight?: boolean;
  delay: number;
  animate: boolean;
}) {
  const length = 700;
  return (
    <path
      d={d}
      fill="none"
      stroke={highlight ? "#0ea5e9" : "#94a3b8"}
      strokeWidth={highlight ? 2 : 1.5}
      markerEnd={highlight ? "url(#arrow-sky)" : "url(#arrow-gray)"}
      style={
        animate
          ? {
              strokeDasharray: length,
              strokeDashoffset: length,
              ["--edge-length" as string]: length,
              animation: `edge-draw 1.1s ease-out ${delay}ms forwards`,
            }
          : undefined
      }
    />
  );
}

function DemoErd({ loopKey, animate }: { loopKey: number; animate: boolean }) {
  return (
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
          {/* posts.author_id -> users.id */}
          <Edge
            d="M 400 150 C 330 150, 300 150, 230 135"
            highlight
            delay={0}
            animate={animate}
          />
          {/* comments.post_id -> posts.id */}
          <Edge
            d="M 430 300 C 470 280, 500 250, 500 215"
            delay={250}
            animate={animate}
          />
          {/* comments.author_id -> users.id */}
          <Edge
            d="M 230 320 C 150 320, 120 280, 120 235"
            delay={450}
            animate={animate}
          />
        </svg>

        <MiniCard
          name="users"
          className="hero-animated animate-[float-y_7s_ease-in-out_infinite]"
          style={{ left: 20, top: 70 }}
          columns={[
            { name: "id", type: "uuid", pk: true },
            { name: "email", type: "text" },
            { name: "full_name", type: "text" },
            { name: "created_at", type: "timestamptz" },
          ]}
        />
        <MiniCard
          name="posts"
          className="hero-animated animate-[float-y_8s_ease-in-out_infinite]"
          style={{ left: 400, top: 40, animationDelay: "1s" }}
          columns={[
            { name: "id", type: "uuid", pk: true },
            { name: "author_id", type: "uuid", fk: true },
            { name: "title", type: "text" },
            { name: "published", type: "boolean" },
          ]}
        />
        <MiniCard
          name="comments"
          className="hero-animated animate-[float-y_7.5s_ease-in-out_infinite]"
          style={{ left: 220, top: 300, animationDelay: "0.5s" }}
          columns={[
            { name: "id", type: "uuid", pk: true },
            { name: "post_id", type: "uuid", fk: true },
            { name: "author_id", type: "uuid", fk: true },
            { name: "body", type: "text" },
          ]}
        />
      </div>
    </div>
  );
}
