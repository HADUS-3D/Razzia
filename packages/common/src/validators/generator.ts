import { z } from "zod"
import {
  OPENTDB_DIFFICULTIES,
  OPENTDB_MAX_AMOUNT,
  OPENTDB_TYPES,
} from "@razzia/common/constants"

export const generatorValidator = z.object({
  amount: z
    .number("errors:generator.invalidAmount")
    .int("errors:generator.invalidAmount")
    .min(1, "errors:generator.invalidAmount")
    .max(OPENTDB_MAX_AMOUNT, "errors:generator.invalidAmount"),
  category: z.number().int().positive().optional(),
  difficulty: z.enum(OPENTDB_DIFFICULTIES).optional(),
  type: z.enum(OPENTDB_TYPES).optional(),
})

export type GeneratorInput = z.infer<typeof generatorValidator>

export interface TriviaCategory {
  id: number
  name: string
}
