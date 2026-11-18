import {
  createDefaultPinOptions,
  pinInitialValues,
  pinMediaInAnswer,
} from "@razzia/web/features/questions/pin/utils"

export { default as AnswerComponent } from "@razzia/web/features/questions/pin/components/PinAnswers"

export { default as ConfigComponent } from "@razzia/web/features/questions/pin/components/PinConfig"

export { default as AnswersEditor } from "@razzia/web/features/questions/pin/components/PinEditor"

export { default as PreparedComponent } from "@razzia/web/features/questions/pin/components/PinPrepared"

export { default as ResponsesComponent } from "@razzia/web/features/questions/pin/components/PinResponses"

export const labelKey = "quizz:questionType.pin"

export const defaultOptions = createDefaultPinOptions()

export const mediaInAnswer = pinMediaInAnswer

export const initialValues = pinInitialValues
