import type {
  PublicUser,
  QuizzAccess,
  UserPermissions,
} from "@razzia/common/types/auth"
import { QUIZZ_VISIBILITIES, USER_ROLES } from "@razzia/common/constants"

type Actor = Pick<PublicUser, "id" | "role" | "permissions">

export const NO_PERMISSIONS: UserPermissions = {
  createQuizz: false,
  editQuizz: false,
  deleteQuizz: false,
}

export const DEFAULT_ACCESS: QuizzAccess = {
  ownerId: null,
  visibility: QUIZZ_VISIBILITIES.ALL,
  viewers: [],
  editors: [],
}

export const isAdmin = (user: Actor): boolean => user.role === USER_ROLES.ADMIN

export const canCreateQuizz = (user: Actor): boolean =>
  isAdmin(user) || user.permissions.createQuizz

export const isOwner = (user: Actor, access: QuizzAccess): boolean =>
  access.ownerId === user.id

/** Everyone may host a quizz they can see. */
export const canViewQuizz = (user: Actor, access: QuizzAccess): boolean =>
  isAdmin(user) ||
  access.visibility === QUIZZ_VISIBILITIES.ALL ||
  isOwner(user, access) ||
  access.viewers.includes(user.id) ||
  access.editors.includes(user.id)

export const canEditQuizz = (user: Actor, access: QuizzAccess): boolean =>
  isAdmin(user) ||
  (user.permissions.editQuizz &&
    (isOwner(user, access) || access.editors.includes(user.id)))

export const canDeleteQuizz = (user: Actor, access: QuizzAccess): boolean =>
  isAdmin(user) || (user.permissions.deleteQuizz && isOwner(user, access))

export const canManageAccess = (user: Actor, access: QuizzAccess): boolean =>
  isAdmin(user) || isOwner(user, access)

export const canViewResult = (user: Actor, hostId?: string): boolean =>
  isAdmin(user) || (hostId !== undefined && hostId === user.id)
