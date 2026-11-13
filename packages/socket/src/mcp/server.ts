import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  OPENTDB_DIFFICULTIES,
  OPENTDB_MAX_AMOUNT,
  OPENTDB_TYPES,
} from "@razzia/common/constants"
import { quizzValidator } from "@razzia/common/validators/quizz"
import { api } from "@razzia/socket/api"

/**
 * The tools are thin wrappers around the HTTP API, called with the caller's own
 * API token. That keeps one set of rules: validation and permissions are
 * decided by the routes, never by a second copy here.
 */

interface ToolResult {
  [key: string]: unknown
  content: Array<{ type: "text"; text: string }>
  isError?: boolean
}

const text = (value: unknown, isError = false): ToolResult => ({
  content: [
    {
      type: "text",
      text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
    },
  ],
  ...(isError ? { isError } : {}),
})

const QUIZ_GUIDE = `A quiz is a JSON object: { gameMode, subject, questions[] }.
- gameMode: "quiz" (every question needs "solutions") or "survey" (no right answers).
- Each question: type ("single" = exactly one correct answer, "multi" = one or more, "estimation" = a number), question (text), answers (2-4 strings, empty for estimation), solutions (array of zero-based indexes into answers; for estimation the correct number), cooldown (3-15 seconds shown before the question), time (seconds to answer, -1 for no limit).
- Optional per question: category (round name), note (explanation shown after the answer), media { type: "image"|"video"|"audio", url }, maxPoints, penalty, options.
- Keep answers short and make exactly the intended answers correct. Do not number the answers.
- The JSON Schema below is the authoritative definition; create_quiz returns the first failing rule when a quiz is invalid.`

export const translationInstruction = (language: string) =>
  `The questions above are in English. Translate each question and its answers into "${language}" before you create a quiz, and keep these rules:
1. Translate only while the question stays correct and answerable. Leave a part untranslated when translating would break it: proper names, titles of books, films, songs and games (when the question is about the original title), wordplay, rhymes, anagrams, questions about spelling or about a specific word, questions about language itself, quotes, slogans, brand names, and abbreviations or codes whose letters carry the meaning.
2. Keep the answers in the same order, so "solutions" still points at the right answers. Never reorder them.
3. Do not translate JSON keys or values such as "type", "single" or "multi".
4. If a question cannot be translated in a meaningful way (for example a rhyme question), drop it and generate a replacement instead of saving a broken question.
5. When in doubt, leave it untranslated rather than risk a misleading translation, and tell the user which questions you left in English.`

export const createMcpServer = (authorization: string): McpServer => {
  const call = async (
    path: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<ToolResult> => {
    const response = await api.request(path, {
      method: init.method ?? "GET",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })

    if (response.status === 204) {
      return text({ ok: true })
    }

    const body = (await response.json().catch(() => ({}))) as unknown

    return response.ok
      ? text(body)
      : text({ status: response.status, ...(body as object) }, true)
  }

  const server = new McpServer({ name: "razzia", version: "1.0.0" })

  server.registerTool(
    "get_quiz_schema",
    {
      title: "Get the quiz format",
      description:
        "Describes the quiz JSON format and returns its JSON Schema. Read this before creating or updating a quiz.",
      annotations: { readOnlyHint: true },
    },
    () =>
      text(
        `${QUIZ_GUIDE}\n\nJSON Schema:\n${JSON.stringify(z.toJSONSchema(quizzValidator, { unrepresentable: "any" }), null, 2)}`,
      ),
  )

  server.registerTool(
    "list_quizzes",
    {
      title: "List quizzes",
      description:
        "Lists the quizzes this token's user may see, with id, subject and what the user may do with each.",
      annotations: { readOnlyHint: true },
    },
    () => call("/quizz"),
  )

  server.registerTool(
    "get_quiz",
    {
      title: "Get a quiz",
      description: "Returns one quiz in full, including its questions.",
      inputSchema: { id: z.string().min(1) },
      annotations: { readOnlyHint: true },
    },
    ({ id }) => call(`/quizz/${encodeURIComponent(id)}`),
  )

  server.registerTool(
    "create_quiz",
    {
      title: "Create a quiz",
      description:
        "Creates a quiz from the JSON format of get_quiz_schema and returns its id. Needs the create right.",
      inputSchema: { quiz: z.looseObject({}) },
    },
    ({ quiz }) => call("/quizz", { method: "POST", body: quiz }),
  )

  server.registerTool(
    "update_quiz",
    {
      title: "Update a quiz",
      description:
        "Replaces a whole quiz with a new version. Send the complete quiz, not a patch: get it first with get_quiz, change it, and send it back. Needs the edit right.",
      inputSchema: { id: z.string().min(1), quiz: z.looseObject({}) },
      annotations: { idempotentHint: true },
    },
    ({ id, quiz }) =>
      call(`/quizz/${encodeURIComponent(id)}`, { method: "PATCH", body: quiz }),
  )

  server.registerTool(
    "delete_quiz",
    {
      title: "Delete a quiz",
      description:
        "Permanently deletes a quiz. Only do this when the user explicitly asked for it. Needs the delete right.",
      inputSchema: { id: z.string().min(1) },
      annotations: { destructiveHint: true },
    },
    ({ id }) => call(`/quizz/${encodeURIComponent(id)}`, { method: "DELETE" }),
  )

  server.registerTool(
    "list_question_categories",
    {
      title: "List trivia categories",
      description:
        "Lists the categories (id and name) that generate_questions accepts.",
      annotations: { readOnlyHint: true },
    },
    () => call("/generator/categories"),
  )

  server.registerTool(
    "generate_questions",
    {
      title: "Generate questions",
      description:
        "Fetches ready-made trivia questions from the Open Trivia Database in the quiz question format. They are always in English: pass the language you need and the result includes instructions for translating them. Nothing is saved; put the questions into a quiz with create_quiz. Needs the create right.",
      inputSchema: {
        amount: z.number().int().min(1).max(OPENTDB_MAX_AMOUNT),
        category: z.number().int().positive().optional(),
        difficulty: z.enum(OPENTDB_DIFFICULTIES).optional(),
        type: z.enum(OPENTDB_TYPES).optional(),
        language: z
          .string()
          .min(2)
          .max(40)
          .optional()
          .describe(
            'Language the quiz should be in, e.g. "Dutch" or "nl". Omit to keep English.',
          ),
      },
    },
    async ({ language, ...input }) => {
      const result = await call("/generator", { method: "POST", body: input })

      if (result.isError || !language || /^(en|english)$/iu.test(language)) {
        return result
      }

      return {
        ...result,
        content: [
          ...result.content,
          { type: "text", text: translationInstruction(language) },
        ],
      }
    },
  )

  return server
}
