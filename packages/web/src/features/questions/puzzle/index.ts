import {
  createDefaultPuzzleOptions,
  puzzleInitialValues,
} from "@razzia/web/features/questions/puzzle/utils"

export { default as AnswerComponent } from "@razzia/web/features/questions/puzzle/components/PuzzleAnswers"

export { default as ConfigComponent } from "@razzia/web/features/questions/puzzle/components/PuzzleConfig"

export { default as AnswersEditor } from "@razzia/web/features/questions/puzzle/components/PuzzleEditor"

export { default as PreparedComponent } from "@razzia/web/features/questions/puzzle/components/PuzzlePrepared"

export { default as ResponsesComponent } from "@razzia/web/features/questions/puzzle/components/PuzzleResponses"

export const labelKey = "quizz:questionType.puzzle"

export const defaultOptions = createDefaultPuzzleOptions()

export const initialValues = puzzleInitialValues
