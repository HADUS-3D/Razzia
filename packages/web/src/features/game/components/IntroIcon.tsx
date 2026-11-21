import clsx from "clsx"
import { Check, Crown, MapPin } from "lucide-react"
import type { IntroSection } from "@razzia/common/questions/intro"
import { ANSWERS_COLORS } from "@razzia/web/features/game/utils/constants"

interface Props {
  section: IntroSection
}

const TICKED = [true, false, false, true]

const AnswerGrid = ({ multi }: { multi?: boolean }) => (
  <div className="grid size-full grid-cols-2 gap-1.5">
    {ANSWERS_COLORS.map((color, key) => (
      <div
        key={key}
        className={clsx("relative rounded-md md:rounded-lg", color)}
      >
        {multi && (
          <span
            className={clsx(
              "absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-sm text-foreground md:size-4",
              TICKED[key] ? "bg-white" : "bg-white/30",
            )}
          >
            {TICKED[key] && <Check className="size-2.5 stroke-5" />}
          </span>
        )}
      </div>
    ))}
  </div>
)

const Slider = () => (
  <div className="relative h-2 w-full rounded-full bg-white/30">
    <div className="absolute inset-y-0 left-0 w-2/3 rounded-full bg-primary" />
    <div className="absolute top-1/2 left-2/3 size-5 -translate-1/2 rounded-full border-2 border-white bg-primary" />
  </div>
)

const PuzzleBlocks = () => (
  <div className="grid size-full grid-cols-4 content-center gap-1">
    {Array.from({ length: 12 }, (_, i) => (
      <div key={i} className="h-2.5 rounded-sm bg-white/30" />
    ))}
  </div>
)

/** A small version of the picture a question type gets before its question. */
const IntroIcon = ({ section }: Props) => (
  <div
    aria-hidden="true"
    className="flex size-16 shrink-0 items-center justify-center self-center rounded-xl bg-gray-700 p-2.5 md:size-24 md:p-4"
  >
    {section === "single" && <AnswerGrid />}
    {section === "multi" && <AnswerGrid multi />}
    {section === "estimation" && <Slider />}
    {section === "puzzle" && <PuzzleBlocks />}
    {section === "pin" && (
      <MapPin
        className="size-8 fill-red-500 stroke-white md:size-12"
        strokeWidth={1.5}
      />
    )}
    {section === "challenge" && (
      <Crown
        className="size-8 fill-amber-400 stroke-white md:size-12"
        strokeWidth={1.5}
      />
    )}
  </div>
)

export default IntroIcon
