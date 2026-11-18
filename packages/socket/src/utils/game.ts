import type { Question } from "@razzia/common/types/game"
import type { Socket } from "@razzia/common/types/game/socket"
import { MAX_POINTS } from "@razzia/common/constants"
import Game from "@razzia/socket/services/game"
import Registry from "@razzia/socket/services/registry"
import { SECOND_MS } from "@razzia/socket/utils/sleep"
import { getClientId } from "@razzia/socket/utils/socket"

type GameCallback = (_game: Game) => void | Promise<void>

const resolveGame = (gameId: string | undefined): Game | undefined =>
  gameId ? Registry.getInstance().getGameById(gameId) : undefined

export const withManagerGame = (
  gameId: string | undefined,
  socket: Socket,
  callback: GameCallback,
): void => {
  const game = resolveGame(gameId)

  if (!game) {
    socket.emit("game:errorMessage", "errors:game.notFound")

    return
  }

  if (game.manager.clientId !== getClientId(socket)) {
    socket.emit("game:errorMessage", "errors:auth.unauthorized")

    return
  }

  callback(game)
}

export const withPlayerGame = (
  gameId: string | undefined,
  socket: Socket,
  callback: GameCallback,
): void => {
  const game = resolveGame(gameId)

  if (!game) {
    socket.emit("game:errorMessage", "errors:game.notFound")

    return
  }

  if (!game.players.some((p) => p.clientId === getClientId(socket))) {
    socket.emit("game:errorMessage", "errors:auth.unauthorized")

    return
  }

  callback(game)
}

export const createInviteCode = (length = 6) => {
  let result = ""
  const characters = "0123456789"
  const charactersLength = characters.length

  for (let i = 0; i < length; i += 1) {
    const randomIndex = Math.floor(Math.random() * charactersLength)
    result += characters.charAt(randomIndex)
  }

  return result
}

export const orderToPoint = (
  index: number,
  totalPlayers: number,
  maxPoints = MAX_POINTS,
): number => {
  if (totalPlayers <= 1) {
    return maxPoints
  }

  return Math.round(maxPoints - (index / (totalPlayers - 1)) * (maxPoints / 2))
}

export const timeToPoint = (startTime: number, question: Question): number => {
  const maxPoints = question.maxPoints ?? MAX_POINTS
  let points = maxPoints

  const actualTime = Date.now()
  const tempsPasseEnSecondes = (actualTime - startTime) / SECOND_MS

  points -= (maxPoints / question.time) * tempsPasseEnSecondes
  points = Math.max(0, points)

  return points
}

/**
 * Lets only `speedBonus` percent of the points depend on speed: the rest is
 * awarded in full to every right answer. 100 leaves the points as they are.
 */
export const applySpeedBonus = (
  points: number,
  maxPoints: number,
  speedBonus = 100,
): number => {
  const share = Math.min(100, Math.max(0, speedBonus)) / 100

  return maxPoints * (1 - share) + points * share
}

/** The players that get a top challenge: the best `percent` percent, at least one. */
export const topPlayers = <T extends { points: number }>(
  players: T[],
  percent: number,
): T[] => {
  const ranked = [...players].sort((a, b) => b.points - a.points)
  const count = Math.max(1, Math.ceil((players.length * percent) / 100))

  return ranked.slice(0, count)
}

export const shuffle = <T>(items: T[]): T[] => {
  const result = [...items]

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))

    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}
