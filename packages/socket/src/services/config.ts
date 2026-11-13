import fs from "fs"
import { nanoid } from "nanoid"
import { join, resolve } from "path"
import type { QuizzAccess } from "@razzia/common/types/auth"
import type {
  GameResult,
  GameResultMeta,
  QuizzMode,
  QuizzWithId,
} from "@razzia/common/types/game"
import {
  EXAMPLE_QUIZZ,
  QUIZZ_MODES,
  QUIZZ_VISIBILITIES,
} from "@razzia/common/constants"
import { DEFAULT_ACCESS } from "@razzia/common/permissions"
import {
  normalizeLegacyQuizz,
  quizzValidator,
} from "@razzia/common/validators/quizz"
import { invalidInput, notFound } from "@razzia/socket/services/errors"
import { normalizeFilename } from "@razzia/socket/utils/file"

const inContainerPath = process.env.CONFIG_PATH

export const getPath = (path = "") =>
  inContainerPath
    ? resolve(inContainerPath, path)
    : resolve(process.cwd(), "../../config", path)

const readJson = (filePath: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<
      string,
      unknown
    >
  } catch {
    return null
  }
}

// Lstat (not stat) so a symlink planted in the config dir is skipped instead
// of followed outside it.
const listJsonFiles = (dirPath: string): string[] =>
  fs.readdirSync(dirPath).filter((file) => {
    if (!file.endsWith(".json")) {
      return false
    }

    try {
      return fs.lstatSync(join(dirPath, file)).isFile()
    } catch {
      return false
    }
  })

const resolveFileId = (dirPath: string, file: string): string => {
  const data = readJson(join(dirPath, file))

  return typeof data?.id === "string" ? data.id : file.replace(/\.json$/u, "")
}

// Never builds a path from `id` — avoids path traversal by construction.
const findFileById = (subDir: string, id: string): string | undefined => {
  const dirPath = getPath(subDir)

  if (!fs.existsSync(dirPath)) {
    return undefined
  }

  return listJsonFiles(dirPath).find(
    (file) => resolveFileId(dirPath, file) === id,
  )
}

const requireFileById = (subDir: string, id: string, key: string): string => {
  const file = findFileById(subDir, id)

  if (!file) {
    throw notFound(key)
  }

  return file
}

export const initConfig = () => {
  const isConfigFolderExists = fs.existsSync(getPath())

  if (!isConfigFolderExists) {
    fs.mkdirSync(getPath())
  }

  const isQuizzExists = fs.existsSync(getPath("quizz"))

  if (!isQuizzExists) {
    fs.mkdirSync(getPath("quizz"))

    fs.writeFileSync(
      getPath("quizz/example.json"),
      JSON.stringify({ id: nanoid(), ...EXAMPLE_QUIZZ }, null, 2),
    )
  }
}

const subjectCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
})

export const getQuizzMeta = () =>
  getQuizz()
    .map(({ id, subject }) => ({ id, subject }))
    .sort((a, b) => subjectCollator.compare(a.subject, b.subject))

export type QuizzEntry = QuizzWithId & { access: QuizzAccess }

const stringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []

/** Quizzes without (valid) access data stay visible to all and have no owner. */
export const parseAccess = (data: unknown): QuizzAccess => {
  if (typeof data !== "object" || data === null) {
    return { ...DEFAULT_ACCESS, viewers: [], editors: [] }
  }

  const raw = data as Record<string, unknown>

  return {
    ownerId: typeof raw.ownerId === "string" ? raw.ownerId : null,
    visibility:
      raw.visibility === QUIZZ_VISIBILITIES.SECRET
        ? QUIZZ_VISIBILITIES.SECRET
        : QUIZZ_VISIBILITIES.ALL,
    viewers: stringList(raw.viewers),
    editors: stringList(raw.editors),
  }
}

const serializeQuizz = (
  id: string,
  quizz: unknown,
  access: QuizzAccess,
): string => JSON.stringify({ id, ...(quizz as object), access }, null, 2)

const stripAccess = ({ access: _access, ...quizz }: QuizzEntry): QuizzWithId =>
  quizz

export const getQuizzEntryById = (id: string): QuizzEntry => {
  const quizz = getQuizzEntries().find((q) => q.id === id)

  if (!quizz) {
    throw notFound("errors:quizz.notFound")
  }

  return quizz
}

export const getQuizzById = (id: string): QuizzWithId =>
  stripAccess(getQuizzEntryById(id))

export const getQuizz = (): QuizzWithId[] => getQuizzEntries().map(stripAccess)

export const getQuizzEntries = (): QuizzEntry[] => {
  const isExists = fs.existsSync(getPath("quizz"))

  if (!isExists) {
    return []
  }

  try {
    const files = listJsonFiles(getPath("quizz"))

    const quizz: QuizzEntry[] = files.flatMap((file) => {
      const filePath = getPath(`quizz/${file}`)
      const data = readJson(filePath)

      if (!data) {
        console.warn(`Invalid quizz config "${file}": unreadable`)

        return []
      }

      const result = quizzValidator.safeParse(normalizeLegacyQuizz(data))

      if (!result.success) {
        console.warn(`Invalid quizz config "${file}":`, result.error.issues)

        return []
      }

      const access = parseAccess(data.access)

      if (typeof data.id === "string") {
        return [{ id: data.id, ...result.data, access }]
      }

      const id = nanoid()

      fs.writeFileSync(filePath, serializeQuizz(id, result.data, access))

      return [{ id, ...result.data, access }]
    })

    return quizz
  } catch (error) {
    console.error("Failed to read quizz config:", error)

    return []
  }
}

export const updateQuizz = (id: string, data: unknown): { id: string } => {
  const result = quizzValidator.safeParse(data)

  if (!result.success) {
    throw invalidInput(result.error.issues[0].message)
  }

  const file = requireFileById("quizz", id, "errors:quizz.notFound")
  const { access } = getQuizzEntryById(id)

  fs.writeFileSync(
    join(getPath("quizz"), file),
    serializeQuizz(id, result.data, access),
  )

  return { id }
}

export const updateQuizzAccess = (id: string, access: QuizzAccess): void => {
  const file = requireFileById("quizz", id, "errors:quizz.notFound")
  const { id: _id, access: _old, ...content } = getQuizzEntryById(id)

  fs.writeFileSync(
    join(getPath("quizz"), file),
    serializeQuizz(id, content, access),
  )
}

/** Gives every quizz without an owner to `ownerId` (first-setup migration). */
export const assignOrphanQuizzes = (ownerId: string): void => {
  for (const entry of getQuizzEntries()) {
    if (entry.access.ownerId === null) {
      updateQuizzAccess(entry.id, { ...entry.access, ownerId })
    }
  }
}

/** Hands over everything a removed user owned and drops them from sharing. */
export const reassignUserQuizzes = (userId: string, newOwnerId: string) => {
  for (const { id, access } of getQuizzEntries()) {
    const next: QuizzAccess = {
      ownerId: access.ownerId === userId ? newOwnerId : access.ownerId,
      visibility: access.visibility,
      viewers: access.viewers.filter((u) => u !== userId),
      editors: access.editors.filter((u) => u !== userId),
    }

    if (JSON.stringify(next) !== JSON.stringify(access)) {
      updateQuizzAccess(id, next)
    }
  }
}

export const deleteQuizz = (id: string): void => {
  const file = requireFileById("quizz", id, "errors:quizz.notFound")

  fs.unlinkSync(join(getPath("quizz"), file))
}

export const saveResult = (data: GameResult): void => {
  try {
    const resultsPath = getPath("results")

    if (!fs.existsSync(resultsPath)) {
      fs.mkdirSync(resultsPath)
    }

    fs.writeFileSync(
      join(resultsPath, `${nanoid()}.json`),
      JSON.stringify(data, null, 2),
    )

    console.log(`Saved result for "${data.subject}"`)
  } catch (error) {
    console.error("Failed to save result:", error)
  }
}

/** Results written before survey mode have no `gameMode` field. */
type StoredResult = Omit<GameResult, "gameMode"> & { gameMode?: QuizzMode }

export const getResultsMeta = (
  canSee: (hostId?: string) => boolean = () => true,
): GameResultMeta[] => {
  const resultsPath = getPath("results")

  if (!fs.existsSync(resultsPath)) {
    return []
  }

  const readMeta = (file: string): GameResultMeta | null => {
    const data = readJson(join(resultsPath, file)) as StoredResult | null

    if (!data || !canSee(data.hostId)) {
      return null
    }

    try {
      return {
        id: data.id,
        gameMode: data.gameMode ?? QUIZZ_MODES.QUIZ,
        subject: data.subject,
        date: data.date,
        playerCount: data.players.length,
      }
    } catch {
      return null
    }
  }

  try {
    return listJsonFiles(resultsPath)
      .map(readMeta)
      .filter((meta): meta is GameResultMeta => meta !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } catch {
    return []
  }
}

export const getResultById = (id: string): GameResult => {
  const file = requireFileById("results", id, "errors:result.notFound")
  const data = readJson(join(getPath("results"), file))

  if (!data) {
    throw notFound("errors:result.notFound")
  }

  const result = data as unknown as StoredResult

  return { ...result, gameMode: result.gameMode ?? QUIZZ_MODES.QUIZ }
}

export const deleteResult = (id: string): void => {
  const file = requireFileById("results", id, "errors:result.notFound")

  fs.unlinkSync(join(getPath("results"), file))
}

export const saveQuizz = (
  data: unknown,
  ownerId: string | null = null,
): { id: string } => {
  const result = quizzValidator.safeParse(data)

  if (!result.success) {
    throw invalidInput(result.error.issues[0].message)
  }

  const id = nanoid()
  const fileName = normalizeFilename(result.data.subject, { fallback: "quizz" })

  fs.writeFileSync(
    getPath(`quizz/${fileName}.json`),
    serializeQuizz(id, result.data, {
      ...DEFAULT_ACCESS,
      ownerId,
      viewers: [],
      editors: [],
    }),
  )

  return { id }
}
