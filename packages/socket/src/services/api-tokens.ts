import { createHash, randomBytes } from "crypto"
import fs from "fs"
import { nanoid } from "nanoid"
import type { ApiTokenMeta, PublicUser } from "@razzia/common/types/auth"
import { API_TOKEN_PREFIX } from "@razzia/common/constants"
import { getPath } from "@razzia/socket/services/config"
import { notFound } from "@razzia/socket/services/errors"
import { getUserById } from "@razzia/socket/services/users"

interface StoredApiToken extends ApiTokenMeta {
  userId: string
  hash: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const LAST_USED_GRANULARITY_MS = 60 * 1000
const PREFIX_DISPLAY_LENGTH = API_TOKEN_PREFIX.length + 4

const tokensFile = () => getPath("api-tokens.json")

// Tokens carry 256 bits of randomness, so a plain SHA-256 is enough here.
const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex")

const readTokens = (): StoredApiToken[] => {
  try {
    const data = JSON.parse(fs.readFileSync(tokensFile(), "utf-8")) as unknown

    return Array.isArray(data) ? (data as StoredApiToken[]) : []
  } catch {
    return []
  }
}

const writeTokens = (tokens: StoredApiToken[]): void => {
  const target = tokensFile()
  const tmp = `${target}.${nanoid(6)}.tmp`

  fs.writeFileSync(tmp, JSON.stringify(tokens, null, 2), { mode: 0o600 })
  fs.renameSync(tmp, target)
}

const toMeta = ({
  id,
  name,
  prefix,
  createdAt,
  expiresAt,
  lastUsedAt,
}: StoredApiToken): ApiTokenMeta => ({
  id,
  name,
  prefix,
  createdAt,
  expiresAt,
  lastUsedAt,
})

export const looksLikeApiToken = (value: string): boolean =>
  value.startsWith(API_TOKEN_PREFIX)

export const listApiTokens = (userId: string): ApiTokenMeta[] =>
  readTokens()
    .filter((token) => token.userId === userId)
    .map(toMeta)

/** The secret is returned here once; only its hash is stored. */
export const createApiToken = (
  userId: string,
  input: { name: string; expiresInDays?: number },
): ApiTokenMeta & { token: string } => {
  const secret = `${API_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`
  const now = Date.now()

  const stored: StoredApiToken = {
    id: nanoid(),
    userId,
    name: input.name,
    prefix: secret.slice(0, PREFIX_DISPLAY_LENGTH),
    hash: hashToken(secret),
    createdAt: new Date(now).toISOString(),
    expiresAt: input.expiresInDays
      ? new Date(now + input.expiresInDays * DAY_MS).toISOString()
      : null,
    lastUsedAt: null,
  }

  writeTokens([...readTokens(), stored])

  return { ...toMeta(stored), token: secret }
}

export const revokeApiToken = (userId: string, id: string): void => {
  const tokens = readTokens()

  if (!tokens.some((token) => token.id === id && token.userId === userId)) {
    throw notFound("errors:tokens.notFound")
  }

  writeTokens(tokens.filter((token) => token.id !== id))
}

export const revokeUserApiTokens = (userId: string): void => {
  const tokens = readTokens()
  const next = tokens.filter((token) => token.userId !== userId)

  if (next.length !== tokens.length) {
    writeTokens(next)
  }
}

export type ApiTokenCheck =
  | { status: "ok"; user: PublicUser }
  | { status: "unknown" | "expired" }

/** Checks a token and says why it is refused, so callers can explain it. */
export const checkApiToken = (secret: string): ApiTokenCheck => {
  const hash = hashToken(secret)
  const tokens = readTokens()
  const stored = tokens.find((token) => token.hash === hash)

  if (!stored) {
    return { status: "unknown" }
  }

  const now = Date.now()

  if (stored.expiresAt && Date.parse(stored.expiresAt) <= now) {
    return { status: "expired" }
  }

  const user = getUserById(stored.userId)

  if (!user) {
    return { status: "unknown" }
  }

  const lastUsed = stored.lastUsedAt ? Date.parse(stored.lastUsedAt) : 0

  // Avoids a disk write on every request.
  if (now - lastUsed > LAST_USED_GRANULARITY_MS) {
    writeTokens(
      tokens.map((token) =>
        token.id === stored.id
          ? { ...token, lastUsedAt: new Date(now).toISOString() }
          : token,
      ),
    )
  }

  return { status: "ok", user }
}

/** The owner of a valid, unexpired token, read fresh like a session. */
export const authenticateApiToken = (secret: string): PublicUser | null => {
  const result = checkApiToken(secret)

  return result.status === "ok" ? result.user : null
}
