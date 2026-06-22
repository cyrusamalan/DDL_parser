"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Key, Link2 } from "lucide-react";
import {
  DEMO_DDL,
  SQL_TOKEN_CLASS,
  tokenizeSql,
} from "@/lib/landing/highlight-sql";

type Stage = "grid" | "zoom" | "type" | "settle" | "erd" | "expand";

/** One full cycle ≈ 18s. Durations are how long each stage is held. */
const SEQUENCE: { stage: Stage; duration: number }[] = [
  { stage: "grid", duration: 2000 },
  { stage: "zoom", duration: 1400 },
  { stage: "type", duration: 5200 },
  { stage: "settle", duration: 1900 },
  { stage: "erd", duration: 3000 },
  { stage: "expand", duration: 7200 },
];

/** Sub-timing within the `expand` stage (ms from stage start). */
const EXPAND_ZOOM_MS = 1500; // camera finishes pulling back
const EXPAND_LINES_MS = 1700; // lines finish drawing → tables pop in

const GRID_STAGE: Record<Stage, string> = {
  grid: "scale-100 opacity-60",
  zoom: "scale-[1.8] opacity-30",
  type: "scale-[2.1] opacity-20",
  settle: "scale-125 opacity-30",
  erd: "scale-110 opacity-45",
  expand: "scale-100 opacity-25",
};

const SQL_STAGE: Record<Stage, string> = {
  grid: "opacity-0 scale-75 translate-y-6",
  zoom: "opacity-100 scale-100 translate-y-0",
  type: "opacity-100 scale-100 translate-y-0",
  settle: "opacity-0 scale-90 -translate-y-3 blur-sm",
  erd: "opacity-0 scale-90",
  expand: "opacity-0 scale-90",
};

const ERD_STAGE: Record<Stage, string> = {
  grid: "opacity-0",
  zoom: "opacity-0",
  type: "opacity-100",
  settle: "opacity-100",
  erd: "opacity-100",
  expand: "opacity-100",
};

/** Camera zoom: tight on the core cluster, then pulled all the way back. */
const FOCUS = "scale(1.35)";
const CAMERA: Record<Stage, string> = {
  grid: FOCUS,
  zoom: FOCUS,
  type: FOCUS,
  settle: FOCUS,
  erd: FOCUS,
  expand: "scale(1)",
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

/**
 * Big canvas: the original 640×440 core stage is centred inside it, and a dense
 * outer ring of tables fills the rest — revealed when the camera zooms out.
 */
const BIG_W = 1820;
const BIG_H = 1160;
const CORE_W = 640;
const CORE_H = 440;
const CORE_OFFSET = {
  x: (BIG_W - CORE_W) / 2, // 780 — core sits dead-centre
  y: (BIG_H - CORE_H) / 2, // 430
} as const;

const CARD_W = 200;
/** Approximate rendered card height for edge anchoring (header + rows). */
const cardHeight = (cols: number) => 38 + cols * 40;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Orthogonal (right-angle) connector between two cards, ERD-tool style: exit the
 * side of `a` that faces `b`, run to a vertical channel between them, drop to the
 * target row, then enter `b`. Produces the stepped H-V-H lines of a real ERD.
 */
function edgeBetween(a: Rect, b: Rect): string {
  const ay = Math.round(a.y + a.h / 2);
  const by = Math.round(b.y + b.h / 2);
  const exitRight = b.x + b.w / 2 >= a.x + a.w / 2;
  const sx = exitRight ? a.x + a.w : a.x;
  const tx = exitRight ? b.x : b.x + b.w;
  const stub = 26;
  const midX = exitRight
    ? Math.round(Math.max((sx + tx) / 2, sx + stub))
    : Math.round(Math.min((sx + tx) / 2, sx - stub));
  return `M ${Math.round(sx)} ${ay} H ${midX} V ${by} H ${Math.round(tx)}`;
}

/** Core card rects in big-canvas coords (core-local coords + CORE_OFFSET). */
const CORE_RECTS: Record<string, Rect> = {
  users: { x: CORE_OFFSET.x + 20, y: CORE_OFFSET.y + 70, w: CARD_W, h: cardHeight(4) },
  posts: { x: CORE_OFFSET.x + 400, y: CORE_OFFSET.y + 40, w: CARD_W, h: cardHeight(4) },
  comments: { x: CORE_OFFSET.x + 220, y: CORE_OFFSET.y + 300, w: CARD_W, h: cardHeight(4) },
};

/** An outer table: a card plus every table it points to (one FK edge each). */
interface OuterDef extends CardDef {
  refs?: string[];
}

const NO_SCATTER = "scale(0.8)";

/**
 * A simple OLTP-ish schema around the core. Tables are laid out on a centred
 * ellipse around the core (see below) rather than hugging the screen edges; the
 * FK connections are mostly decorative.
 */
const RING_BASE: Omit<OuterDef, "left" | "top">[] = [
  { name: "tags", refs: [], scatter: NO_SCATTER, appearAt: 0, floatDur: "8.5s", floatDelay: "0.2s", columns: [{ name: "id", type: "uuid", pk: true }, { name: "name", type: "text" }, { name: "slug", type: "text" }] },
  { name: "post_tags", refs: ["posts", "tags"], scatter: NO_SCATTER, appearAt: 0, floatDur: "8s", floatDelay: "0.5s", columns: [{ name: "post_id", type: "uuid", pk: true, fk: true }, { name: "tag_id", type: "uuid", pk: true, fk: true }] },
  { name: "categories", refs: [], scatter: NO_SCATTER, appearAt: 0, floatDur: "9s", floatDelay: "0.3s", columns: [{ name: "id", type: "uuid", pk: true }, { name: "name", type: "text" }, { name: "slug", type: "text" }] },
  { name: "teams", refs: ["users"], scatter: NO_SCATTER, appearAt: 0, floatDur: "8.5s", floatDelay: "0.6s", columns: [{ name: "id", type: "uuid", pk: true }, { name: "owner_id", type: "uuid", fk: true }, { name: "name", type: "text" }] },
  { name: "projects", refs: ["teams", "users"], scatter: NO_SCATTER, appearAt: 0, floatDur: "9s", floatDelay: "0.4s", columns: [{ name: "id", type: "uuid", pk: true }, { name: "team_id", type: "uuid", fk: true }, { name: "lead_id", type: "uuid", fk: true }] },
  { name: "tasks", refs: ["projects", "users"], scatter: NO_SCATTER, appearAt: 0, floatDur: "8s", floatDelay: "0.7s", columns: [{ name: "id", type: "uuid", pk: true }, { name: "project_id", type: "uuid", fk: true }, { name: "assignee_id", type: "uuid", fk: true }] },
  { name: "notifications", refs: ["users", "comments"], scatter: NO_SCATTER, appearAt: 0, floatDur: "9s", floatDelay: "0.5s", columns: [{ name: "id", type: "uuid", pk: true }, { name: "user_id", type: "uuid", fk: true }, { name: "comment_id", type: "uuid", fk: true }] },
  { name: "likes", refs: ["users", "posts"], scatter: NO_SCATTER, appearAt: 0, floatDur: "8.5s", floatDelay: "0.9s", columns: [{ name: "user_id", type: "uuid", pk: true, fk: true }, { name: "post_id", type: "uuid", pk: true, fk: true }] },
  { name: "bookmarks", refs: ["users", "posts"], scatter: NO_SCATTER, appearAt: 0, floatDur: "8s", floatDelay: "0.3s", columns: [{ name: "user_id", type: "uuid", pk: true, fk: true }, { name: "post_id", type: "uuid", pk: true, fk: true }] },
  { name: "reactions", refs: ["comments", "users"], scatter: NO_SCATTER, appearAt: 0, floatDur: "9s", floatDelay: "0.6s", columns: [{ name: "id", type: "uuid", pk: true }, { name: "comment_id", type: "uuid", fk: true }, { name: "user_id", type: "uuid", fk: true }] },
  { name: "follows", refs: ["users"], scatter: NO_SCATTER, appearAt: 0, floatDur: "8.5s", floatDelay: "0.4s", columns: [{ name: "follower_id", type: "uuid", pk: true, fk: true }, { name: "followee_id", type: "uuid", pk: true, fk: true }] },
  { name: "sessions", refs: ["users"], scatter: NO_SCATTER, appearAt: 0, floatDur: "9s", floatDelay: "0.8s", columns: [{ name: "id", type: "uuid", pk: true }, { name: "user_id", type: "uuid", fk: true }, { name: "expires_at", type: "timestamptz" }] },
  { name: "profiles", refs: ["users"], scatter: NO_SCATTER, appearAt: 0, floatDur: "8s", floatDelay: "0.2s", columns: [{ name: "user_id", type: "uuid", pk: true, fk: true }, { name: "bio", type: "text" }, { name: "avatar_url", type: "text" }] },
  { name: "media", refs: ["posts", "users"], scatter: NO_SCATTER, appearAt: 0, floatDur: "9s", floatDelay: "0.7s", columns: [{ name: "id", type: "uuid", pk: true }, { name: "post_id", type: "uuid", fk: true }, { name: "uploader_id", type: "uuid", fk: true }] },
];

// Centred ellipse around the core — keeps tables off the screen edges.
const RING_CX = BIG_W / 2;
const RING_CY = BIG_H / 2;
const RING_RX = 630;
const RING_RY = 420;

const EXTRA_CARDS: OuterDef[] = RING_BASE.map((card, i) => {
  const angle = (i / RING_BASE.length) * Math.PI * 2 - Math.PI / 2;
  const h = cardHeight(card.columns.length);
  return {
    ...card,
    left: Math.round(RING_CX + Math.cos(angle) * RING_RX - CARD_W / 2),
    top: Math.round(RING_CY + Math.sin(angle) * RING_RY - h / 2),
  };
});

const OUTER_RECTS: Record<string, Rect> = Object.fromEntries(
  EXTRA_CARDS.map((card) => [
    card.name,
    { x: card.left, y: card.top, w: CARD_W, h: cardHeight(card.columns.length) },
  ]),
);

const ALL_RECTS: Record<string, Rect> = { ...CORE_RECTS, ...OUTER_RECTS };

/**
 * One edge per (table → referenced table). Drawn from the referenced table
 * *outward* to the new table, so during the zoom-out the lines grow across the
 * schema and the tables form at their ends. Many tables have 2 FKs → a web.
 */
const EXTRA_EDGES: EdgeDef[] = EXTRA_CARDS.flatMap((card, i) =>
  (card.refs ?? [])
    .filter((ref) => ALL_RECTS[ref])
    .map((ref, j) => ({
      d: edgeBetween(ALL_RECTS[ref], OUTER_RECTS[card.name]),
      delay: i * 45 + j * 90,
      highlight: (i + j) % 5 === 0,
    })),
);

export function HeroAnimation() {
  const [index, setIndex] = useState(0);
  const [typeProgress, setTypeProgress] = useState(0);
  // 0 = none, 1 = zoomed out (draw lines), 2 = lines done (tables form).
  const [expandStep, setExpandStep] = useState(0);
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

  // Advance through the sequence once, then hold on the final web diagram.
  useEffect(() => {
    if (reduced || !active) return;
    if (index >= SEQUENCE.length - 1) return; // last stage: stay until reload
    const timer = setTimeout(() => setIndex(index + 1), SEQUENCE[index].duration);
    return () => clearTimeout(timer);
  }, [index, active, reduced]);

  const stage: Stage = reduced ? "erd" : SEQUENCE[index].stage;

  // Sequence the expand stage: zoom out first, then draw lines, then form tables.
  useEffect(() => {
    if (stage !== "expand" || reduced || !active) return;
    const toLines = setTimeout(() => setExpandStep(1), EXPAND_ZOOM_MS);
    const toTables = setTimeout(
      () => setExpandStep(2),
      EXPAND_ZOOM_MS + EXPAND_LINES_MS,
    );
    return () => {
      clearTimeout(toLines);
      clearTimeout(toTables);
    };
  }, [stage, reduced, active]);

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

      {/* The resulting ER diagram: nudged right while focused, full-bleed on expand. */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-[opacity,padding] duration-[1300ms] ease-in-out ${
          stage === "expand" ? "" : "md:pl-[18%] lg:pl-[26%]"
        } ${ERD_STAGE[stage]}`}
        style={{ perspective: 1000 }}
      >
        <DemoErd
          stage={stage}
          settled={settled}
          typeProgress={typeProgress}
          expandStep={expandStep}
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
  placed,
  revealMs = 1200,
  rowMs = 500,
  rowStagger = 80,
}: {
  card: CardDef;
  revealed: boolean;
  placed: boolean;
  revealMs?: number;
  rowMs?: number;
  rowStagger?: number;
}) {
  return (
    <div className="absolute" style={{ left: card.left, top: card.top }}>
      {/* Settle layer: glides from scattered position into place. */}
      <div
        className="ease-out"
        style={{
          opacity: revealed ? 1 : 0,
          transform: placed ? "none" : card.scatter,
          transition: `opacity ${revealMs}ms ease-out, transform ${revealMs}ms ease-out`,
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
                className={`flex items-center justify-between gap-2 px-3 py-1.5 text-xs transition-all ${
                  revealed ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                } ${
                  column.pk
                    ? "bg-amber-50/80"
                    : column.fk
                      ? "bg-sky-50/80"
                      : "bg-white"
                }`}
                style={{
                  transitionDuration: `${rowMs}ms`,
                  transitionDelay: revealed ? `${i * rowStagger}ms` : "0ms",
                }}
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

function ArrowDefs({ suffix }: { suffix: string }) {
  return (
    <defs>
      <marker
        id={`arrow-gray${suffix}`}
        markerWidth="8"
        markerHeight="8"
        refX="6"
        refY="3"
        orient="auto"
      >
        <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
      </marker>
      <marker
        id={`arrow-sky${suffix}`}
        markerWidth="8"
        markerHeight="8"
        refX="6"
        refY="3"
        orient="auto"
      >
        <path d="M0,0 L6,3 L0,6 Z" fill="#0ea5e9" />
      </marker>
    </defs>
  );
}

function EdgePath({
  edge,
  id,
  suffix,
  draw,
  length = 700,
  marker = true,
}: {
  edge: EdgeDef;
  id: string;
  suffix: string;
  draw: boolean;
  length?: number;
  marker?: boolean;
}) {
  return (
    <path
      id={id}
      d={edge.d}
      fill="none"
      stroke={edge.highlight ? "#0ea5e9" : "#64748b"}
      strokeWidth={edge.highlight ? 1.75 : 1.25}
      markerEnd={marker ? `url(#arrow-${edge.highlight ? "sky" : "gray"}${suffix})` : undefined}
      style={
        draw
          ? ({
              strokeDasharray: length,
              strokeDashoffset: length,
              ["--edge-length"]: length,
              animation: `edge-draw 1.1s ease-out ${edge.delay}ms forwards`,
            } as CSSProperties)
          : undefined
      }
    />
  );
}

function EdgePulse({ edge, href, begin }: { edge: EdgeDef; href: string; begin: string }) {
  return (
    <circle r={3.5} fill={edge.highlight ? "#38bdf8" : "#cbd5e1"}>
      <animateMotion dur="2.4s" begin={begin} repeatCount="indefinite">
        <mpath href={href} />
      </animateMotion>
    </circle>
  );
}

function DemoErd({
  stage,
  settled,
  typeProgress,
  expandStep,
  reduced,
}: {
  stage: Stage;
  settled: boolean;
  typeProgress: number;
  expandStep: number;
  reduced: boolean;
}) {
  const focused = settled || stage === "expand"; // core fully placed + connected
  const coreRevealed = (card: CardDef) =>
    focused || (stage === "type" && typeProgress >= card.appearAt);
  const pulsing = (stage === "erd" || stage === "expand") && !reduced;
  // Expand sub-phases: lines draw at step 1, outer tables form at step 2.
  const linesDrawing = expandStep >= 1;
  const tablesFormed = expandStep >= 2;

  return (
    <div
      className="relative transition-transform duration-300 ease-out"
      style={{
        transform:
          "rotateX(calc(var(--py) * -5deg)) rotateY(calc(var(--px) * 7deg)) translate3d(calc(var(--px) * 12px), calc(var(--py) * 12px), 0)",
      }}
    >
      <div className="relative scale-[0.4] sm:scale-[0.52] md:scale-[0.64] lg:scale-[0.8] xl:scale-[0.92]">
        {/* Camera: zooms from the focused core out to the full schema. */}
        <div
          className="relative transition-transform duration-[1500ms] ease-in-out"
          style={{ width: BIG_W, height: BIG_H, transform: CAMERA[stage] }}
        >
          {/* Outer-ring edges (draw in + pulse during the zoom-out). */}
          <svg
            className="absolute inset-0 h-full w-full overflow-visible"
            viewBox={`0 0 ${BIG_W} ${BIG_H}`}
          >
            <ArrowDefs suffix="-x" />
            <g className="transition-opacity duration-500" style={{ opacity: linesDrawing ? 1 : 0 }}>
              {EXTRA_EDGES.map((edge, i) => (
                <EdgePath
                  key={i}
                  edge={edge}
                  id={`hero-xedge-${i}`}
                  suffix="-x"
                  draw={linesDrawing}
                  length={3800}
                  marker={false}
                />
              ))}
            </g>
            {tablesFormed && !reduced && (
              <g>
                {EXTRA_EDGES.map((edge, i) => (
                  <EdgePulse
                    key={i}
                    edge={edge}
                    href={`#hero-xedge-${i}`}
                    begin={`${i * 0.25}s`}
                  />
                ))}
              </g>
            )}
          </svg>

          {/* Outer-ring tables pop in instantly at the line ends once drawn. */}
          {EXTRA_CARDS.map((card) => (
            <MiniCard
              key={card.name}
              card={card}
              revealed={tablesFormed}
              placed={tablesFormed}
              revealMs={180}
              rowMs={180}
              rowStagger={0}
            />
          ))}

          {/* The original core stage, centred in the big stage (untouched coords). */}
          <div
            className="absolute"
            style={{ left: CORE_OFFSET.x, top: CORE_OFFSET.y }}
          >
            <div className="relative h-[440px] w-[640px]">
              <svg
                className="absolute inset-0 h-full w-full overflow-visible"
                viewBox="0 0 640 440"
              >
                <ArrowDefs suffix="" />
                <g className="transition-opacity duration-700" style={{ opacity: focused ? 1 : 0 }}>
                  {EDGES.map((edge, i) => (
                    <EdgePath
                      key={i}
                      edge={edge}
                      id={`hero-edge-${i}`}
                      suffix=""
                      draw={settled}
                    />
                  ))}
                </g>
                {pulsing && (
                  <g>
                    {EDGES.map((edge, i) => (
                      <EdgePulse
                        key={i}
                        edge={edge}
                        href={`#hero-edge-${i}`}
                        begin={`${1 + i * 0.4}s`}
                      />
                    ))}
                  </g>
                )}
              </svg>

              {CARDS.map((card) => (
                <MiniCard
                  key={card.name}
                  card={card}
                  revealed={coreRevealed(card)}
                  placed={focused}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
