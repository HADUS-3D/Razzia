import type {
  PinPosition,
  PlayerQuestionOptions,
  PinQuestionOptions,
  Player,
  QuestionMedia,
  QuestionOptions,
  QuestionType,
  QuizzSource,
} from "@razzia/common/types/game"

export interface PinResponse extends PinPosition {
  username: string
  /** Percent of the image width. */
  distance: number
  points: number
}

export const STATUS = {
  SHOW_ROOM: "SHOW_ROOM",
  SHOW_START: "SHOW_START",
  SHOW_ROUND: "SHOW_ROUND",
  SHOW_PREPARED: "SHOW_PREPARED",
  SHOW_QUESTION: "SHOW_QUESTION",
  SELECT_ANSWER: "SELECT_ANSWER",
  SHOW_RESULT: "SHOW_RESULT",
  SHOW_RESPONSES: "SHOW_RESPONSES",
  SHOW_LEADERBOARD: "SHOW_LEADERBOARD",
  FINISHED: "FINISHED",
  SUMMARY: "SUMMARY",
  WAIT: "WAIT",
} as const

export type Status = (typeof STATUS)[keyof typeof STATUS]

export interface CommonStatusDataMap {
  SHOW_START: { time: number }
  SHOW_ROUND: { name: string; number: number; total: number }
  SHOW_PREPARED: {
    totalAnswers: number
    questionNumber: number
    questionType: QuestionType
  }
  SHOW_QUESTION: {
    question: string
    media?: QuestionMedia
    cooldown: number
  }
  SELECT_ANSWER: {
    question: string
    answers: string[]
    media?: QuestionMedia
    time: number
    totalPlayer: number
    questionType: QuestionType
    options?: PlayerQuestionOptions
    answersOnly: boolean
  }
  SHOW_RESULT: {
    correct: boolean
    message: string
    points: number
    myPoints: number
    rank: number
    aheadOfMe: string | null
    note?: string
    /** Set for a puzzle: per group its words, the right connection and what the player typed. */
    puzzle?: {
      groups: Array<{
        words: string[]
        connection: string
        given: string
        correct: boolean
      }>
    }
    /** Set for a pin question: the image, where the player tapped and the right spot. */
    pin?: {
      media?: QuestionMedia
      options: PinQuestionOptions
      guess: PinPosition | null
      /** Percent of the image width, null when the player did not answer. */
      distance: number | null
    }
  }
  WAIT: { text: string }
  FINISHED: {
    subject: string
    source?: QuizzSource
    top: Array<Pick<Player, "username" | "points">>
    rank?: number
  }
  SUMMARY: { subject: string; totalPlayers: number; totalQuestions: number }
}

interface ManagerExtraStatus {
  SHOW_ROOM: { text: string; inviteCode?: string; subject?: string }
  SHOW_RESPONSES: {
    question: string
    responses: Record<number, number>
    solutions?: number[]
    answers: string[]
    media?: QuestionMedia
    type: QuestionType
    options?: QuestionOptions
    note?: string
    /** Set for a pin question: every player's pin, closest first. */
    pins?: PinResponse[]
  }
  SHOW_LEADERBOARD: {
    oldLeaderboard: Player[]
    leaderboard: Player[]
    /** Set when a round has ended: the full ranking with every best streak. */
    round?: { name: string }
  }
}

export type PlayerStatusDataMap = CommonStatusDataMap

export type ManagerStatusDataMap = CommonStatusDataMap & ManagerExtraStatus

export type StatusDataMap = PlayerStatusDataMap & ManagerStatusDataMap
