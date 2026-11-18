import type {
  PinPosition,
  PlayerQuestionOptions,
  QuestionMedia,
} from "@razzia/common/types/game"
import type { ManagerStatusDataMap } from "@razzia/common/types/game/status"

export interface AnswerComponentProps {
  answers: string[]
  options?: PlayerQuestionOptions
  /** The image or map of the question, for answer types that play on it. */
  media?: QuestionMedia
  onSubmit: (
    _answerKeys: number[],
    _answerTexts?: string[],
    _pin?: PinPosition,
  ) => void
  readOnly?: boolean
  fill?: boolean
}

export interface SolutionPickerProps {
  index: number
  isSelected: boolean
}

export interface PreparedComponentProps {
  totalAnswers: number
}

export interface ResponsesComponentProps {
  data: ManagerStatusDataMap["SHOW_RESPONSES"]
}
