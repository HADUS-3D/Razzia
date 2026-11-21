import { nanoid } from "nanoid"
import type {
  Answer,
  GameResult,
  GameSettings,
  GameUpdateQuestion,
  PinPosition,
  Player,
  Question,
  QuestionMedia,
  PlayerQuestionOptions,
  QuestionResult,
  Quizz,
  QuizzMode,
  ResolvedSounds,
} from "@razzia/common/types/game"
import type { Server, Socket } from "@razzia/common/types/game/socket"
import { isSameImage } from "@razzia/common/background"
// oxlint-disable typescript/no-unnecessary-condition
import {
  EVENTS,
  MAX_POINTS,
  MEDIA_TYPES,
  NO_TIME_LIMIT,
  PIN_MODES,
  PUZZLE_GROUPS,
  QUIZZ_MODES,
} from "@razzia/common/constants"
import { introDetails, introSections } from "@razzia/common/questions/intro"
import {
  isEstimationOptions,
  isPinOptions,
  isPuzzleOptions,
} from "@razzia/common/questions/options"
import {
  isPinPositionValid,
  pinDistanceTo,
  scorePin,
} from "@razzia/common/questions/pin"
import {
  matchPuzzleTexts,
  puzzleGroupWords,
  solvedPuzzleGroups,
} from "@razzia/common/questions/puzzle"
import {
  type PinResponse,
  type Status,
  STATUS,
  type StatusDataMap,
} from "@razzia/common/types/game/status"
import { CooldownTimer } from "@razzia/socket/services/game/cooldown-timer"
import { buildPlayerLeaderboard } from "@razzia/socket/services/game/player-leaderboard"
import { PlayerManager } from "@razzia/socket/services/game/player-manager"
import {
  countAnswers,
  scoreQuestion,
  type ScoredPlayer,
} from "@razzia/socket/services/scoring/round"
import { getSettings as getAppSettings } from "@razzia/socket/services/settings"
import {
  applySpeedBonus,
  orderToPoint,
  shuffle,
  timeToPoint,
  topPlayers,
} from "@razzia/socket/utils/game"
import sleep, { SECOND_MS } from "@razzia/socket/utils/sleep"

type BroadcastFn = <T extends Status>(
  _status: T,
  _data: StatusDataMap[T],
) => void
type SendFn = <T extends Status>(
  _target: string,
  _status: T,
  _data: StatusDataMap[T],
) => void

export interface RoundManagerOptions {
  quizz: Quizz
  players: PlayerManager
  cooldown: CooldownTimer
  io: Server
  gameId: string
  getManagerId: () => string
  broadcast: BroadcastFn
  send: SendFn
  onNewQuestion: () => void
  onGameFinished: (_result: GameResult) => void
  getSettings: () => GameSettings
}

/** What a player sends along with the answer keys: typed texts (puzzle) or a pin. */
export interface AnswerExtra {
  answerTexts?: string[]
  pin?: PinPosition
}

const ROUND_INTRO_SECONDS = 4

type PuzzleResult = NonNullable<StatusDataMap["SHOW_RESULT"]["puzzle"]>

interface RoundStep {
  name: string
  gameModes: QuizzMode[]
  skip?: () => boolean
  enter: () => void
  delay: (_settings: GameSettings) => number
}

export class RoundManager {
  private readonly opts: RoundManagerOptions
  private readonly steps: RoundStep[]
  private started = false
  /** The intro slide is showing; the host's click starts the countdown. */
  private awaitingIntro = false
  /** Ids of the players that marked the intro as read. */
  private introRead = new Set<string>()
  private currentQuestion = 0
  private currentStep = -1
  private playersAnswers: Answer[] = []
  private startTime = 0
  private acceptingAnswers = false
  private leaderboard: Player[] = []
  private tempOldLeaderboard: Player[] | null = null
  private questionsHistory: QuestionResult[] = []
  private autoAdvanceTimer: NodeJS.Timeout | null = null
  /** Ids of the players asked the current top challenge; null for a normal question. */
  private challengeIds: Set<string> | null = null

  constructor(opts: RoundManagerOptions) {
    this.opts = opts

    const steps: RoundStep[] = [
      {
        name: "reveal",
        gameModes: [QUIZZ_MODES.QUIZ, QUIZZ_MODES.SURVEY],
        enter: () => {
          this.showResults()
        },
        delay: (settings) => settings.autoAdvance.responsesDelay,
      },
      {
        name: "leaderboard",
        gameModes: [QUIZZ_MODES.QUIZ],
        skip: () =>
          this.isLastQuestion() ||
          (!this.startsRoundNext() && this.isSameCategoryNext()),
        enter: () => {
          this.showLeaderboard()
        },
        delay: (settings) => settings.autoAdvance.leaderboardDelay,
      },
    ]

    this.steps = steps.filter((step) =>
      step.gameModes.includes(opts.quizz.gameMode),
    )
  }

  isStarted(): boolean {
    return this.started
  }

  private get question(): Question {
    return this.opts.quizz.questions[this.currentQuestion]
  }

  /**
   * Background for the current moment: the question's own, else the quizz's.
   * Before the game starts only the quizz background applies.
   */
  get background(): string | undefined {
    if (!this.started) {
      return this.opts.quizz.background
    }

    return this.question.background ?? this.opts.quizz.background
  }

  /**
   * The sounds for the current moment: music and the end-of-answer effect from
   * the question, then the quizz, then the app; the ranking sounds and the
   * volume from the quizz and the app.
   */
  get sounds(): ResolvedSounds {
    const app = getAppSettings().sounds
    const quizz = this.opts.quizz.sounds
    const question = this.started ? this.question.sounds : undefined

    return {
      music: question?.music ?? quizz?.music ?? app?.music,
      answerEnd: question?.answerEnd ?? quizz?.answerEnd ?? app?.answerEnd,
      leaderboard: quizz?.leaderboard ?? app?.leaderboard,
      podium: quizz?.podium ?? app?.podium,
      volume: app?.volume,
    }
  }

  /** The ranking screens fall back to the quizz background. */
  backgroundFor(status: Status): string | undefined {
    // The countdown that leads into a round already wears the round's
    // background, so the first question's own image never shows before it.
    if (status === STATUS.SHOW_INTRO) {
      return this.opts.quizz.background
    }

    const opensRound =
      status === STATUS.SHOW_ROUND ||
      (status === STATUS.SHOW_START && this.question.round)

    if (opensRound) {
      return this.question.round?.background ?? this.opts.quizz.background
    }

    const ranking: Status[] = [
      STATUS.SHOW_LEADERBOARD,
      STATUS.SHOW_PLAYER_LEADERBOARD,
      STATUS.FINISHED,
      STATUS.SUMMARY,
    ]

    return ranking.includes(status)
      ? this.opts.quizz.background
      : this.background
  }

  /** An image that already serves as the background needs no small copy. */
  private get questionImage(): QuestionMedia | undefined {
    const { media, background } = this.question

    return media?.type === MEDIA_TYPES.IMAGE &&
      isSameImage(media.url, background)
      ? undefined
      : media
  }

  private isAskingQuestion(): boolean {
    return this.currentStep < 0
  }

  private isLastQuestion(): boolean {
    return !this.opts.quizz.questions[this.currentQuestion + 1]
  }

  private isSameCategoryNext(): boolean {
    const category = this.question.category?.trim()
    const next = this.opts.quizz.questions[this.currentQuestion + 1]

    return Boolean(category) && next?.category?.trim() === category
  }

  private startsRoundNext(): boolean {
    return Boolean(this.opts.quizz.questions[this.currentQuestion + 1]?.round)
  }

  /** The round the current question belongs to, with its position in the quizz. */
  private roundInfo(): { name: string; number: number; total: number } | null {
    const { questions } = this.opts.quizz
    const total = questions.filter((question) => question.round).length
    const upToNow = questions
      .slice(0, this.currentQuestion + 1)
      .filter((question) => question.round)

    const name = upToNow.at(-1)?.round?.name

    return name ? { name, number: upToNow.length, total } : null
  }

  /** The name of the round that the current question closes, if it does. */
  private endedRound(): string | undefined {
    return this.startsRoundNext() ? this.roundInfo()?.name : undefined
  }

  private isSurvey(): boolean {
    return this.opts.quizz.gameMode === QUIZZ_MODES.SURVEY
  }

  // ── Auto advance ─────────────────────────────────────────────────────────

  clearAutoAdvance(): void {
    if (!this.autoAdvanceTimer) {
      return
    }

    clearInterval(this.autoAdvanceTimer)
    this.autoAdvanceTimer = null
    this.emitAutoAdvance(null)
  }

  private emitAutoAdvance(state: { seconds: number; total: number } | null) {
    this.opts.io
      .to(this.opts.getManagerId())
      .emit(EVENTS.MANAGER.AUTO_ADVANCE, state)
  }

  private scheduleAutoAdvance(delay: number): void {
    this.clearAutoAdvance()

    if (!this.opts.getSettings().autoAdvance.enable) {
      return
    }

    let remaining = delay

    this.emitAutoAdvance({ seconds: remaining, total: delay })

    this.autoAdvanceTimer = setInterval(() => {
      remaining -= 1

      if (remaining > 0) {
        this.emitAutoAdvance({ seconds: remaining, total: delay })

        return
      }

      this.clearAutoAdvance()
      this.advance()
    }, SECOND_MS)
  }

  // ── Flow ─────────────────────────────────────────────────────────────────

  getReconnectInfo(): GameUpdateQuestion | null {
    if (!this.started) {
      return null
    }

    return {
      current: this.currentQuestion + 1,
      total: this.opts.quizz.questions.length,
    }
  }

  async start(socket: Socket): Promise<void> {
    if (this.started) {
      return
    }

    if (this.opts.players.count() === 0) {
      socket.emit(EVENTS.GAME.ERROR_MESSAGE, "errors:game.noPlayersConnected")

      return
    }

    this.started = true

    if (this.opts.quizz.intro) {
      this.awaitingIntro = true
      this.introRead.clear()
      const totalPlayers = this.opts.players.joinedCount()

      this.opts.broadcast(STATUS.SHOW_INTRO, {
        sections: introSections(this.opts.quizz.questions),
        details: introDetails(this.opts.quizz.questions, totalPlayers),
        totalPlayers,
      })

      return
    }

    await this.countdownToFirstQuestion()
  }

  private async countdownToFirstQuestion(): Promise<void> {
    this.opts.broadcast(STATUS.SHOW_START, { time: 3 })
    this.opts.io.to(this.opts.gameId).emit(EVENTS.GAME.START_COOLDOWN)
    await this.opts.cooldown.start(3)

    if (!this.started) {
      return
    }

    void this.newQuestion()
  }

  advance(): void {
    if (!this.started) {
      return
    }

    this.clearAutoAdvance()

    if (this.awaitingIntro) {
      this.awaitingIntro = false
      void this.countdownToFirstQuestion()

      return
    }

    if (this.isAskingQuestion()) {
      this.acceptingAnswers = false
      this.opts.cooldown.abort()

      return
    }

    this.runStep(this.currentStep + 1)
  }

  /**
   * Ends a running game before the last question. The question that is being
   * asked is dropped; the standings of the questions already scored count.
   */
  endEarly(): void {
    if (!this.started) {
      return
    }

    this.awaitingIntro = false
    this.acceptingAnswers = false
    this.playersAnswers = []
    this.opts.cooldown.abort()

    if (!this.isSurvey() && this.leaderboard.length === 0) {
      this.leaderboard = this.opts.players.getAll()
    }

    this.finish()
  }

  private runStep(index: number): void {
    const step = this.steps[index]

    if (!step) {
      this.nextQuestion()

      return
    }

    if (step.skip?.()) {
      this.runStep(index + 1)

      return
    }

    this.currentStep = index
    step.enter()
    this.scheduleAutoAdvance(step.delay(this.opts.getSettings()))
  }

  private nextQuestion(): void {
    if (this.isLastQuestion()) {
      this.finish()

      return
    }

    this.currentQuestion += 1
    void this.newQuestion()
  }

  private async newQuestion(): Promise<void> {
    if (!this.started) {
      return
    }

    this.currentStep = -1

    this.opts.onNewQuestion()

    this.opts.io.to(this.opts.gameId).emit(EVENTS.GAME.UPDATE_QUESTION, {
      current: this.currentQuestion + 1,
      total: this.opts.quizz.questions.length,
    })

    if (this.question.round) {
      this.opts.broadcast(STATUS.SHOW_ROUND, {
        name: this.question.round.name,
        number: this.roundInfo()?.number ?? 1,
        total: this.roundInfo()?.total ?? 1,
      })

      await sleep(ROUND_INTRO_SECONDS)

      if (!this.started) {
        return
      }
    }

    this.challengeIds = this.pickChallenge()

    this.opts.broadcast(STATUS.SHOW_PREPARED, {
      totalAnswers: this.question.answers.length,
      questionNumber: this.currentQuestion + 1,
      questionType: this.question.type,
    })

    await sleep(2)

    if (!this.started) {
      return
    }

    const imageMedia =
      this.questionImage?.type === MEDIA_TYPES.IMAGE
        ? this.questionImage
        : undefined

    this.toAudience(STATUS.SHOW_QUESTION, {
      question: this.question.question,
      media: imageMedia,
      cooldown: this.question.cooldown,
    })

    await sleep(this.question.cooldown)

    if (!this.started) {
      return
    }

    this.startTime = Date.now()
    this.acceptingAnswers = true

    // A puzzle's words are shuffled. The solutions of a puzzle and of a pin
    // question stay on the server.
    const isPuzzle = isPuzzleOptions(this.question.options)

    this.toAudience(STATUS.SELECT_ANSWER, {
      question: this.question.question,
      answers: isPuzzle
        ? shuffle(this.question.answers)
        : this.question.answers,
      media: this.questionImage,
      time: this.question.time,
      totalPlayer: this.opts.players.count(),
      questionType: this.question.type,
      options: this.publicOptions(),
      answersOnly: this.opts.getSettings().answersOnly,
    })

    await this.opts.cooldown.start(this.question.time)

    this.acceptingAnswers = false

    if (!this.started) {
      return
    }

    this.runStep(0)
  }

  /** The best players of the leaderboard, when the current question is a top challenge. */
  private pickChallenge(): Set<string> | null {
    const { topPercent } = this.question

    if (!topPercent || this.isSurvey()) {
      return null
    }

    return new Set(
      topPlayers(this.opts.players.getAll(), topPercent).map(({ id }) => id),
    )
  }

  /**
   * Sends a status to everyone, or, for a top challenge, only to the players
   * asked. The manager sees the question and what is at stake, without the
   * answers; the other players see a waiting screen. The answers stay on the
   * challenged players' devices.
   */
  private toAudience<
    T extends typeof STATUS.SHOW_QUESTION | typeof STATUS.SELECT_ANSWER,
  >(status: T, data: StatusDataMap[T]): void {
    if (!this.challengeIds) {
      this.opts.broadcast(status, data)

      return
    }

    const waiting = { text: "game:topChallengeWaiting" }

    this.opts.send(
      this.opts.getManagerId(),
      STATUS.SHOW_CHALLENGE,
      this.challengeScreen(status === STATUS.SELECT_ANSWER),
    )

    this.opts.players.getAll().forEach((player) => {
      if (this.challengeIds?.has(player.id)) {
        this.opts.send(player.id, status, data)

        return
      }

      this.opts.send(player.id, STATUS.WAIT, waiting)
    })
  }

  /** The big screen of a top challenge: the question, who is asked and what is at stake. */
  private challengeScreen(
    answering: boolean,
  ): StatusDataMap[typeof STATUS.SHOW_CHALLENGE] {
    const { question, topPercent, penalty, penaltyPercent } = this.question
    const asked = this.opts.players
      .getAll()
      .filter((player) => this.challengeIds?.has(player.id))
    const imageMedia =
      this.questionImage?.type === MEDIA_TYPES.IMAGE
        ? this.questionImage
        : undefined

    return {
      question,
      media: imageMedia,
      cooldown: this.question.cooldown,
      time: this.question.time,
      answering,
      challenge: {
        percent: topPercent ?? 0,
        count: asked.length,
        total: this.opts.players.count(),
        names: asked.map((player) => player.username),
        penalty: (() => {
          if (penaltyPercent) {
            return { kind: "percent" as const, value: penaltyPercent }
          }

          return penalty ? { kind: "points" as const, value: penalty } : null
        })(),
      },
    }
  }

  // ── Steps ────────────────────────────────────────────────────────────────

  private recordHistory(players: Player[], scored: ScoredPlayer[] = []): void {
    this.questionsHistory.push({
      ...this.question,
      solutions: this.isSurvey() ? undefined : this.question.solutions,
      playerAnswers: players.map((player) => {
        const score = scored.find((s) => s.id === player.id)

        return {
          playerName: player.username,
          answerIds:
            this.playersAnswers.find((a) => a.playerId === player.id)
              ?.answerIds ?? null,
          answerTexts: this.playersAnswers.find((a) => a.playerId === player.id)
            ?.answerTexts,
          pin: this.pinRecord(player.id),
          ...(score && {
            correct: score.lastCorrect,
            points: score.lastPoints,
          }),
        }
      }),
    })
  }

  private showResults(): void {
    const currentPlayers = this.opts.players.getAll()
    const answerCounts = countAnswers(this.playersAnswers)

    if (this.isSurvey()) {
      this.opts.send(this.opts.getManagerId(), STATUS.SHOW_RESPONSES, {
        ...this.question,
        solutions: undefined,
        responses: answerCounts,
      })

      currentPlayers.forEach((player) => {
        this.opts.send(player.id, STATUS.WAIT, {
          text: "game:answerNoted",
        })
      })

      this.recordHistory(currentPlayers)
      this.playersAnswers = []

      return
    }

    const oldLeaderboard = (() => {
      if (this.leaderboard.length === 0) {
        return currentPlayers.map((p) => ({ ...p }))
      }

      return this.leaderboard.map((p) => ({ ...p }))
    })()

    // Only the challenged players are scored for a top challenge; the others keep their points.
    const challenged = currentPlayers.filter(
      (player) => !this.challengeIds || this.challengeIds.has(player.id),
    )
    const scored = scoreQuestion(this.question, challenged, this.playersAnswers)
    const sortedPlayers: ScoredPlayer[] = [
      ...scored,
      ...currentPlayers
        .filter((player) => !challenged.includes(player))
        .map((player) => ({ ...player, lastCorrect: false, lastPoints: 0 })),
    ].sort((a, b) => b.points - a.points)

    this.opts.players.replace(sortedPlayers)

    sortedPlayers.forEach((player, index) => {
      const aheadPlayer = sortedPlayers[index - 1]

      if (this.challengeIds && !this.challengeIds.has(player.id)) {
        this.opts.send(player.id, STATUS.WAIT, {
          text: "game:topChallengeSkipped",
        })

        return
      }

      this.opts.send(player.id, STATUS.SHOW_RESULT, {
        correct: player.lastCorrect,
        message: player.lastCorrect ? "game:correct" : "game:wrong",
        points: player.lastPoints,
        myPoints: player.points,
        rank: index + 1,
        aheadOfMe: aheadPlayer ? aheadPlayer.username : null,
        note: this.question.note,
        puzzle: this.puzzleResult(player.id),
        pin: this.pinResult(player.id),
      })
    })

    this.opts.send(this.opts.getManagerId(), STATUS.SHOW_RESPONSES, {
      ...this.question,
      responses: answerCounts,
      pins: this.pinResponses(sortedPlayers),
    })

    this.recordHistory(currentPlayers, sortedPlayers)

    this.leaderboard = sortedPlayers
    this.tempOldLeaderboard ??= oldLeaderboard
    this.playersAnswers = []
  }

  /** What a player typed per group next to the right connection, for the result screen. */
  private puzzleResult(playerId: string): PuzzleResult | undefined {
    const { options, answers } = this.question

    if (!isPuzzleOptions(options)) {
      return undefined
    }

    const answer = this.playersAnswers.find((a) => a.playerId === playerId)

    const texts = answer?.answerTexts ?? []
    const matched = matchPuzzleTexts(texts, options.connections)
    const unmatched = new Set(
      texts.flatMap((text, index) =>
        matched.includes(index) || text.trim() === "" ? [] : [index],
      ),
    )
    // A wrong text stays on its own field when it can, and otherwise takes the
    // next free unsolved group, because the field a text was typed in is not
    // what counts.
    const shown = new Map<number, string>()

    for (const group of options.connections.keys()) {
      if (matched[group] === undefined && unmatched.delete(group)) {
        shown.set(group, texts[group] ?? "")
      }
    }

    const leftovers = [...unmatched].map((index) => texts[index] ?? "")

    return {
      groups: options.connections.map((accepted, group) => {
        const textIndex = matched[group]
        const correct = textIndex !== undefined
        const given = correct
          ? (texts[textIndex] ?? "")
          : (shown.get(group) ?? leftovers.shift() ?? "")

        return {
          words: puzzleGroupWords(answers, group),
          connection: accepted.find((c) => c.trim() !== "") ?? "",
          given,
          correct,
        }
      }),
    }
  }

  /** The options players get with the question: never the solutions. */
  private publicOptions(): PlayerQuestionOptions | undefined {
    const { options } = this.question

    if (isPinOptions(options)) {
      return { mode: options.mode ?? PIN_MODES.IMAGE, view: options.view }
    }

    return isPuzzleOptions(options) ? undefined : options
  }

  /** Where a player tapped and how far that is from the right spot. */
  private pinRecord(
    playerId: string,
  ): (PinPosition & { distance: number }) | undefined {
    const { options } = this.question
    const pin = this.playersAnswers.find((a) => a.playerId === playerId)?.pin

    if (!isPinOptions(options) || !pin) {
      return undefined
    }

    return { ...pin, distance: pinDistanceTo(pin, options) }
  }

  private pinResult(playerId: string): StatusDataMap["SHOW_RESULT"]["pin"] {
    const { options, media } = this.question

    if (!isPinOptions(options)) {
      return undefined
    }

    const record = this.pinRecord(playerId)

    return {
      media,
      options,
      guess: record ? { x: record.x, y: record.y } : null,
      distance: record?.distance ?? null,
    }
  }

  /** Every pin on the board, closest first, for the big screen. */
  private pinResponses(scored: ScoredPlayer[]): PinResponse[] | undefined {
    if (!isPinOptions(this.question.options)) {
      return undefined
    }

    return scored
      .flatMap((player) => {
        const record = this.pinRecord(player.id)

        return record
          ? [
              {
                username: player.username,
                x: record.x,
                y: record.y,
                distance: record.distance,
                points: Math.max(0, player.lastPoints),
              },
            ]
          : []
      })
      .sort((a, b) => a.distance - b.distance)
  }

  private showLeaderboard(): void {
    const oldLeaderboard = this.tempOldLeaderboard ?? this.leaderboard
    const round = this.endedRound()

    this.opts.send(this.opts.getManagerId(), STATUS.SHOW_LEADERBOARD, {
      oldLeaderboard: round ? oldLeaderboard : oldLeaderboard.slice(0, 5),
      leaderboard: round ? this.leaderboard : this.leaderboard.slice(0, 5),
      ...(round ? { round: { name: round } } : {}),
    })

    for (const player of this.opts.players.getAll()) {
      this.opts.send(player.id, STATUS.SHOW_PLAYER_LEADERBOARD, {
        rows: buildPlayerLeaderboard(
          oldLeaderboard,
          this.leaderboard,
          player.id,
        ),
        ...(round ? { round: { name: round } } : {}),
      })
    }

    this.tempOldLeaderboard = null
  }

  private finishSurvey(): void {
    const players = this.opts.players.getAll()

    const summary = {
      subject: this.opts.quizz.subject,
      totalPlayers: players.length,
      totalQuestions: this.opts.quizz.questions.length,
    }

    this.opts.send(this.opts.getManagerId(), STATUS.SUMMARY, summary)

    players.forEach((player) => {
      this.opts.send(player.id, STATUS.SUMMARY, summary)
    })
  }

  private finish(): void {
    this.started = false
    this.clearAutoAdvance()

    const finalPlayers = this.isSurvey()
      ? this.opts.players.getAll()
      : this.leaderboard

    if (this.questionsHistory.length > 0) {
      this.opts.onGameFinished({
        id: `${Date.now()}-${nanoid(8)}`,
        gameMode: this.opts.quizz.gameMode,
        subject: this.opts.quizz.subject,
        date: new Date().toISOString(),
        players: finalPlayers.map((player, index) => ({
          username: player.username,
          points: player.points,
          rank: index + 1,
        })),
        questions: this.questionsHistory,
      })
    }

    if (this.isSurvey()) {
      this.finishSurvey()

      return
    }

    const top = this.leaderboard
      .slice(0, 3)
      .map(({ username, points }) => ({ username, points }))

    this.opts.send(this.opts.getManagerId(), STATUS.FINISHED, {
      subject: this.opts.quizz.subject,
      source: this.opts.quizz.source,
      top,
    })

    this.leaderboard.forEach((player, index) => {
      this.opts.send(player.id, STATUS.FINISHED, {
        subject: this.opts.quizz.subject,
        source: this.opts.quizz.source,
        top,
        rank: index + 1,
      })
    })
  }

  // ── Player actions ───────────────────────────────────────────────────────

  private normalizeAnswer(answerIds: number[]): number[] | null {
    const { options } = this.question

    if (isPuzzleOptions(options) || isPinOptions(options)) {
      return []
    }

    if (!isEstimationOptions(options)) {
      return answerIds
    }

    const value = answerIds.at(0)

    if (
      answerIds.length !== 1 ||
      value === undefined ||
      !Number.isFinite(value)
    ) {
      return null
    }

    return [Math.min(options.max, Math.max(options.min, value))]
  }

  /** A player marks the intro slide as read; the big screen shows who is still reading. */
  markIntroRead(socket: Socket): void {
    const player = this.opts.players.findById(socket.id)

    if (!player || !this.awaitingIntro || this.introRead.has(player.id)) {
      return
    }

    this.introRead.add(player.id)
    this.opts.io
      .to(this.opts.gameId)
      .emit(EVENTS.GAME.PLAYER_ANSWER, this.introRead.size)
  }

  selectAnswer(
    socket: Socket,
    answerIds: number[],
    { answerTexts, pin }: AnswerExtra = {},
  ): void {
    const player = this.opts.players.findById(socket.id)

    if (!player || !this.acceptingAnswers) {
      return
    }

    if (this.challengeIds && !this.challengeIds.has(player.id)) {
      return
    }

    if (this.playersAnswers.find((a) => a.playerId === socket.id)) {
      return
    }

    const submitted = this.normalizeAnswer(answerIds)

    if (!submitted) {
      return
    }

    const { options } = this.question

    // A pin question can only be answered with a pin.
    if (isPinOptions(options) && (!pin || !isPinPositionValid(pin, options))) {
      return
    }

    const accuracy =
      isPinOptions(options) && pin ? scorePin(pin, options).accuracy : undefined
    const texts = isPuzzleOptions(options)
      ? Array.from({ length: PUZZLE_GROUPS }, (_, group) =>
          (answerTexts?.at(group) ?? "").trim(),
        )
      : undefined

    if (isPuzzleOptions(options) && texts) {
      submitted.push(...solvedPuzzleGroups(texts, options.connections))
    }

    const points = (() => {
      if (
        isEstimationOptions(this.question.options) ||
        isPuzzleOptions(this.question.options) ||
        isPinOptions(this.question.options)
      ) {
        return this.question.maxPoints ?? MAX_POINTS
      }

      const maxPoints = this.question.maxPoints ?? MAX_POINTS
      const { speedBonus } = this.opts.quizz

      if (this.question.time === NO_TIME_LIMIT) {
        return applySpeedBonus(
          orderToPoint(
            this.playersAnswers.length,
            this.opts.players.count(),
            this.question.maxPoints,
          ),
          maxPoints,
          speedBonus,
        )
      }

      return applySpeedBonus(
        timeToPoint(this.startTime, this.question),
        maxPoints,
        speedBonus,
      )
    })()

    this.playersAnswers.push({
      playerId: player.id,
      answerIds: submitted,
      ...(texts && { answerTexts: texts }),
      ...(accuracy !== undefined && { pin, accuracy }),
      points,
    })

    this.opts.send(socket.id, STATUS.WAIT, {
      text: "game:waitingForAnswers",
    })

    socket
      .to(this.opts.gameId)
      .emit(EVENTS.GAME.PLAYER_ANSWER, this.playersAnswers.length)
    this.opts.players.broadcastCount()
    this.endIfEveryoneAnswered()
  }

  updatePlayerId(oldId: string, newId: string): void {
    if (this.introRead.delete(oldId)) {
      this.introRead.add(newId)
    }

    if (this.challengeIds?.delete(oldId)) {
      this.challengeIds.add(newId)
    }

    this.playersAnswers = this.playersAnswers.map((answer) =>
      answer.playerId === oldId ? { ...answer, playerId: newId } : answer,
    )
  }

  endIfEveryoneAnswered(): void {
    if (!this.acceptingAnswers) {
      return
    }

    const connected = this.opts.players
      .getAll()
      .filter(
        (p) =>
          p.connected && (!this.challengeIds || this.challengeIds.has(p.id)),
      )
    const everyoneAnswered = connected.every((player) =>
      this.playersAnswers.some((a) => a.playerId === player.id),
    )

    if (connected.length > 0 && everyoneAnswered) {
      this.opts.cooldown.abort()
    }
  }
}
