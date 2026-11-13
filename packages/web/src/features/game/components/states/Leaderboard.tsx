import clsx from "clsx"
import { AnimatePresence, motion, useSpring, useTransform } from "motion/react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type { ManagerStatusDataMap } from "@razzia/common/types/game/status"
import Fire from "@razzia/web/features/game/components/icons/Fire"

interface Props {
  data: ManagerStatusDataMap["SHOW_LEADERBOARD"]
}

const AnimatedPoints = ({ from, to }: { from: number; to: number }) => {
  const spring = useSpring(from, { stiffness: 1000, damping: 30 })
  const display = useTransform(spring, (value) => Math.round(value))
  const [displayValue, setDisplayValue] = useState(from)

  useEffect(() => {
    spring.set(to)
    const unsubscribe = display.on("change", (latest) => {
      setDisplayValue(latest)
    })

    return unsubscribe
  }, [to, spring, display])

  return <span className="drop-shadow-md">{displayValue}</span>
}

const StreakBadge = ({ streak }: { streak: number }) => {
  const { t } = useTranslation()

  return (
    <AnimatePresence>
      {streak >= 2 && (
        <motion.div
          key="streak"
          initial={{ opacity: 0, scale: 0.5, x: -10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.5, x: -10 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          role="img"
          aria-label={t("game:streak")}
          className="ml-2 flex items-center gap-1 rounded-full bg-amber-700 p-1"
        >
          <Fire className="size-7" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** The longest run of right answers so far, with a flame that keeps flickering. */
const BestStreak = ({ count }: { count: number }) => {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.4 }}
      role="img"
      aria-label={`${t("game:round.bestStreak")}: ${t("game:round.bestStreakCount", { count })}`}
      className="mr-4 ml-auto flex shrink-0 items-center gap-1 rounded-full bg-amber-700 py-1 pr-3 pl-1 text-xl"
    >
      <motion.span
        animate={{ scale: [1, 1.25, 0.95, 1.2, 1], rotate: [0, -8, 6, -4, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        className="flex"
      >
        <Fire className="size-7" />
      </motion.span>
      {count}
    </motion.div>
  )
}

const Leaderboard = ({
  data: { oldLeaderboard, leaderboard, round },
}: Props) => {
  const [displayedLeaderboard, setDisplayedLeaderboard] =
    useState(oldLeaderboard)
  const [isAnimating, setIsAnimating] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(true)
      setDisplayedLeaderboard(leaderboard)
    }, 1600)

    return () => {
      clearTimeout(timer)
    }
  }, [oldLeaderboard, leaderboard])

  return (
    <section className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-2">
      <h2 className="mb-1 text-5xl font-bold text-white drop-shadow-md">
        {round
          ? t("game:round.over", { name: round.name })
          : t("game:leaderboard")}
      </h2>
      {round && (
        <p className="mb-5 text-2xl font-semibold text-white drop-shadow-md">
          {t("game:leaderboard")}
        </p>
      )}
      <div
        className={clsx(
          "flex w-full flex-col gap-2",
          round && "max-h-[65vh] overflow-y-auto",
          !round && "mt-5",
        )}
      >
        <AnimatePresence mode="popLayout">
          {displayedLeaderboard.map(
            ({ id, username, points, streak, bestStreak }) => (
              <motion.div
                key={id}
                layout
                initial={{ opacity: 0, y: 50 }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: 50,
                  transition: { duration: 0.2 },
                }}
                transition={{
                  layout: {
                    type: "spring",
                    stiffness: 350,
                    damping: 25,
                  },
                }}
                className="flex w-full justify-between rounded-xl bg-primary p-3 text-3xl font-bold text-white"
              >
                <span className="flex items-center gap-2 drop-shadow-md">
                  {username}
                  {!round && <StreakBadge streak={streak} />}
                </span>
                {round && bestStreak >= 2 && <BestStreak count={bestStreak} />}
                {isAnimating ? (
                  <AnimatedPoints
                    from={oldLeaderboard.find((u) => u.id === id)?.points ?? 0}
                    to={leaderboard.find((u) => u.id === id)?.points ?? 0}
                  />
                ) : (
                  <span className="drop-shadow-md">{points}</span>
                )}
              </motion.div>
            ),
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

export default Leaderboard
