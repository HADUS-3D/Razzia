import type {
  QUIZZ_VISIBILITIES,
  SESSION_ROLES,
  USER_ROLES,
} from "@razzia/common/constants"

export type SessionRole = (typeof SESSION_ROLES)[keyof typeof SESSION_ROLES]

export interface SessionClaims {
  sub: string
  role: SessionRole
  userId?: string
  iat: number
  exp: number
}

export interface SessionResponse {
  token: string
  clientId: string
  role: SessionRole
  expiresAt: number
}

export interface JoinTicketClaims {
  sub: string
  gameId: string
  username?: string
  iat: number
  exp: number
}

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

export type QuizzVisibility =
  (typeof QUIZZ_VISIBILITIES)[keyof typeof QUIZZ_VISIBILITIES]

export interface UserPermissions {
  createQuizz: boolean
  editQuizz: boolean
  deleteQuizz: boolean
}

export interface PublicUser {
  id: string
  username: string
  role: UserRole
  permissions: UserPermissions
  mustChangePassword: boolean
}

export interface QuizzAccess {
  ownerId: string | null
  visibility: QuizzVisibility
  viewers: string[]
  editors: string[]
}

export interface AuthStatus {
  needsSetup: boolean
}
