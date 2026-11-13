import z from "zod"
import {
  MAX_API_TOKEN_DAYS,
  MIN_PASSWORD_LENGTH,
  QUIZZ_VISIBILITIES,
  SESSION_ROLES,
  USER_ROLES,
} from "@razzia/common/constants"

export const usernameValidator = z
  .string()
  .min(1, "errors:auth.usernameTooShort")
  .max(24, "errors:auth.usernameTooLong")

export const inviteCodeValidator = z
  .string()
  .length(6, "errors:auth.invalidInviteCode")

export const sessionClaimsValidator = z.object({
  sub: z.string().min(1),
  role: z.enum(SESSION_ROLES),
  userId: z.string().min(1).optional(),
  iat: z.number(),
  exp: z.number(),
})

export const joinTicketClaimsValidator = z.object({
  sub: z.string().min(1),
  gameId: z.string().min(1),
  username: usernameValidator.optional(),
  iat: z.number(),
  exp: z.number(),
})

export const accountNameValidator = z
  .string()
  .trim()
  .min(3, "errors:auth.accountNameTooShort")
  .max(32, "errors:auth.accountNameTooLong")
  .regex(/^[\w.-]+$/u, "errors:auth.accountNameInvalid")

export const passwordValidator = z
  .string()
  .min(MIN_PASSWORD_LENGTH, "errors:auth.passwordTooShort")
  .max(128, "errors:auth.passwordTooLong")

export const loginValidator = z.object({
  username: z.string().min(1, "errors:auth.invalidCredentials"),
  password: z.string().min(1, "errors:auth.invalidCredentials"),
})

export const setupValidator = z.object({
  username: accountNameValidator,
  password: passwordValidator,
  setupCode: z.string().min(1, "errors:manager.invalidPassword"),
})

export const changePasswordValidator = z.object({
  currentPassword: z.string().min(1, "errors:auth.invalidCredentials"),
  newPassword: passwordValidator,
})

export const userPermissionsValidator = z.object({
  createQuizz: z.boolean(),
  editQuizz: z.boolean(),
  deleteQuizz: z.boolean(),
})

export const createUserValidator = z.object({
  username: accountNameValidator,
  password: passwordValidator,
  role: z.enum(USER_ROLES),
  permissions: userPermissionsValidator,
})

export const updateUserValidator = z.object({
  role: z.enum(USER_ROLES).optional(),
  permissions: userPermissionsValidator.optional(),
})

export const resetPasswordValidator = z.object({
  password: passwordValidator.optional(),
})

export const quizzAccessValidator = z.object({
  visibility: z.enum([QUIZZ_VISIBILITIES.ALL, QUIZZ_VISIBILITIES.SECRET]),
  viewers: z.array(z.string()).max(500),
  editors: z.array(z.string()).max(500),
  ownerId: z.string().min(1).optional(),
})

export const sessionRequestValidator = z.object({
  token: z.string().optional(),
})

export const createApiTokenValidator = z.object({
  name: z
    .string()
    .trim()
    .min(1, "errors:tokens.nameEmpty")
    .max(64, "errors:tokens.nameTooLong"),
  expiresInDays: z
    .number("errors:tokens.invalidExpiry")
    .int("errors:tokens.invalidExpiry")
    .min(1, "errors:tokens.invalidExpiry")
    .max(MAX_API_TOKEN_DAYS, "errors:tokens.invalidExpiry")
    .optional(),
})
