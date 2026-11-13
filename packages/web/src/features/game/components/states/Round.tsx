import { motion } from "motion/react"
import { useTranslation } from "react-i18next"
import type { CommonStatusDataMap } from "@razzia/common/types/game/status"

interface Props {
  data: CommonStatusDataMap["SHOW_ROUND"]
}

const Round = ({ data: { name, number, total } }: Props) => {
  const { t } = useTranslation()

  return (
    <section className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center gap-6 px-4">
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-full bg-primary px-6 py-2 text-xl font-bold text-white shadow-lg md:text-3xl"
      >
        {t("game:round.title", { number })}
        {total > 1 && ` ${t("game:round.of", { total })}`}
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.2 }}
        className="text-center text-4xl font-bold break-words text-white drop-shadow-lg md:text-6xl lg:text-7xl"
      >
        {name}
      </motion.h2>
    </section>
  )
}

export default Round
