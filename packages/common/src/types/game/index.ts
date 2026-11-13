import type {
  ACCEPTED_MEDIA_TYPES,
  ESTIMATION_INPUT_MODES,
  MEDIA_TYPES,
  QUESTION_TYPES,
  QUIZZ_MODES,
  QUIZZ_SOURCES,
  SCORING_MODES,
} from "@razzia/common/constants"
import type { QuizzVisibility } from "@razzia/common/types/auth"

export type QuizzMode = (typeof QUIZZ_MODES)[keyof typeof QUIZZ_MODES]

export type QuizzSource = (typeof QUIZZ_SOURCES)[keyof typeof QUIZZ_SOURCES]

export type QuestionType = (typeof QUESTION_TYPES)[keyof typeof QUESTION_TYPES]

export type ScoringMode = (typeof SCORING_MODES)[keyof typeof SCORING_MODES]

export interface MultiQuestionOptions {
  scoringMode: ScoringMode
}

export type EstimationInputMode =
  (typeof ESTIMATION_INPUT_MODES)[keyof typeof ESTIMATION_INPUT_MODES]

export interface EstimationQuestionOptions {
  inputMode: EstimationInputMode
  min: number
  max: number
  step: number
  margin: number
}

export type QuestionOptions = MultiQuestionOptions | EstimationQuestionOptions

export interface Player {
  id: string
  clientId: string
  connected: boolean
  username: string
  points: number
  /** Correct answers in a row, up to the last question. */
  streak: number
  /** Longest run of correct answers in a row so far in this quiz. */
  bestStreak: number
}

export interface Answer {
  playerId: string
  answerIds: number[]
  points: number
}

export type QuestionMediaType =
  | (typeof MEDIA_TYPES)[keyof typeof MEDIA_TYPES]
  | undefined

export interface QuestionMedia {
  type?: QuestionMediaType
  url: string
}

export type UploadedMediaType =
  (typeof ACCEPTED_MEDIA_TYPES)[keyof typeof ACCEPTED_MEDIA_TYPES]["type"]

export interface UploadedMedia {
  name: string
  url: string
  type: UploadedMediaType
}

/** A round that starts with the question it is set on. */
export interface QuestionRound {
  name: string
  /** Image behind the round's title slide; falls back to the quizz background. */
  background?: string
}

export interface Question {
  type: QuestionType
  question: string
  category?: string
  /** Starts a new round at this question: a title slide, and a full leaderboard once the round is over. */
  round?: QuestionRound
  note?: string
  media?: QuestionMedia
  /** Image shown behind this question; falls back to the quizz background. */
  background?: string
  answers: string[]
  solutions?: number[]
  cooldown: number
  time: number
  maxPoints?: number
  penalty?: number
  options?: QuestionOptions
}

export interface Quizz {
  gameMode: QuizzMode
  subject: string
  /** Set on quizzes whose questions come from an external database. */
  source?: QuizzSource
  /** Image shown behind the game; falls back to the app background. */
  background?: string
  questions: Question[]
}

export interface AppSettings {
  background?: string
}

export type QuizzWithId = Quizz & { id: string }

export interface QuizzMeta {
  id: string
  subject: string
  ownerId: string | null
  visibility: QuizzVisibility
  canEdit: boolean
  canDelete: boolean
}

export interface AutoAdvanceSettings {
  enable: boolean
  responsesDelay: number
  leaderboardDelay: number
}

export interface GameSettings {
  generatedUsernames: boolean
  answersOnly: boolean
  autoAdvance: AutoAdvanceSettings
}

export interface GameUpdateQuestion {
  current: number
  total: number
}

export interface PlayerAnswerRecord {
  playerName: string
  answerIds: number[] | null
  correct?: boolean
  points?: number
}

export type QuestionResult = Question & {
  playerAnswers: PlayerAnswerRecord[]
}

export interface GameResultPlayer {
  username: string
  points: number
  rank: number
}

export interface GameResult {
  id: string
  gameMode: QuizzMode
  subject: string
  date: string
  players: GameResultPlayer[]
  questions: QuestionResult[]
  /** User id of the host. Results without it are visible to admins only. */
  hostId?: string
}

export interface GameResultMeta {
  id: string
  gameMode: QuizzMode
  subject: string
  date: string
  playerCount: number
}
