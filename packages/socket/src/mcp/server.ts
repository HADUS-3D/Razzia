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
- Each question: type ("single" = exactly one correct answer, "multi" = one or more, "estimation" = a number, "puzzle" = 12 words in 3 groups of 4 whose connections players type, "pin" = players tap a spot on an image or map), question (text), answers (2-4 strings, empty for estimation and pin, exactly 12 words for a puzzle), solutions (array of zero-based indexes into answers; for estimation the correct number; not used for a puzzle or pin), cooldown (3-15 seconds shown before the question), time (seconds to answer, -1 for no limit).
- Puzzle (quiz mode only): answers holds 12 words, words 1-4 are group 1, 5-8 group 2 and 9-12 group 3. options.connections is an array of 3 arrays, one per group, with every accepted answer for that group's connection (the first is shown as the solution). Capitals and accents are ignored when checking, typos are not, so list sensible variants ("Rivers", "River"). Each group's 4 words must share one clear connection that the other groups' words do not fit. Example: { "type": "puzzle", "question": "What do the words in each group have in common?", "answers": ["Mars","Venus","Saturn","Mercury","Nile","Amazon","Danube","Rhine","Hamlet","Macbeth","Othello","Tempest"], "options": { "connections": [["Planets"],["Rivers"],["Shakespeare plays"]] }, "cooldown": 5, "time": 60 }.
- Pin (quiz mode only): players tap a spot on an image, for example a map, and score on how close they get, not on speed. media must be an image ({ "type": "image", "url": "https://..." } or an uploaded "/media/..." path) and answers must be empty. options: { x, y, radius, maxDistance, aspect?, imageWidth?, unit? }. x and y are the right spot as percentages (0-100) of the image width and height, measured from the top left. radius is how close (in percent of the image width) still earns full points; maxDistance is the distance from which an answer earns nothing, the points fall in a straight line in between (so maxDistance > radius; typical: radius 3, maxDistance 50). aspect is the image width divided by its height (default 1; give it when you know it, distances use it). imageWidth plus unit state how wide the image is in real life (for example 4000 and "km" for a map of Europe) so distances are shown as "412 km" instead of a percentage. Alternatively set options.mode to "map" for a real OpenStreetMap map (no media needed, answers empty): x is then the longitude and y the latitude of the right spot, radius and maxDistance are in km (typical: radius 25, maxDistance 2000) and options.view { lat, lng, zoom } (zoom 0-18) is where the players' map starts, so pick a view in which the whole area is visible. In map mode the distance is shown in km and aspect, imageWidth and unit are not used. For an image you cannot see the image unless you can open it yourself, so x and y are estimates: tell the user to check the spot in the quiz editor. Example: { "type": "pin", "question": "Where is Paris?", "answers": [], "media": { "type": "image", "url": "https://example.com/europe.png" }, "options": { "x": 38, "y": 62, "radius": 3, "maxDistance": 40, "aspect": 1.5, "imageWidth": 4000, "unit": "km" }, "cooldown": 5, "time": 30 }.
- Rounds: set "round": { "name": "...", "background"?: url } on the first question of a round. A round starts with a title slide showing its name and, once it is over, a full leaderboard with each player's longest streak of right answers. Quizzes without any "round" simply play as one long quiz.
- Optional per question: category (the leaderboard is skipped between consecutive questions with the same category), note (explanation shown after the answer), media { type: "image"|"video"|"audio", url }, maxPoints, penalty (fixed points) or penaltyPercent (1-100, percentage of the player's points) for a wrong answer, topPercent (1-100: a top challenge that only the best players get, on their own device; a right answer keeps their points, a wrong or missing one costs the penalty; place it at the end of a round), options.
- Optional on the quiz: speedBonus (0-100, default 100): how much of the points depends on answering fast; lower it so slower readers can still win.
- Keep answers short and make exactly the intended answers correct. Do not number the answers.
- The JSON Schema below is the authoritative definition; create_quiz returns the first failing rule when a quiz is invalid.`

export const translationInstruction = (language: string) =>
  `The questions above are in English. Translate each question and its answers into "${language}" before you create a quiz, and keep these rules:
1. Translate only while the question stays correct and answerable. Leave a part untranslated when translating would break it: proper names, titles of books, films, songs and games (when the question is about the original title), wordplay, rhymes, anagrams, questions about spelling or about a specific word, questions about language itself, quotes, slogans, brand names, and abbreviations or codes whose letters carry the meaning.
2. Keep the answers in the same order, so "solutions" still points at the right answers. Never reorder them. For a puzzle, also translate the connections in "options.connections" (every accepted variant) and keep the 12 words in their groups; only translate a puzzle when its words and connections still work in the target language, otherwise leave it untranslated. For a pin question translate only the question (and a note); leave "options" and the image untouched, unless the image contains text in the source language that makes the question unanswerable.
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
