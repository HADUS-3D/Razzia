import { queryOptions } from "@tanstack/react-query"
import type {
  QuizzVisibility,
  UserPermissions,
  UserRole,
} from "@razzia/common/types/auth"
import type { GameSettings } from "@razzia/common/types/game"
import type { GeneratorInput } from "@razzia/common/validators/generator"
import type { QuizzValidated } from "@razzia/common/validators/quizz"
import { api, unwrap, unwrapEmpty } from "@razzia/web/lib/api"

export const quizzKeys = {
  all: ["quizz"] as const,
  detail: (id: string) => ["quizz", id] as const,
}

export const resultKeys = {
  all: ["results"] as const,
  detail: (id: string) => ["results", id] as const,
}

export const quizzListQuery = () =>
  queryOptions({
    queryKey: quizzKeys.all,
    queryFn: () => unwrap(api.quizz.$get()),
  })

export const quizzQuery = (id: string) =>
  queryOptions({
    queryKey: quizzKeys.detail(id),
    queryFn: () => unwrap(api.quizz[":id"].$get({ param: { id } })),
  })

export const resultsListQuery = () =>
  queryOptions({
    queryKey: resultKeys.all,
    queryFn: () => unwrap(api.results.$get()),
  })

export const resultQuery = (id: string) =>
  queryOptions({
    queryKey: resultKeys.detail(id),
    queryFn: () => unwrap(api.results[":id"].$get({ param: { id } })),
  })

export const generatorCategoriesQuery = () =>
  queryOptions({
    queryKey: ["generator", "categories"] as const,
    queryFn: () => unwrap(api.generator.categories.$get()),
    staleTime: 60 * 60 * 1000,
  })

export const generateQuizz = (json: GeneratorInput) =>
  unwrap(api.generator.$post({ json }))

export const createQuizz = (json: QuizzValidated) =>
  unwrap(api.quizz.$post({ json }))

export const updateQuizz = ({
  id,
  json,
}: {
  id: string
  json: QuizzValidated
}) => unwrap(api.quizz[":id"].$patch({ param: { id }, json }))

export const deleteQuizz = (id: string) =>
  unwrapEmpty(api.quizz[":id"].$delete({ param: { id } }))

export const deleteResult = (id: string) =>
  unwrapEmpty(api.results[":id"].$delete({ param: { id } }))

export const createGame = (quizzId: string) =>
  unwrap(api.games.$post({ json: { quizzId } }))

export const updateGameSettings = ({
  gameId,
  json,
}: {
  gameId: string
  json: Partial<GameSettings>
}) => unwrap(api.games[":gameId"].settings.$patch({ param: { gameId }, json }))

export const authKeys = {
  status: ["auth", "status"] as const,
  me: ["auth", "me"] as const,
}

export const userKeys = {
  all: ["users"] as const,
  directory: ["users", "directory"] as const,
}

export const authStatusQuery = () =>
  queryOptions({
    queryKey: authKeys.status,
    queryFn: () => unwrap(api.auth.status.$get()),
  })

export const meQuery = () =>
  queryOptions({
    queryKey: authKeys.me,
    queryFn: () => unwrap(api.auth.me.$get()),
  })

export const usersQuery = () =>
  queryOptions({
    queryKey: userKeys.all,
    queryFn: () => unwrap(api.users.$get()),
  })

export const userDirectoryQuery = () =>
  queryOptions({
    queryKey: userKeys.directory,
    queryFn: () => unwrap(api.users.directory.$get()),
  })

export const managerLogin = (json: { username: string; password: string }) =>
  unwrap(api.auth.login.$post({ json }))

export const managerSetup = (json: {
  username: string
  password: string
  setupCode: string
}) => unwrap(api.auth.setup.$post({ json }))

export const changePassword = (json: {
  currentPassword: string
  newPassword: string
}) => unwrap(api.auth.password.$patch({ json }))

export const createUser = (json: {
  username: string
  password: string
  role: UserRole
  permissions: UserPermissions
}) => unwrap(api.users.$post({ json }))

export const updateUser = ({
  id,
  json,
}: {
  id: string
  json: { role?: UserRole; permissions?: UserPermissions }
}) => unwrap(api.users[":id"].$patch({ param: { id }, json }))

export const resetUserPassword = (id: string) =>
  unwrap(api.users[":id"]["reset-password"].$post({ param: { id }, json: {} }))

export const deleteUser = (id: string) =>
  unwrapEmpty(api.users[":id"].$delete({ param: { id } }))

export const updateQuizzAccess = ({
  id,
  json,
}: {
  id: string
  json: {
    visibility: QuizzVisibility
    viewers: string[]
    editors: string[]
    ownerId?: string
  }
}) => unwrap(api.quizz[":id"].access.$patch({ param: { id }, json }))

export const managerLogout = () => unwrap(api.auth.logout.$post())
