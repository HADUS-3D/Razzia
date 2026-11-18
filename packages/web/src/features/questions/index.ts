import type { ComponentType } from "react"
import type {
  PlayerQuestionOptions,
  Question,
  QuestionOptions,
  QuestionType,
  ScoringMode,
} from "@razzia/common/types/game"
import type {
  AnswerComponentProps,
  PreparedComponentProps,
  ResponsesComponentProps,
  SolutionPickerProps,
} from "@razzia/web/features/questions/types"
import * as estimation from "@razzia/web/features/questions/estimation"
import * as multi from "@razzia/web/features/questions/multi"
import * as pin from "@razzia/web/features/questions/pin"
import * as puzzle from "@razzia/web/features/questions/puzzle"
import * as single from "@razzia/web/features/questions/single"

interface QuestionRegistryEntry {
  labelKey: string
  defaultOptions?: QuestionOptions
  /** The answer component draws the question's image itself, so the game and the editor leave it out. */
  mediaInAnswer?: (_options?: PlayerQuestionOptions) => boolean
  scoringModes?: ScoringMode[]
  initialValues: (_question: Question) => Partial<Question>
  AnswerComponent: ComponentType<AnswerComponentProps>
  ConfigComponent: ComponentType
  AnswersEditor?: ComponentType
  SolutionPicker?: ComponentType<SolutionPickerProps>
  PreparedComponent?: ComponentType<PreparedComponentProps>
  ResponsesComponent?: ComponentType<ResponsesComponentProps>
}

export const QUESTION_REGISTRY: Record<QuestionType, QuestionRegistryEntry> = {
  single,
  multi,
  estimation,
  puzzle,
  pin,
}

export const QUESTION_TYPE_LIST = Object.keys(
  QUESTION_REGISTRY,
) as QuestionType[]
