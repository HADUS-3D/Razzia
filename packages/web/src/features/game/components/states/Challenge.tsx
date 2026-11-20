import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import useSound from "use-sound"
import type { ManagerStatusDataMap } from "@razzia/common/types/game/status"
import { EVENTS, MEDIA_TYPES, NO_TIME_LIMIT } from "@razzia/common/constants"
import { useEvent } from "@razzia/web/features/game/contexts/socket-context"
import { SFX } from "@razzia/web/features/game/utils/constants"

interface Props {
  data: ManagerStatusDataMap["SHOW_CHALLENGE"]
}

/** The big screen during a top challenge: the question and what is at stake, never the answers. */
const ChallengeScreen = ({
  data: { question, media, cooldown, time, answering, challenge },
}: Props) => {
  const { t } = useTranslation()
  const [sfxShow] = useSound(SFX.SHOW_SOUND, { volume: 0.5 })
  const [timeLeft, setTimeLeft] = useState(time)
  const [answered, setAnswered] = useState(0)

  useEffect(() => {
    if (!answering) {
      sfxShow()
    }
  }, [answering, sfxShow])

  useEvent(EVENTS.GAME.COOLDOWN, (sec) => {
    setTimeLeft(sec)
  })

  useEvent(EVENTS.GAME.PLAYER_ANSWER, (count) => {
    setAnswered(count)
  })

  const { penalty } = challenge
  const consequence = (() => {
    if (!penalty) {
      return t("game:challenge.wrongNone")
    }

    return penalty.kind === "percent"
      ? t("game:challenge.wrongPercent", { value: penalty.value })
      : t("game:challenge.wrongPoints", { value: penalty.value })
  })()

  return (
    <section className="relative mx-auto flex h-full w-full max-w-7xl flex-1 flex-col items-center px-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <span className="rounded-full bg-black/40 px-4 py-1 text-lg font-bold tracking-wide text-white uppercase">
          {t("game:challenge.title")}
        </span>

        <h2 className="anim-show text-center text-3xl font-bold text-white drop-shadow-lg md:text-4xl lg:text-5xl">
          {question}
        </h2>

        {media?.type === MEDIA_TYPES.IMAGE && (
          <img
            alt={question}
            src={media.url}
            className="max-h-48 w-auto rounded-md sm:max-h-72"
          />
        )}

        <div className="flex w-full max-w-3xl flex-col gap-2 rounded-lg bg-black/40 p-4 text-center text-lg font-semibold text-white md:text-xl">
          <p>
            {t("game:challenge.who", {
              count: challenge.count,
              total: challenge.total,
              percent: challenge.percent,
            })}
          </p>
          <p className="text-base font-normal opacity-90">
            {t("game:challenge.names")} {challenge.names.join(", ")}
          </p>
          <hr className="border-white/20" />
          <p>{t("game:challenge.correct")}</p>
          <p>{consequence}</p>
          <p className="text-base font-normal opacity-90">
            {t("game:challenge.others")}
          </p>
        </div>
      </div>

      {answering ? (
        <div className="mx-auto mb-4 flex w-full justify-between gap-1 px-2 text-lg font-bold text-white md:text-xl">
          {time !== NO_TIME_LIMIT && (
            <div className="flex flex-col items-center rounded-lg bg-black/40 px-4 text-lg font-bold">
              <span className="translate-y-1 text-sm">
                {t("game:hud.time")}
              </span>
              <span>{timeLeft}</span>
            </div>
          )}
          <div className="flex flex-col items-center rounded-lg bg-black/40 px-4 text-lg font-bold">
            <span className="translate-y-1 text-sm">
              {t("game:hud.answers")}
            </span>
            <span>
              {answered}/{challenge.count}
            </span>
          </div>
        </div>
      ) : (
        <div
          className="mb-20 h-4 self-start justify-self-end rounded-full bg-primary"
          style={{ animation: `progressBar ${cooldown}s linear forwards` }}
        ></div>
      )}
    </section>
  )
}

/** Restarts the screen when the players can answer, so the timer and counter start over. */
const Challenge = ({ data }: Props) => (
  <ChallengeScreen key={String(data.answering)} data={data} />
)

export default Challenge
