import { randomBytes, scrypt, timingSafeEqual } from "crypto"
import fs from "fs"
import { nanoid } from "nanoid"
import { promisify } from "util"
import type {
  PublicUser,
  UserPermissions,
  UserRole,
} from "@razzia/common/types/auth"
import { USER_ROLES } from "@razzia/common/constants"
import { NO_PERMISSIONS } from "@razzia/common/permissions"
import { getPath } from "@razzia/socket/services/config"
import { conflict, forbidden, notFound } from "@razzia/socket/services/errors"

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const KEY_LENGTH = 64

interface StoredUser extends PublicUser {
  passwordHash: string
  createdAt: string
}

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, KEY_LENGTH)

  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`
}

export const verifyPassword = async (
  password: string,
  stored: string,
): Promise<boolean> => {
  const [scheme, saltHex, hashHex] = stored.split("$")

  if (scheme !== "scrypt" || !saltHex || !hashHex) {
    return false
  }

  const expected = Buffer.from(hashHex, "hex")
  const actual = await scryptAsync(
    password,
    Buffer.from(saltHex, "hex"),
    expected.length,
  )

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

// Computed once, so an unknown username costs as much time as a wrong password.
const dummyHash = hashPassword(randomBytes(8).toString("hex"))

const usersFile = () => getPath("users.json")

const readUsers = (): StoredUser[] => {
  try {
    const data = JSON.parse(fs.readFileSync(usersFile(), "utf-8")) as unknown

    return Array.isArray(data) ? (data as StoredUser[]) : []
  } catch {
    return []
  }
}

const writeUsers = (users: StoredUser[]): void => {
  const target = usersFile()
  const tmp = `${target}.${nanoid(6)}.tmp`

  fs.writeFileSync(tmp, JSON.stringify(users, null, 2), { mode: 0o600 })
  fs.renameSync(tmp, target)
}

export const toPublicUser = ({
  id,
  username,
  role,
  permissions,
  mustChangePassword,
}: StoredUser): PublicUser => ({
  id,
  username,
  role,
  permissions,
  mustChangePassword,
})

export const hasUsers = (): boolean => readUsers().length > 0

export const listUsers = (): PublicUser[] => readUsers().map(toPublicUser)

export const getUserById = (id: string): PublicUser | undefined => {
  const user = readUsers().find((u) => u.id === id)

  return user ? toPublicUser(user) : undefined
}

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

export const createUser = async (input: {
  username: string
  password: string
  role: UserRole
  permissions?: UserPermissions
  mustChangePassword?: boolean
}): Promise<PublicUser> => {
  const passwordHash = await hashPassword(input.password)
  // Read after the async hash so the uniqueness check cannot race.
  const users = readUsers()

  if (users.some((u) => sameName(u.username, input.username))) {
    throw conflict("errors:users.usernameTaken")
  }

  const user: StoredUser = {
    id: nanoid(),
    username: input.username,
    role: input.role,
    permissions: input.permissions ?? NO_PERMISSIONS,
    mustChangePassword: input.mustChangePassword ?? false,
    passwordHash,
    createdAt: new Date().toISOString(),
  }

  writeUsers([...users, user])

  return toPublicUser(user)
}

/** Creates the very first admin; refuses once any user exists. */
export const createFirstAdmin = (
  username: string,
  password: string,
): Promise<PublicUser> => {
  if (hasUsers()) {
    return Promise.reject(conflict("errors:auth.setupDone"))
  }

  return createUser({
    username,
    password,
    role: USER_ROLES.ADMIN,
    permissions: { createQuizz: true, editQuizz: true, deleteQuizz: true },
  })
}

export const authenticate = async (
  username: string,
  password: string,
): Promise<PublicUser | null> => {
  const user = readUsers().find((u) => sameName(u.username, username))
  const valid = await verifyPassword(
    password,
    user?.passwordHash ?? (await dummyHash),
  )

  return user && valid ? toPublicUser(user) : null
}

const adminCount = (users: StoredUser[]) =>
  users.filter((u) => u.role === USER_ROLES.ADMIN).length

const mutate = (
  id: string,
  change: (user: StoredUser) => StoredUser,
): PublicUser => {
  const users = readUsers()
  const index = users.findIndex((u) => u.id === id)

  if (index === -1) {
    throw notFound("errors:users.notFound")
  }

  const updated = change(users[index])
  const next = users.map((u, i) => (i === index ? updated : u))

  if (adminCount(next) === 0) {
    throw conflict("errors:users.lastAdmin")
  }

  writeUsers(next)

  return toPublicUser(updated)
}

export const updateUser = (
  id: string,
  patch: { role?: UserRole; permissions?: UserPermissions },
): PublicUser =>
  mutate(id, (user) => ({
    ...user,
    role: patch.role ?? user.role,
    permissions: patch.permissions ?? user.permissions,
  }))

export const setPassword = async (
  id: string,
  password: string,
  mustChangePassword: boolean,
): Promise<PublicUser> => {
  const passwordHash = await hashPassword(password)

  return mutate(id, (user) => ({ ...user, passwordHash, mustChangePassword }))
}

export const changeOwnPassword = async (
  id: string,
  currentPassword: string,
  newPassword: string,
): Promise<PublicUser> => {
  const user = readUsers().find((u) => u.id === id)

  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw forbidden("errors:auth.invalidCredentials")
  }

  return setPassword(id, newPassword, false)
}

export const deleteUser = (id: string): void => {
  const users = readUsers()

  if (!users.some((u) => u.id === id)) {
    throw notFound("errors:users.notFound")
  }

  const next = users.filter((u) => u.id !== id)

  if (adminCount(next) === 0) {
    throw conflict("errors:users.lastAdmin")
  }

  writeUsers(next)
}

export const generateTemporaryPassword = (): string =>
  randomBytes(9).toString("base64url")
