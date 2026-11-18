import { describe, expect, it } from "vitest"
import type { Player } from "@razzia/common/types/game"
import { buildPlayerLeaderboard } from "@razzia/socket/services/game/player-leaderboard"

const player = (n: number, points: number): Player => ({
  id: `p${n}`,
  clientId: `c${n}`,
  connected: true,
  username: `Player ${n}`,
  points,
  streak: 0,
  bestStreak: 0,
})

const ranking = (points: number[]) => points.map((p, i) => player(i + 1, p))

describe("buildPlayerLeaderboard", () => {
  it("shows the top 5 plus the player and its neighbours", () => {
    const board = ranking([90, 80, 70, 60, 50, 40, 30, 20, 10, 0])
    const rows = buildPlayerLeaderboard(board, board, "p8")

    expect(rows.map((r) => r.id)).toEqual([
      "p1",
      "p2",
      "p3",
      "p4",
      "p5",
      "p7",
      "p8",
      "p9",
    ])
    expect(rows.find((r) => r.me)?.rank).toBe(8)
  })

  it("keeps old and new positions so the screen can animate", () => {
    const before = ranking([50, 40, 30])
    const after = [
      { ...before[2], points: 60 },
      { ...before[0], points: 50 },
      { ...before[1], points: 40 },
    ]
    const rows = buildPlayerLeaderboard(before, after, "p3")
    const me = rows.find((r) => r.me)

    expect(me).toMatchObject({ rank: 1, oldRank: 3, points: 60, oldPoints: 30 })
  })

  it("works for a player who is not on the board", () => {
    const board = ranking([30, 20])

    expect(buildPlayerLeaderboard(board, board, "nobody")).toHaveLength(2)
  })
})
