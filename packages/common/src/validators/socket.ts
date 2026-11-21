import { z } from "zod"
import {
  EVENTS,
  MAX_ANSWERS,
  MAX_PUZZLE_ANSWER_LENGTH,
  PUZZLE_GROUPS,
} from "@razzia/common/constants"

const gameMessageValidator = z.object({ gameId: z.string().min(1) })

const answerKeysValidator = z
  .array(z.number())
  .max(MAX_ANSWERS)
  .refine((keys) => new Set(keys).size === keys.length)

export const clientEventValidators = {
  [EVENTS.MANAGER.RECONNECT]: gameMessageValidator,
  [EVENTS.MANAGER.LEAVE]: gameMessageValidator,
  [EVENTS.MANAGER.KICK_PLAYER]: gameMessageValidator.extend({
    playerId: z.string().min(1),
  }),
  [EVENTS.MANAGER.START_GAME]: gameMessageValidator,
  [EVENTS.MANAGER.ADVANCE]: gameMessageValidator,
  [EVENTS.MANAGER.END_GAME]: gameMessageValidator,
  [EVENTS.MANAGER.SET_LOCK]: gameMessageValidator.extend({
    locked: z.boolean(),
  }),
  [EVENTS.PLAYER.LOGIN]: z.object({ ticket: z.string().min(1) }),
  [EVENTS.PLAYER.RECONNECT]: gameMessageValidator,
  [EVENTS.PLAYER.LEAVE]: gameMessageValidator,
  [EVENTS.PLAYER.INTRO_READ]: gameMessageValidator,
  [EVENTS.PLAYER.SELECTED_ANSWER]: gameMessageValidator.extend({
    data: z.object({
      answerKeys: answerKeysValidator.optional(),
      /** The typed connections of a puzzle, one per group. */
      answerTexts: z
        .array(z.string().max(MAX_PUZZLE_ANSWER_LENGTH))
        .max(PUZZLE_GROUPS)
        .optional(),
      /** Where a pin question was tapped: percent of the image, or longitude and latitude on a map. The server checks the range. */
      pin: z
        .object({
          // Wide enough for a map (longitude -180..180, latitude -90..90) as well
          // as an image (0..100); the round manager checks the range per mode.
          x: z.number().min(-180).max(180),
          y: z.number().min(-180).max(180),
        })
        .optional(),
    }),
  }),
}
