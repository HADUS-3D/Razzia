import clsx from "clsx"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type { CommonStatusDataMap } from "@razzia/common/types/game/status"
import AnswerNote from "@razzia/web/features/game/components/AnswerNote"
import CricleCheck from "@razzia/web/features/game/components/icons/CricleCheck"
import CricleXmark from "@razzia/web/features/game/components/icons/CricleXmark"
import PuzzleSolution from "@razzia/web/features/game/components/PuzzleSolution"
import { usePlayerStore } from "@razzia/web/features/game/stores/player"
import PinSolution from "@razzia/web/features/questions/pin/components/PinSolution"

interface Props {
  data: CommonStatusDataMap["SHOW_RESULT"]
}

const NOTE_DELAY_MS = 1000

const Result = ({
  data: {
    correct,
    message,
    points,
    myPoints,
    rank,
    aheadOfMe,
    note,
    puzzle,
    pin,
  },
}: Props) => {
  const { updatePlayer } = usePlayerStore()
  const { t } = useTranslation()
  const hasNote = Boolean(note?.trim()) || Boolean(puzzle) || Boolean(pin)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    if (!hasNote) {
      return undefined
    }

    const timer = setTimeout(() => setCompact(true), NOTE_DELAY_MS)

    return () => clearTimeout(timer)
  }, [hasNote])

  useEffect(() => {
    updatePlayer(({ player }) => ({ player: { ...player, points: myPoints } }))

    // The end-of-answer sound is configurable and plays on the big screen only.
    // oxlint-disable-next-line
  }, [])

  return (
    <section className="anim-show relative mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center">
      <div
        className={clsx(
          "w-full transition-[max-width] duration-500 ease-in-out motion-reduce:transition-none",
          compact ? "max-w-20" : "max-w-60",
        )}
      >
        {correct ? (
          <CricleCheck className="aspect-square h-auto w-full" />
        ) : (
          <CricleXmark className="aspect-square h-auto w-full" />
        )}
      </div>
      <h2
        className={clsx(
          "mt-1 font-bold text-white drop-shadow-lg transition-[font-size] duration-500 motion-reduce:transition-none",
          compact ? "text-2xl" : "text-4xl",
        )}
      >
        {t(message)}
      </h2>
      <p className="mt-1 text-xl font-bold text-white drop-shadow-lg">
        {t("game:resultTop")}
        {t("game:rank", { count: rank, ordinal: true })}
        {aheadOfMe ? `${t("game:resultBehind")}${aheadOfMe}` : ""}
      </p>
      {correct && (
        <span className="mt-2 rounded-lg bg-black/40 px-4 py-2 text-2xl font-bold text-white drop-shadow-lg">
          +{points}
        </span>
      )}
      {compact && (
        <div className="mt-4 flex w-full flex-col gap-3">
          {puzzle && <PuzzleSolution groups={puzzle.groups} />}
          {pin && <PinSolution pin={pin} />}
          <AnswerNote note={note} />
        </div>
      )}
    </section>
  )
}

export default Result
