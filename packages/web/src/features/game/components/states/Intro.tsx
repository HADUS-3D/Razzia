import { Check } from "lucide-react"
import { motion } from "motion/react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { IntroSection } from "@razzia/common/questions/intro"
import type { CommonStatusDataMap } from "@razzia/common/types/game/status"
import { EVENTS } from "@razzia/common/constants"
import Button from "@razzia/web/components/Button"
import IntroIcon from "@razzia/web/features/game/components/IntroIcon"
import {
  useEvent,
  useSocket,
} from "@razzia/web/features/game/contexts/socket-context"
import { usePlayerStore } from "@razzia/web/features/game/stores/player"

interface Props {
  data: CommonStatusDataMap["SHOW_INTRO"]
}

const Intro = ({ data: { sections, details, totalPlayers } }: Props) => {
  const { t } = useTranslation()
  const { socket } = useSocket()
  const { player, gameId } = usePlayerStore()
  const [read, setRead] = useState(0)
  const [iRead, setIRead] = useState(false)

  useEvent(EVENTS.GAME.PLAYER_ANSWER, (count) => {
    setRead(count)
  })

  const handleRead = () => {
    if (!gameId) {
      return
    }

    setIRead(true)
    socket.emit(EVENTS.PLAYER.INTRO_READ, { gameId })
  }

  const range = (from: number, to: number) =>
    from === to ? String(from) : t("game:intro.range", { from, to })

  const sectionText = (section: IntroSection) => {
    if (section === "estimation") {
      return t(`game:intro.estimation.text_${details.estimation ?? "margin"}`)
    }

    if (section === "challenge" && details.challenge) {
      const { minPercent, maxPercent, minCount, maxCount } = details.challenge

      return t("game:intro.challenge.text", {
        percent: range(minPercent, maxPercent),
        count: range(minCount, maxCount),
        total: totalPlayers,
      })
    }

    return t(`game:intro.${section}.text`)
  }

  return (
    <section className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-6 px-4 py-6">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center text-3xl font-bold text-white drop-shadow-lg md:text-5xl"
      >
        {t("game:intro.title")}
      </motion.h2>
      <ul className="flex w-full flex-col gap-3">
        {sections.map((section, index) => (
          <motion.li
            key={section}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
            className="flex items-center gap-4 rounded-xl bg-white/90 p-4 text-black shadow-lg md:gap-6 md:p-5"
          >
            <IntroIcon section={section} />
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold md:text-2xl">
                {t(`game:intro.${section}.title`)}
              </h3>
              <p className="text-base md:text-xl">{sectionText(section)}</p>
            </div>
          </motion.li>
        ))}
      </ul>

      {player ? (
        <Button
          onClick={handleRead}
          disabled={iRead}
          className="sticky bottom-3 z-10 flex items-center gap-2 px-8 py-3 text-xl shadow-lg"
        >
          {iRead && <Check className="size-6" />}
          {t(iRead ? "game:intro.readDone" : "game:intro.read")}
        </Button>
      ) : (
        <p
          className="rounded-full bg-black/40 px-5 py-2 text-xl font-bold text-white"
          aria-live="polite"
        >
          {t("game:intro.pending", {
            count: Math.max(0, totalPlayers - read),
          })}
        </p>
      )}
    </section>
  )
}

export default Intro
