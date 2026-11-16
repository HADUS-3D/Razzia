import clsx from "clsx"
import { Check, Users } from "lucide-react"
import type { ResponsesComponentProps } from "@razzia/web/features/questions/types"
import { puzzleGroupWords } from "@razzia/common/questions/puzzle"
import { ANSWERS_COLORS } from "@razzia/web/features/game/utils/constants"
import { getPuzzleConnections } from "@razzia/web/features/questions/puzzle/utils"

const PuzzleResponses = ({
  data: { answers, responses, options },
}: ResponsesComponentProps) => (
  <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4">
    {getPuzzleConnections(options).map((accepted, group) => (
      <div
        key={group}
        className={clsx(
          "anim-show flex flex-col gap-2 rounded-2xl p-3 shadow-lg md:p-4",
          ANSWERS_COLORS[group],
        )}
      >
        <div className="flex items-center justify-between gap-3 text-xl font-bold md:text-3xl">
          <span className="flex min-w-0 items-center gap-2">
            <Check className="size-6 shrink-0 stroke-4" />
            <span className="truncate">
              {accepted.find((connection) => connection.trim() !== "")}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 rounded-lg bg-black/20 px-3 py-1">
            <Users className="size-5 stroke-3" />
            {responses[group] ?? 0}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {puzzleGroupWords(answers, group).map((word, i) => (
            <span
              key={i}
              className="rounded-lg bg-white px-2 py-1.5 text-center text-sm font-bold wrap-anywhere text-foreground md:text-xl"
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    ))}
  </div>
)

export default PuzzleResponses
