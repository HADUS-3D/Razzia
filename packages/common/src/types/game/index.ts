import type {
  ACCEPTED_MEDIA_TYPES,
  PIN_MODES,
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
  /** Only the answer(s) closest to the solution score, the margin is then ignored. */
  closestWins?: boolean
}

/**
 * A puzzle keeps its 12 words in `Question.answers`: group 0 is words 0-3,
 * group 1 is words 4-7 and group 2 is words 8-11.
 */
export interface PuzzleQuestionOptions {
  /** Per group, every answer that counts as the connection. The first is shown as the solution. */
  connections: string[][]
}

export type PinMode = (typeof PIN_MODES)[keyof typeof PIN_MODES]

/** Where the players' map starts out, for a pin question on a real map. */
export interface PinMapView {
  lat: number
  lng: number
  zoom: number
}

export interface PinPosition {
  /** Image: percent of the image width from the left (0-100). Map: longitude (-180 to 180). */
  x: number
  /** Image: percent of the image height from the top (0-100). Map: latitude (-90 to 90). */
  y: number
}

/**
 * A pin question uses `Question.media` (an image or map) as the playing field:
 * players tap a spot and are scored on their distance to the right one.
 */
export interface PinQuestionOptions extends PinPosition {
  /** "image" (default) or "map", a real map with tiles. */
  mode?: PinMode
  /** Map mode: where the map is when the question starts. */
  view?: PinMapView
  /** Answers within this distance earn full points: percent of the image width, or km on a map. */
  radius: number
  /** From this distance on an answer earns nothing: percent of the image width, or km on a map. */
  maxDistance: number
  /** Width divided by height of the image, so distances come out right. */
  aspect?: number
  /** How wide the image is in real life (0 or empty: unknown), to show distances in `unit`. */
  imageWidth?: number
  unit?: string
}

/** What players get to see of a pin question before they answered: where to start, not the answer. */
export interface PinPublicOptions {
  mode: PinMode
  view?: PinMapView
}

/** The options a player's device gets with a question. */
export type PlayerQuestionOptions = QuestionOptions | PinPublicOptions

export type QuestionOptions =
  | MultiQuestionOptions
  | EstimationQuestionOptions
  | PuzzleQuestionOptions
  | PinQuestionOptions

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
  /** For a puzzle: the groups the player got right. */
  answerIds: number[]
  /** For a puzzle: what the player typed, one text per group. */
  answerTexts?: string[]
  /** For a pin question: where the player tapped. */
  pin?: PinPosition
  /** For a pin question: how close that is to the right spot, from 0 to 1. */
  accuracy?: number
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

/** The sounds of a question: each inherits from the quizz and then the app when left out. */
export interface QuestionSounds {
  music?: string
  answerEnd?: string
}

export interface QuizzSounds extends QuestionSounds {
  leaderboard?: string
  podium?: string
}

/** The sounds that apply to the screen now, resolved over question, quizz and app. */
export interface ResolvedSounds extends QuizzSounds {
  /** Percent of the normal volume. */
  volume?: number
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
  /** Sounds for this question; fall back to the quizz and then the app. */
  sounds?: QuestionSounds
  answers: string[]
  solutions?: number[]
  cooldown: number
  time: number
  maxPoints?: number
  penalty?: number
  /** Like `penalty`, but a percentage of the player's current points. */
  penaltyPercent?: number
  /**
   * Makes this a challenge for the top of the leaderboard: only the best
   * `topPercent` percent of the players see and answer it, on their own device.
   * A right answer keeps the points, a wrong one costs the penalty.
   */
  topPercent?: number
  options?: QuestionOptions
}

export interface Quizz {
  gameMode: QuizzMode
  subject: string
  /** Set on quizzes whose questions come from an external database. */
  source?: QuizzSource
  /** Image shown behind the game; falls back to the app background. */
  background?: string
  /** Sounds for this quizz; fall back to the app. */
  sounds?: QuizzSounds
  /**
   * How much of the points of a question depends on answering fast, in percent.
   * 100 (the default) is fully by speed; 0 gives every right answer the same points.
   */
  speedBonus?: number
  questions: Question[]
}

export interface AppSettings {
  background?: string
  sounds?: ResolvedSounds
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
  answerTexts?: string[]
  /** For a pin question: where the player tapped and how far that is from the right spot. */
  pin?: PinPosition & { distance: number }
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
