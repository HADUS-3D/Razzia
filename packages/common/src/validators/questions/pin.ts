import { z } from "zod"
import type { QuestionRefinement } from "@razzia/common/validators/questions"
import {
  MAP_MAX_ZOOM,
  MAX_PIN_UNIT_LENGTH,
  MEDIA_TYPES,
  PIN_MODES,
} from "@razzia/common/constants"
import { isMapPin, isPinOptions } from "@razzia/common/questions/options"
import { isPinPositionValid } from "@razzia/common/questions/pin"

const coordinate = z
  .number("errors:quizz.pinInvalidOptions")
  .min(-180, "errors:quizz.pinInvalidOptions")
  .max(180, "errors:quizz.pinInvalidOptions")

export const pinOptionsValidator = z.object({
  mode: z.enum(PIN_MODES).optional(),
  view: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      zoom: z.number().min(0).max(MAP_MAX_ZOOM),
    })
    .optional(),
  x: coordinate,
  y: coordinate,
  radius: z
    .number("errors:quizz.pinInvalidOptions")
    .min(0, "errors:quizz.pinRadiusNegative"),
  maxDistance: z.number("errors:quizz.pinInvalidOptions"),
  aspect: z.number().positive("errors:quizz.pinInvalidOptions").optional(),
  imageWidth: z
    .number()
    .min(0, "errors:quizz.pinImageWidthNegative")
    .optional(),
  unit: z
    .string()
    .max(MAX_PIN_UNIT_LENGTH, "errors:quizz.pinUnitTooLong")
    .optional(),
})

export const refinePinQuestion: QuestionRefinement = (
  { answers, media, options },
  addIssue,
) => {
  if (answers.length > 0) {
    addIssue(["answers"], "errors:quizz.pinNoAnswers")
  }

  if (!isPinOptions(options)) {
    addIssue(["options"], "errors:quizz.pinInvalidOptions")

    return
  }

  if (!isPinPositionValid(options, options)) {
    addIssue(["options"], "errors:quizz.pinInvalidOptions")
  }

  // An image needs an image; a real map needs no media at all.
  if (!isMapPin(options) && media?.type !== MEDIA_TYPES.IMAGE) {
    addIssue(["media"], "errors:quizz.pinNeedsImage")
  }

  if (options.maxDistance <= options.radius) {
    addIssue(["options", "maxDistance"], "errors:quizz.pinMaxDistanceTooSmall")
  }
}
