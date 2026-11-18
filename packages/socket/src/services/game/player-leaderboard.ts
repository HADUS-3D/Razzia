import type { Player } from "@razzia/common/types/game"
import type { PlayerLeaderboardRow } from "@razzia/common/types/game/status"

const TOP = 5

/** The positions worth showing in a ranking: the top, and the player with its neighbours. */
const visibleIds = (ranking: Player[], playerId: string): Set<string> => {
  const ids = new Set(ranking.slice(0, TOP).map((p) => p.id))
  const index = ranking.findIndex((p) => p.id === playerId)

  if (index >= 0) {
    for (const p of ranking.slice(Math.max(0, index - 1), index + 2)) {
      ids.add(p.id)
    }
  }

  return ids
}

/**
 * The rows for one player's leaderboard: everyone who is in the top 5 or next
 * to the player, before or after the last question, so the screen can animate
 * from the old order to the new one.
 */
export const buildPlayerLeaderboard = (
  oldRanking: Player[],
  newRanking: Player[],
  playerId: string,
): PlayerLeaderboardRow[] => {
  const ids = new Set([
    ...visibleIds(oldRanking, playerId),
    ...visibleIds(newRanking, playerId),
  ])

  return newRanking
    .map((player, index): PlayerLeaderboardRow | null => {
      if (!ids.has(player.id)) {
        return null
      }

      const oldIndex = oldRanking.findIndex((p) => p.id === player.id)

      return {
        id: player.id,
        username: player.username,
        points: player.points,
        oldPoints: oldIndex >= 0 ? oldRanking[oldIndex].points : 0,
        rank: index + 1,
        oldRank: oldIndex >= 0 ? oldIndex + 1 : newRanking.length,
        me: player.id === playerId,
      }
    })
    .filter((row): row is PlayerLeaderboardRow => row !== null)
}
