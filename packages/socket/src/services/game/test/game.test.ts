import fs from "fs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Question, Quizz } from "@razzia/common/types/game"
import {
  EVENTS,
  NO_TIME_LIMIT,
  QUESTION_TYPES,
  QUIZZ_MODES,
  SCORING_MODES,
} from "@razzia/common/constants"
import { STATUS } from "@razzia/common/types/game/status"
import {
  getPath,
  getResultById,
  getResultsMeta,
} from "@razzia/socket/services/config"
import Game from "@razzia/socket/services/game"
import { createFakeIo } from "@razzia/socket/test/fake-io"
import {
  createEstimationQuestion,
  createQuestion,
  createQuizz,
} from "@razzia/socket/test/fixtures"

const FIRST_QUESTION_DELAY_MS = 5000
const NEXT_QUESTION_DELAY_MS = 2000
const TICK_MS = 1000

const MANAGER = "manager"

const setup = (quizz: Quizz, players = ["Alice", "Bob"]) => {
  const fake = createFakeIo()
  const game = new Game(fake.io, MANAGER, quizz)
  const manager = fake.createSocket(MANAGER)

  game.reconnect(manager)

  const sockets = players.map((username) => {
    const socket = fake.createSocket(username.toLowerCase())

    game.join(socket, username)

    return socket
  })

  const status = (room: string) => fake.lastStatus(room)

  const reachAnswers = async (question: Question, first = true) => {
    await vi.advanceTimersByTimeAsync(
      (first ? FIRST_QUESTION_DELAY_MS : NEXT_QUESTION_DELAY_MS) +
        question.cooldown * 1000,
    )

    expect(status(game.gameId)?.name).toBe(STATUS.SELECT_ANSWER)
  }

  const start = async () => {
    void game.start(manager)
    await reachAnswers(quizz.questions[0])
  }

  return { ...fake, game, manager, sockets, status, start, reachAnswers }
}

beforeEach(() => {
  fs.rmSync(getPath("results"), { recursive: true, force: true })
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("joining a game", () => {
  it("requires a username unless usernames are generated", () => {
    const { game, createSocket } = setup(createQuizz([createQuestion()]), [])

    expect(game.join(createSocket("a"))).toBe("errors:auth.usernameTooShort")

    game.updateSettings({ generatedUsernames: true })

    expect(game.join(createSocket("b"), "Ignored")).toBeNull()
    expect(game.players[0].username).not.toBe("Ignored")
  })

  it("refuses players once the game is locked", () => {
    const { game, createSocket, lastEvent } = setup(
      createQuizz([createQuestion()]),
      [],
    )

    game.setLocked(true)

    expect(lastEvent(MANAGER, EVENTS.MANAGER.LOCK_UPDATED)?.data).toBe(true)
    expect(game.join(createSocket("a"), "Alice")).toBe("errors:game.locked")
  })

  it("refuses the same client twice", () => {
    const { game, createSocket } = setup(createQuizz([createQuestion()]), [
      "Alice",
    ])

    expect(game.join(createSocket("other-socket", "alice"), "Alice")).toBe(
      "errors:game.playerAlreadyConnected",
    )
  })

  it("notifies the manager and the players", () => {
    const { game, lastEvent } = setup(createQuizz([createQuestion()]))

    expect(lastEvent(MANAGER, EVENTS.MANAGER.NEW_PLAYER)?.data).toMatchObject({
      username: "Bob",
    })
    expect(lastEvent(game.gameId, EVENTS.GAME.TOTAL_PLAYERS)?.data).toBe(2)
  })

  it("lets the manager kick a player", () => {
    const { game, lastEvent } = setup(createQuizz([createQuestion()]))

    game.kickPlayer("alice")

    expect(game.players.map((p) => p.username)).toEqual(["Bob"])
    expect(lastEvent("alice", EVENTS.GAME.RESET)?.data).toBe(
      "errors:game.kickedByManager",
    )
  })
})

describe("quiz flow", () => {
  it("refuses to start without players", async () => {
    const { game, manager, lastEvent } = setup(
      createQuizz([createQuestion()]),
      [],
    )

    await game.start(manager)

    expect(game.started).toBe(false)
    expect(lastEvent(MANAGER, EVENTS.GAME.ERROR_MESSAGE)?.data).toBe(
      "errors:game.noPlayersConnected",
    )
  })

  it("refuses to start when every player is away", async () => {
    const { game, manager, sockets, lastEvent } = setup(
      createQuizz([createQuestion()]),
    )

    for (const socket of sockets) {
      game.setPlayerDisconnected(socket.id)
    }

    await game.start(manager)

    expect(game.started).toBe(false)
    expect(game.players).toHaveLength(0)
    expect(lastEvent(MANAGER, EVENTS.GAME.ERROR_MESSAGE)?.data).toBe(
      "errors:game.noPlayersConnected",
    )
  })

  it("removes away players when the game starts", async () => {
    const { game, sockets, start, lastEvent } = setup(
      createQuizz([createQuestion()]),
    )
    const [alice, bob] = sockets

    game.setPlayerDisconnected(bob.id)
    await start()

    expect(game.players.map((player) => player.id)).toEqual([alice.id])
    expect(lastEvent(MANAGER, EVENTS.MANAGER.REMOVE_PLAYER)?.data).toBe(bob.id)
  })

  it("sends the question note to players with their result", async () => {
    const { game, sockets, status, start } = setup(
      createQuizz([createQuestion({ note: "Because of X." })]),
    )
    const [alice, bob] = sockets

    await start()
    game.selectAnswer(alice, [0])
    game.selectAnswer(bob, [1])
    await vi.advanceTimersByTimeAsync(TICK_MS)

    for (const player of ["alice", "bob"]) {
      expect(status(player)).toMatchObject({
        name: STATUS.SHOW_RESULT,
        data: { note: "Because of X." },
      })
    }
  })

  it("leaves the note out of the result when the question has none", async () => {
    const { game, sockets, status, start } = setup(
      createQuizz([createQuestion()]),
    )

    await start()
    game.selectAnswer(sockets[0], [0])
    game.selectAnswer(sockets[1], [1])
    await vi.advanceTimersByTimeAsync(TICK_MS)

    expect(status("alice")?.data).not.toHaveProperty("note", expect.any(String))
  })

  it("plays a full game and saves the result", async () => {
    const questions = [
      createQuestion({ solutions: [0] }),
      createQuestion({ solutions: [1] }),
    ]
    const { game, sockets, status, start, reachAnswers } = setup(
      createQuizz(questions),
    )
    const [alice, bob] = sockets

    await start()

    expect(game.updateSettings({ answersOnly: true })).toBe(false)

    game.selectAnswer(alice, [0])
    await vi.advanceTimersByTimeAsync(5000)
    game.selectAnswer(bob, [1])
    await vi.advanceTimersByTimeAsync(TICK_MS)

    expect(status("alice")).toMatchObject({
      name: STATUS.SHOW_RESULT,
      data: { correct: true, points: 1000, rank: 1, aheadOfMe: null },
    })
    expect(status("bob")).toMatchObject({
      name: STATUS.SHOW_RESULT,
      data: { correct: false, rank: 2, aheadOfMe: "Alice" },
    })
    expect(status(MANAGER)).toMatchObject({
      name: STATUS.SHOW_RESPONSES,
      data: { responses: { 0: 1, 1: 1 } },
    })

    game.advance()

    expect(status(MANAGER)?.name).toBe(STATUS.SHOW_LEADERBOARD)

    game.advance()
    await reachAnswers(questions[1], false)
    await vi.advanceTimersByTimeAsync(questions[1].time * 1000)

    expect(status("alice")?.data).toMatchObject({ correct: false })

    game.advance()

    expect(status(MANAGER)).toMatchObject({
      name: STATUS.FINISHED,
      data: { top: [{ username: "Alice", points: 1000 }, { username: "Bob" }] },
    })
    expect(status("bob")?.data).toMatchObject({ rank: 2 })
    expect(status("bob")?.data.top).toEqual([
      { username: "Alice", points: 1000 },
      { username: "Bob", points: 0 },
    ])
    expect(getResultsMeta().at(0)).toMatchObject({
      gameMode: QUIZZ_MODES.QUIZ,
      playerCount: 2,
    })
  })

  describe("ending the game early", () => {
    const twoQuestions = () => [
      createQuestion({ solutions: [0] }),
      createQuestion({ solutions: [1] }),
    ]

    it("shows the standings of the scored questions and saves the result", async () => {
      const questions = twoQuestions()
      const { game, sockets, status, start, reachAnswers } = setup(
        createQuizz(questions),
      )

      await start()
      game.selectAnswer(sockets[0], [0])
      await vi.advanceTimersByTimeAsync(5000)
      game.selectAnswer(sockets[1], [1])
      await vi.advanceTimersByTimeAsync(TICK_MS)
      game.advance()
      game.advance()
      await reachAnswers(questions[1], false)

      game.selectAnswer(sockets[1], [1])
      game.endEarly()

      expect(status(MANAGER)).toMatchObject({
        name: STATUS.FINISHED,
        data: {
          top: [{ username: "Alice", points: 1000 }, { username: "Bob" }],
        },
      })
      expect(status("bob")?.data).toMatchObject({ rank: 2 })
      expect(getResultsMeta().at(0)).toMatchObject({ playerCount: 2 })

      await vi.advanceTimersByTimeAsync(60 * TICK_MS)

      expect(status(MANAGER)?.name).toBe(STATUS.FINISHED)
      expect(game.started).toBe(false)
    })

    it("ends with every player at zero before a question was scored", async () => {
      const { game, status, start } = setup(createQuizz(twoQuestions()))

      await start()
      game.endEarly()

      expect(status(MANAGER)).toMatchObject({
        name: STATUS.FINISHED,
        data: { top: [{ points: 0 }, { points: 0 }] },
      })
      expect(status("alice")?.name).toBe(STATUS.FINISHED)
      expect(getResultsMeta()).toHaveLength(0)

      await vi.advanceTimersByTimeAsync(60 * TICK_MS)

      expect(status(MANAGER)?.name).toBe(STATUS.FINISHED)
    })

    it("can end while the intro is still playing", async () => {
      const { game, manager, status } = setup(createQuizz(twoQuestions()))

      void game.start(manager)
      await vi.advanceTimersByTimeAsync(TICK_MS)
      game.endEarly()
      await vi.advanceTimersByTimeAsync(60 * TICK_MS)

      expect(status(MANAGER)?.name).toBe(STATUS.FINISHED)
    })

    it("gives players a summary in a survey", async () => {
      const { game, status, start } = setup(
        createQuizz(twoQuestions(), QUIZZ_MODES.SURVEY),
      )

      await start()
      game.endEarly()

      expect(status(MANAGER)?.name).toBe(STATUS.SUMMARY)
      expect(status("alice")?.name).toBe(STATUS.SUMMARY)
    })

    it("does nothing in the lobby or after the game ended", () => {
      const { game, status } = setup(createQuizz(twoQuestions()))

      game.endEarly()

      expect(status(MANAGER)?.name).not.toBe(STATUS.FINISHED)
    })
  })

  it("lets the manager skip the remaining answer time", async () => {
    const { game, status, start } = setup(createQuizz([createQuestion()]))

    await start()
    game.advance()
    await vi.advanceTimersByTimeAsync(TICK_MS)

    expect(status(MANAGER)?.name).toBe(STATUS.SHOW_RESPONSES)
  })

  it("ignores answers sent outside of the answer phase", async () => {
    const { game, sockets, status, manager } = setup(
      createQuizz([createQuestion({ time: NO_TIME_LIMIT })]),
    )
    const [alice, bob] = sockets

    game.selectAnswer(alice, [0])
    void game.start(manager)
    await vi.advanceTimersByTimeAsync(FIRST_QUESTION_DELAY_MS)

    expect(status(game.gameId)?.name).toBe(STATUS.SHOW_QUESTION)

    game.selectAnswer(alice, [0])
    await vi.advanceTimersByTimeAsync(3000)

    expect(status(game.gameId)?.name).toBe(STATUS.SELECT_ANSWER)

    game.selectAnswer(bob, [0])
    game.advance()
    game.selectAnswer(alice, [0])
    await vi.advanceTimersByTimeAsync(TICK_MS)

    expect(status("bob")?.data).toMatchObject({ correct: true, points: 1000 })
    expect(status("alice")?.data).toMatchObject({ correct: false })
  })

  it("ends the round once every connected player answered", async () => {
    const { game, sockets, status, start } = setup(
      createQuizz([createQuestion()]),
    )
    const [alice, bob] = sockets

    await start()
    game.setPlayerDisconnected(bob.id)
    game.selectAnswer(alice, [0])
    await vi.advanceTimersByTimeAsync(TICK_MS)

    expect(status(MANAGER)?.name).toBe(STATUS.SHOW_RESPONSES)
  })

  it("ends the round when the last player left to answer leaves", async () => {
    const { game, sockets, status, start } = setup(
      createQuizz([createQuestion()]),
    )
    const [alice, bob] = sockets

    await start()
    game.selectAnswer(alice, [0])
    await vi.advanceTimersByTimeAsync(TICK_MS)

    expect(status(MANAGER)).toBeUndefined()

    game.setPlayerDisconnected(bob.id)
    await vi.advanceTimersByTimeAsync(TICK_MS)

    expect(status(MANAGER)?.name).toBe(STATUS.SHOW_RESPONSES)
  })

  it("only counts the first answer of a player", async () => {
    const { game, sockets, status, start } = setup(
      createQuizz([createQuestion({ solutions: [0] })]),
      ["Alice", "Bob"],
    )
    const [alice] = sockets

    await start()
    game.selectAnswer(alice, [1])
    game.selectAnswer(alice, [0])
    game.advance()
    await vi.advanceTimersByTimeAsync(TICK_MS)

    expect(status("alice")?.data).toMatchObject({ correct: false })
  })

  it("skips the leaderboard between questions of the same category", async () => {
    const questions = [
      createQuestion({ category: "Geography" }),
      createQuestion({ category: "Geography " }),
    ]
    const { game, status, start } = setup(createQuizz(questions))

    await start()
    game.advance()
    await vi.advanceTimersByTimeAsync(TICK_MS)
    game.advance()

    expect(status(game.gameId)?.name).toBe(STATUS.SHOW_PREPARED)
  })

  it("shows the score movement of the whole round", async () => {
    const questions = [
      createQuestion({ category: "Round 1" }),
      createQuestion({ category: "Round 1" }),
      createQuestion({ category: "Round 2" }),
    ]
    const { game, sockets, status, start, reachAnswers } = setup(
      createQuizz(questions),
    )
    const [alice, bob] = sockets

    await start()
    game.selectAnswer(alice, [0])
    game.advance()
    await vi.advanceTimersByTimeAsync(TICK_MS)
    game.advance()

    await reachAnswers(questions[1], false)
    game.selectAnswer(bob, [0])
    game.advance()
    await vi.advanceTimersByTimeAsync(TICK_MS)
    game.advance()

    expect(status(MANAGER)).toMatchObject({
      name: STATUS.SHOW_LEADERBOARD,
      data: {
        oldLeaderboard: [{ points: 0 }, { points: 0 }],
        leaderboard: [{ points: 1000 }, { points: 1000 }],
      },
    })
  })

  describe("rounds", () => {
    const ROUND_INTRO_MS = 4000

    it("opens a round with its name on its own background", async () => {
      const questions = [
        createQuestion({ round: { name: "Warm-up", background: "/r.png" } }),
      ]
      const quizz = { ...createQuizz(questions), background: "/quizz.png" }
      const { game, manager, status, lastEvent } = setup(quizz)

      void game.start(manager)
      await vi.advanceTimersByTimeAsync(3000)

      expect(status(game.gameId)).toMatchObject({
        name: STATUS.SHOW_ROUND,
        data: { name: "Warm-up", number: 1, total: 1 },
      })
      expect(lastEvent(game.gameId, EVENTS.GAME.STATUS)?.data).toMatchObject({
        background: "/r.png",
      })

      await vi.advanceTimersByTimeAsync(ROUND_INTRO_MS)

      expect(status(game.gameId)?.name).toBe(STATUS.SHOW_PREPARED)
    })

    it("keeps the first question's background out of sight before the round slide", async () => {
      const questions = [
        createQuestion({
          background: "/q1.png",
          round: { name: "Warm-up", background: "/r.png" },
        }),
      ]
      const quizz = { ...createQuizz(questions), background: "/quizz.png" }
      const { game, manager, lastEvent } = setup(quizz)

      void game.start(manager)

      expect(lastEvent(game.gameId, EVENTS.GAME.STATUS)?.data).toMatchObject({
        name: STATUS.SHOW_START,
        background: "/r.png",
      })

      await vi.advanceTimersByTimeAsync(3000)

      expect(lastEvent(game.gameId, EVENTS.GAME.STATUS)?.data).toMatchObject({
        name: STATUS.SHOW_ROUND,
        background: "/r.png",
      })

      await vi.advanceTimersByTimeAsync(ROUND_INTRO_MS)
      await vi.advanceTimersByTimeAsync(2000)

      expect(lastEvent(game.gameId, EVENTS.GAME.STATUS)?.data).toMatchObject({
        background: "/q1.png",
      })
    })

    it("falls back to the quizz background for the round slide", async () => {
      const questions = [createQuestion({ round: { name: "One" } })]
      const quizz = { ...createQuizz(questions), background: "/quizz.png" }
      const { game, manager, lastEvent } = setup(quizz)

      void game.start(manager)
      await vi.advanceTimersByTimeAsync(3000)

      expect(lastEvent(game.gameId, EVENTS.GAME.STATUS)?.data).toMatchObject({
        name: STATUS.SHOW_ROUND,
        background: "/quizz.png",
      })
    })

    it("starts a quizz without rounds on the countdown, with no title slide", async () => {
      const { game, manager, status } = setup(createQuizz([createQuestion()]))

      void game.start(manager)

      expect(status(game.gameId)).toMatchObject({
        name: STATUS.SHOW_START,
        data: { time: 3 },
      })

      await vi.advanceTimersByTimeAsync(3000)

      expect(status(game.gameId)?.name).toBe(STATUS.SHOW_PREPARED)
    })

    it("shows the full leaderboard with best streaks when a round ends", async () => {
      const questions = [
        createQuestion({ round: { name: "Round 1" } }),
        createQuestion(),
        createQuestion({ round: { name: "Round 2" } }),
      ]
      const names = ["A", "B", "C", "D", "E", "F", "G"]
      const { game, sockets, status, reachAnswers } = setup(
        createQuizz(questions),
        names,
      )

      void game.start(sockets[0])
      await vi.advanceTimersByTimeAsync(
        FIRST_QUESTION_DELAY_MS + ROUND_INTRO_MS + questions[0].cooldown * 1000,
      )
      expect(status(game.gameId)?.name).toBe(STATUS.SELECT_ANSWER)

      game.selectAnswer(sockets[0], [0])
      game.advance()
      await vi.advanceTimersByTimeAsync(TICK_MS)
      // The round is not over yet: the leaderboard is still shown after a question
      game.advance()
      await vi.advanceTimersByTimeAsync(TICK_MS)
      game.advance()

      await reachAnswers(questions[1], false)
      game.selectAnswer(sockets[0], [0])
      game.advance()
      await vi.advanceTimersByTimeAsync(TICK_MS)
      game.advance()

      const leaderboard = status(MANAGER)

      expect(leaderboard?.name).toBe(STATUS.SHOW_LEADERBOARD)
      const { leaderboard: ranking, round } = (leaderboard?.data ?? {}) as {
        leaderboard: Array<{
          username: string
          points: number
          bestStreak: number
        }>
        round?: { name: string }
      }

      expect(round).toEqual({ name: "Round 1" })
      expect(ranking).toHaveLength(names.length)
      expect(ranking[0]).toMatchObject({
        username: "A",
        points: 2000,
        bestStreak: 2,
      })

      game.advance()

      expect(status(game.gameId)).toMatchObject({
        name: STATUS.SHOW_ROUND,
        data: { name: "Round 2", number: 2, total: 2 },
      })
    })

    it("keeps the best streak when a wrong answer breaks the run", async () => {
      const questions = [
        createQuestion({ round: { name: "Round 1" } }),
        createQuestion(),
        createQuestion(),
        createQuestion({ round: { name: "Round 2" } }),
      ]
      const { game, sockets, status, reachAnswers } = setup(
        createQuizz(questions),
        ["Alice"],
      )

      void game.start(sockets[0])
      await vi.advanceTimersByTimeAsync(
        FIRST_QUESTION_DELAY_MS + ROUND_INTRO_MS + questions[0].cooldown * 1000,
      )

      const answer = async (index: number, choice: number, more: boolean) => {
        if (index > 0) {
          await reachAnswers(questions[index], false)
        }

        game.selectAnswer(sockets[0], [choice])
        game.advance()
        await vi.advanceTimersByTimeAsync(TICK_MS)
        game.advance()

        if (more) {
          await vi.advanceTimersByTimeAsync(TICK_MS)
          game.advance()
        }
      }

      await answer(0, 0, true)
      await answer(1, 0, true)
      await answer(2, 1, false)

      expect(status(MANAGER)?.data).toMatchObject({
        round: { name: "Round 1" },
        leaderboard: [{ bestStreak: 2, streak: 0 }],
      })
    })

    it("keeps the category behaviour inside a round", async () => {
      const questions = [
        createQuestion({ round: { name: "Round 1" }, category: "Geography" }),
        createQuestion({ category: "Geography" }),
      ]
      const { game, sockets, status } = setup(createQuizz(questions))

      void game.start(sockets[0])
      await vi.advanceTimersByTimeAsync(
        FIRST_QUESTION_DELAY_MS + ROUND_INTRO_MS + questions[0].cooldown * 1000,
      )
      game.advance()
      await vi.advanceTimersByTimeAsync(TICK_MS)
      game.advance()

      expect(status(game.gameId)?.name).toBe(STATUS.SHOW_PREPARED)
    })
  })

  it("scores by answer order when there is no time limit", async () => {
    const { game, sockets, status, start } = setup(
      createQuizz([createQuestion({ time: NO_TIME_LIMIT })]),
    )
    const [alice, bob] = sockets

    await start()
    await vi.advanceTimersByTimeAsync(60_000)
    game.selectAnswer(bob, [0])
    game.selectAnswer(alice, [0])
    await vi.advanceTimersByTimeAsync(TICK_MS)

    expect(status("bob")?.data).toMatchObject({ points: 1000 })
    expect(status("alice")?.data).toMatchObject({ points: 500 })
  })

  it("clamps estimations to the range and ignores invalid ones", async () => {
    const { game, sockets, status, start } = setup(
      createQuizz([createEstimationQuestion()]),
    )
    const [alice, bob] = sockets

    await start()
    game.selectAnswer(alice, [500])
    game.selectAnswer(bob, [Number.NaN])

    expect(status("alice")?.name).toBe(STATUS.WAIT)
    expect(status("bob")).toBeUndefined()

    game.advance()
    await vi.advanceTimersByTimeAsync(TICK_MS)

    expect(status(MANAGER)?.data).toMatchObject({ responses: { 100: 1 } })
  })

  it("advances automatically when enabled", async () => {
    const { game, status, start, events } = setup(
      createQuizz([createQuestion(), createQuestion()]),
    )

    game.updateSettings({
      autoAdvance: { enable: true, responsesDelay: 3, leaderboardDelay: 3 },
    })

    await start()
    game.advance()
    await vi.advanceTimersByTimeAsync(TICK_MS)

    expect(status(MANAGER)?.name).toBe(STATUS.SHOW_RESPONSES)
    expect(events(MANAGER, EVENTS.MANAGER.AUTO_ADVANCE).at(-1)?.data).toEqual({
      seconds: 3,
      total: 3,
    })

    await vi.advanceTimersByTimeAsync(3000)

    expect(status(MANAGER)?.name).toBe(STATUS.SHOW_LEADERBOARD)
  })
})

describe("game result", () => {
  it("records the real correctness and points of every answer", async () => {
    const question = createQuestion({
      type: QUESTION_TYPES.MULTI,
      solutions: [0, 1],
      penalty: 100,
      options: { scoringMode: SCORING_MODES.STRICT },
    })
    const { game, sockets, start } = setup(createQuizz([question]), [
      "Alice",
      "Bob",
      "Carol",
    ])
    const [alice, bob] = sockets

    await start()
    game.selectAnswer(alice, [0])
    game.selectAnswer(bob, [0, 1])
    game.advance()
    await vi.advanceTimersByTimeAsync(TICK_MS)
    game.advance()

    const [meta] = getResultsMeta()

    expect(getResultById(meta.id).questions[0].playerAnswers).toEqual([
      { playerName: "Alice", answerIds: [0], correct: false, points: -100 },
      { playerName: "Bob", answerIds: [0, 1], correct: true, points: 1000 },
      { playerName: "Carol", answerIds: null, correct: false, points: 0 },
    ])
  })
})

describe("survey flow", () => {
  it("collects answers without scoring them", async () => {
    const quizz = createQuizz(
      [createQuestion({ solutions: undefined })],
      QUIZZ_MODES.SURVEY,
    )
    const { game, sockets, status, start } = setup(quizz)
    const [alice, bob] = sockets

    await start()
    game.selectAnswer(alice, [2])
    game.selectAnswer(bob, [2])
    await vi.advanceTimersByTimeAsync(TICK_MS)

    expect(status("alice")?.name).toBe(STATUS.WAIT)
    expect(status(MANAGER)).toMatchObject({
      name: STATUS.SHOW_RESPONSES,
      data: { responses: { 2: 2 } },
    })

    game.advance()

    expect(status(MANAGER)).toMatchObject({
      name: STATUS.SUMMARY,
      data: { totalPlayers: 2, totalQuestions: 1 },
    })
    expect(getResultsMeta().at(0)?.gameMode).toBe(QUIZZ_MODES.SURVEY)
  })
})

describe("player connection updates", () => {
  it("tells the manager when a player's connection times out", () => {
    const { game, sockets, lastEvent } = setup(createQuizz([createQuestion()]))
    const [alice] = sockets

    game.setPlayerDisconnected(alice.id, true)

    expect(
      lastEvent(MANAGER, EVENTS.MANAGER.PLAYER_UPDATED)?.data,
    ).toMatchObject({
      previousId: alice.id,
      player: { id: alice.id, connected: false },
      timedOut: true,
    })
  })

  it("tells the manager when a player comes back on a new socket", () => {
    const { game, sockets, createSocket, lastEvent } = setup(
      createQuizz([createQuestion()]),
    )
    const [alice] = sockets

    game.setPlayerDisconnected(alice.id)
    game.reconnect(createSocket("alice-new", "alice"))

    expect(
      lastEvent(MANAGER, EVENTS.MANAGER.PLAYER_UPDATED)?.data,
    ).toMatchObject({
      previousId: alice.id,
      player: { id: "alice-new", connected: true },
      timedOut: false,
    })
  })

  it("only counts connected players in the lobby", () => {
    const { game, sockets, createSocket, lastEvent } = setup(
      createQuizz([createQuestion()]),
    )
    const [alice] = sockets

    game.setPlayerDisconnected(alice.id)

    expect(lastEvent(game.gameId, EVENTS.GAME.TOTAL_PLAYERS)?.data).toBe(1)

    game.reconnect(createSocket("alice-new", "alice"))

    expect(lastEvent(game.gameId, EVENTS.GAME.TOTAL_PLAYERS)?.data).toBe(2)
  })

  it("keeps counting away players once the game started", async () => {
    const { game, sockets, start, lastEvent } = setup(
      createQuizz([createQuestion()]),
    )
    const [alice] = sockets

    await start()
    game.setPlayerDisconnected(alice.id)

    expect(lastEvent(game.gameId, EVENTS.GAME.TOTAL_PLAYERS)?.data).toBe(2)
  })
})

describe("reconnection", () => {
  it("restores a disconnected player on a new socket", async () => {
    const { game, sockets, start, createSocket, lastEvent } = setup(
      createQuizz([createQuestion()]),
    )
    const [alice] = sockets

    await start()
    game.setPlayerDisconnected(alice.id)

    const newSocket = createSocket("alice-new", "alice")

    game.reconnect(newSocket)

    expect(game.players[0]).toMatchObject({ id: "alice-new", connected: true })
    expect(
      lastEvent("alice-new", EVENTS.PLAYER.SUCCESS_RECONNECT)?.data,
    ).toMatchObject({
      currentQuestion: { current: 1, total: 1 },
      status: { name: STATUS.SELECT_ANSWER },
    })
  })

  it("lets a player take over a connection not closed yet", async () => {
    const { game, sockets, start, createSocket, lastEvent, disconnected } =
      setup(createQuizz([createQuestion()]))
    const [alice] = sockets

    await start()
    game.reconnect(createSocket("alice-new", "alice"))

    expect(game.players[0]).toMatchObject({ id: "alice-new", connected: true })
    expect(
      lastEvent("alice-new", EVENTS.PLAYER.SUCCESS_RECONNECT),
    ).toBeDefined()
    expect(disconnected).toEqual([alice.id])
  })

  it("keeps the answer of a player who reconnects before the result", async () => {
    const { game, sockets, start, createSocket, status } = setup(
      createQuizz([createQuestion({ solutions: [0] })]),
    )
    const [alice] = sockets

    await start()
    game.selectAnswer(alice, [0])
    game.setPlayerDisconnected(alice.id)
    game.reconnect(createSocket("alice-new", "alice"))
    game.advance()
    await vi.advanceTimersByTimeAsync(TICK_MS)

    expect(status("alice-new")?.data).toMatchObject({ correct: true })
  })

  it("refuses a second answer after a reconnection", async () => {
    const { game, sockets, start, createSocket, status } = setup(
      createQuizz([createQuestion({ solutions: [0] })]),
    )
    const [alice] = sockets

    await start()
    game.selectAnswer(alice, [0])

    const aliceNew = createSocket("alice-new", "alice")

    game.reconnect(aliceNew)
    game.selectAnswer(aliceNew, [1])
    game.advance()
    await vi.advanceTimersByTimeAsync(TICK_MS)

    expect(status("alice-new")?.data).toMatchObject({ correct: true })
  })

  it("hands the game over to the latest manager connection", () => {
    const { game, createSocket, lastEvent, disconnected } = setup(
      createQuizz([createQuestion()]),
    )

    game.reconnect(createSocket("manager-tab-2", MANAGER))

    expect(game.manager).toMatchObject({ id: "manager-tab-2", connected: true })
    expect(
      lastEvent("manager-tab-2", EVENTS.MANAGER.SUCCESS_RECONNECT),
    ).toBeDefined()
    expect(lastEvent(MANAGER, EVENTS.GAME.RESET)?.data).toBe(
      "errors:game.managerAlreadyConnected",
    )
    expect(disconnected).toEqual([MANAGER])
  })
})

describe("manager grace period", () => {
  const GRACE_MS = 30_000

  it("closes the lobby when the manager does not come back in time", async () => {
    const { game } = setup(createQuizz([createQuestion()]))
    const onTimeout = vi.fn()

    game.setManagerDisconnected()
    game.waitForManager(onTimeout)
    await vi.advanceTimersByTimeAsync(GRACE_MS - TICK_MS)

    expect(onTimeout).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(TICK_MS)

    expect(onTimeout).toHaveBeenCalledOnce()
  })

  it("keeps the lobby when the manager comes back in time", async () => {
    const { game, createSocket } = setup(createQuizz([createQuestion()]))
    const onTimeout = vi.fn()

    game.setManagerDisconnected()
    game.waitForManager(onTimeout)
    await vi.advanceTimersByTimeAsync(GRACE_MS / 2)
    game.reconnect(createSocket("manager-new", MANAGER))
    await vi.advanceTimersByTimeAsync(GRACE_MS)

    expect(onTimeout).not.toHaveBeenCalled()
  })
})

describe("backgrounds", () => {
  const photo = { type: "image", url: "/media/photo.png" } as const

  it("prefers the question background over the quizz background", async () => {
    const quizz = {
      ...createQuizz([
        createQuestion({ background: "/media/q1.png" }),
        createQuestion(),
      ]),
      background: "/media/quizz.png",
    }
    const { start, lastEvent, game, reachAnswers } = setup(quizz)

    await start()

    expect(lastEvent(game.gameId, EVENTS.GAME.STATUS)?.data).toMatchObject({
      background: "/media/q1.png",
    })

    game.advance()
    await vi.advanceTimersByTimeAsync(TICK_MS)
    game.advance()
    await vi.advanceTimersByTimeAsync(TICK_MS)
    game.advance()
    await reachAnswers(quizz.questions[1], false)

    expect(lastEvent(game.gameId, EVENTS.GAME.STATUS)?.data).toMatchObject({
      background: "/media/quizz.png",
    })
  })

  it("hides the small image when it is the background", async () => {
    const { start, lastEvent, game } = setup(
      createQuizz([createQuestion({ media: photo, background: photo.url })]),
    )

    await start()

    const data = lastEvent(game.gameId, EVENTS.GAME.STATUS)?.data as {
      data: { media?: unknown }
    }

    expect(data.data.media).toBeUndefined()
  })

  it("keeps the small image when the background is another image", async () => {
    const { start, lastEvent, game } = setup(
      createQuizz([
        createQuestion({ media: photo, background: "/media/other.png" }),
      ]),
    )

    await start()

    const data = lastEvent(game.gameId, EVENTS.GAME.STATUS)?.data as {
      data: { media?: unknown }
    }

    expect(data.data.media).toEqual(photo)
  })
})
