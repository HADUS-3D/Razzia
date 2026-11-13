import clsx from "clsx"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import useSound from "use-sound"
import type { CommonStatusDataMap } from "@razzia/common/types/game/status"
import AnswerNote from "@razzia/web/features/game/components/AnswerNote"
import CricleCheck from "@razzia/web/features/game/components/icons/CricleCheck"
import CricleXmark from "@razzia/web/features/game/components/icons/CricleXmark"
import { usePlayerStore } from "@razzia/web/features/game/stores/player"
import { SFX } from "@razzia/web/features/game/utils/constants"

interface Props {
  data: CommonStatusDataMap["SHOW_RESULT"]
}

const NOTE_DELAY_MS = 1000

const Result = ({
  data: { correct, message, points, myPoints, rank, aheadOfMe, note },
}: Props) => {
  const { updatePlayer } = usePlayerStore()
  const { t } = useTranslation()
  const hasNote = Boolean(note?.trim())
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    if (!hasNote) {
      return undefined
    }

    const timer = setTimeout(() => setCompact(true), NOTE_DELAY_MS)

    return () => clearTimeout(timer)
  }, [hasNote])

  const [sfxResults] = useSound(SFX.RESULTS_SOUND, {
    volume: 0.2,
  })

  useEffect(() => {
    updatePlayer(({ player }) => ({ player: { ...player, points: myPoints } }))

    sfxResults()
    // oxlint-disable-next-line
  }, [sfxResults])

  return (
    <section className="anim-show relative mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center">
      <div
        className={clsx(
          "w-full transition-[max-width] duration-500 ease-in-out motion-reduce:transition-none",
          compact ? "max-w-20" : "max-w-60",
        )}
      >
        {correct ? (
          <CricleCheck className="aspect-square w-full" />
        ) : (
          <CricleXmark className="aspect-square w-full" />
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
        <div className="mt-4 w-full">
          <AnswerNote note={note} />
        </div>
      )}
    </section>
  )
}

export default Result
