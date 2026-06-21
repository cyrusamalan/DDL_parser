import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import { buildAiGroupingInput, buildGroupingPrompt, type AiGroupingInput } from "@/lib/ai/grouping-prompt";
import { groupingFromAiSuggestion, type AiGroupingSuggestion } from "@/lib/ddl/table-grouping";
import type { DiagramGrouping, TableFlowNode } from "@/lib/types/diagram";
import type { Edge } from "@xyflow/react";

export type AiGroupingPreview = {
  suggestion: AiGroupingSuggestion;
  grouping: DiagramGrouping;
  ungroupedTableIds: string[];
};

export type AiGroupingResult =
  | { ok: true; preview: AiGroupingPreview }
  | { ok: false; error: string };

const RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    groups: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          tables: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ["name", "tables"],
      },
    },
  },
  required: ["groups"],
};

const GEMINI_TIMEOUT_MS = 30_000;
const DEFAULT_MODEL = "gemini-2.5-flash";

const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-1.5-flash"] as const;

function resolveModelsToTry(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const candidates = preferred ? [preferred, ...FALLBACK_MODELS] : [...FALLBACK_MODELS];
  return [...new Set(candidates)];
}

function isQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("429") ||
    message.includes("Quota exceeded") ||
    message.includes("quota") ||
    message.includes("RESOURCE_EXHAUSTED")
  );
}

function formatGeminiError(error: unknown, model: string): string {
  if (error instanceof Error && error.message === "TIMEOUT") {
    return "Gemini request timed out. Try again with a smaller schema.";
  }
  if (isQuotaError(error)) {
    return [
      `Gemini quota exceeded for model "${model}".`,
      "Enable billing or check usage at ai.google.dev,",
      "or set GEMINI_MODEL in .env.local (e.g. gemini-2.5-flash-lite).",
    ].join(" ");
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  return `Gemini request failed (${model}): ${message}`;
}

function parseSuggestion(raw: unknown): AiGroupingSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const groups = (raw as { groups?: unknown }).groups;
  if (!Array.isArray(groups)) return null;

  const parsedGroups: AiGroupingSuggestion["groups"] = [];
  for (const item of groups) {
    if (!item || typeof item !== "object") continue;
    const name = (item as { name?: unknown }).name;
    const tables = (item as { tables?: unknown }).tables;
    if (typeof name !== "string" || !Array.isArray(tables)) continue;

    parsedGroups.push({
      name: name.trim(),
      tables: tables.filter((table): table is string => typeof table === "string"),
    });
  }

  if (parsedGroups.length === 0) return null;
  return { groups: parsedGroups };
}

function getGeminiApiKey(): string | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return apiKey || null;
}

async function generateGroupingSuggestion(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<AiGroupingSuggestion> {
  const client = new GoogleGenerativeAI(apiKey);
  const generativeModel = client.getGenerativeModel({
    model,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2,
    },
  });

  const result = await withTimeout(generativeModel.generateContent(prompt), GEMINI_TIMEOUT_MS);
  const text = result.response.text();
  if (!text) {
    throw new Error("EMPTY_RESPONSE");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("INVALID_JSON");
  }

  const suggestion = parseSuggestion(parsed);
  if (!suggestion) {
    throw new Error("INVALID_GROUPS");
  }

  return suggestion;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("TIMEOUT")), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function suggestTableGrouping(
  nodes: TableFlowNode[],
  edges: Edge[],
): Promise<AiGroupingResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return { ok: false, error: "Gemini API key not configured. Add GEMINI_API_KEY to your environment." };
  }

  if (nodes.length === 0) {
    return { ok: false, error: "No tables to group." };
  }

  const input: AiGroupingInput = buildAiGroupingInput(nodes, edges);
  const prompt = buildGroupingPrompt(input);
  const modelsToTry = resolveModelsToTry();
  let lastError: unknown = null;
  let lastModel = modelsToTry[0] ?? DEFAULT_MODEL;

  for (const model of modelsToTry) {
    lastModel = model;
    try {
      const suggestion = await generateGroupingSuggestion(apiKey, model, prompt);
      const nodeIds = nodes.map((node) => node.id);
      const grouping = groupingFromAiSuggestion(suggestion, nodeIds);
      const assignedIds = new Set(Object.keys(grouping.assignments));
      const ungroupedTableIds = nodeIds.filter((id) => !assignedIds.has(id));

      return {
        ok: true,
        preview: { suggestion, grouping, ungroupedTableIds },
      };
    } catch (error) {
      lastError = error;

      if (error instanceof Error) {
        if (error.message === "EMPTY_RESPONSE") {
          return { ok: false, error: "Gemini returned an empty response." };
        }
        if (error.message === "INVALID_JSON") {
          return { ok: false, error: "Gemini returned invalid JSON." };
        }
        if (error.message === "INVALID_GROUPS") {
          return { ok: false, error: "Gemini response did not contain valid groups." };
        }
      }

      const hasMoreModels = model !== modelsToTry[modelsToTry.length - 1];
      if (isQuotaError(error) && hasMoreModels) {
        continue;
      }

      return { ok: false, error: formatGeminiError(error, model) };
    }
  }

  return { ok: false, error: formatGeminiError(lastError, lastModel) };
}
