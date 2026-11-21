import clsx from "clsx"
import { Check } from "lucide-react"
import type { PreparedComponentProps } from "@razzia/web/features/questions/types"
import {
  ANSWERS_COLORS,
  ANSWERS_LABELS,
} from "@razzia/web/features/game/utils/constants"

/** Which boxes look ticked, so it is clear that more than one answer can be right. */
const TICKED = [true, false, false, true]

const MultiPrepared = ({ totalAnswers }: PreparedComponentProps) => (
  <div className="anim-quizz grid aspect-square w-60 grid-cols-2 gap-4 rounded-2xl bg-gray-700 p-5 md:w-60">
    {Array.from({ length: totalAnswers }).map((_, key) => (
      <div
        key={key}
        className={clsx(
          "button shadow-inset relative flex aspect-square h-full w-full items-center justify-center rounded-2xl",
          ANSWERS_COLORS[key],
        )}
      >
        <span className="text-2xl font-bold text-white md:text-3xl">
          {ANSWERS_LABELS[key]}
        </span>
        <span
          className={clsx(
            "absolute top-2 right-2 flex size-6 items-center justify-center rounded-md text-foreground",
            TICKED[key % TICKED.length] ? "bg-white" : "bg-white/20",
          )}
        >
          {TICKED[key % TICKED.length] && <Check className="size-4 stroke-5" />}
        </span>
      </div>
    ))}
  </div>
)

export default MultiPrepared
