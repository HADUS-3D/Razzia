import clsx from "clsx"
import { ArrowDown, ArrowUp } from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type { CommonStatusDataMap } from "@razzia/common/types/game/status"
import { AnimatedPoints } from "@razzia/web/features/game/components/states/Leaderboard"

interface Props {
  data: CommonStatusDataMap["SHOW_PLAYER_LEADERBOARD"]
}

// Same pause as the big screen, so both show the move at the same moment.
const MOVE_DELAY_MS = 1600

const PlayerLeaderboard = ({ data: { rows, round } }: Props) => {
  const { t } = useTranslation()
  const [moved, setMoved] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMoved(true), MOVE_DELAY_MS)

    return () => clearTimeout(timer)
  }, [])

  const rankOf = (row: Props["data"]["rows"][number]) =>
    moved ? row.rank : row.oldRank
  const ordered = [...rows].sort((a, b) => rankOf(a) - rankOf(b))

  return (
    <section className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-2">
      <h2 className="mb-1 text-center text-3xl font-bold text-white drop-shadow-md">
        {round
          ? t("game:round.over", { name: round.name })
          : t("game:leaderboard")}
      </h2>
      {round && (
        <p className="mb-3 text-xl font-semibold text-white drop-shadow-md">
          {t("game:leaderboard")}
        </p>
      )}
      <div className="mt-3 flex w-full flex-col gap-2">
        {ordered.map((row, index) => {
          const gap = index > 0 && rankOf(row) - rankOf(ordered[index - 1]) > 1
          const change = row.oldRank - row.rank

          return (
            <motion.div
              key={row.id}
              layout
              transition={{
                layout: { type: "spring", stiffness: 350, damping: 25 },
              }}
              className="flex flex-col gap-1"
            >
              {gap && (
                <span
                  aria-hidden
                  className="text-center text-xl leading-none text-white/70"
                >
                  &#8942;
                </span>
              )}
              <div
                className={clsx(
                  "flex w-full items-center gap-3 rounded-xl p-3 text-xl font-bold text-white",
                  row.me
                    ? "bg-accent text-black ring-4 ring-white"
                    : "bg-primary",
                )}
              >
                <span className="w-8 shrink-0 text-center">{rankOf(row)}</span>
                <span className="min-w-0 flex-1 truncate">{row.username}</span>
                {moved && change !== 0 && (
                  <span
                    role="img"
                    aria-label={t("game:playerLeaderboard.change", {
                      count: Math.abs(change),
                    })}
                    className={clsx(
                      "flex items-center text-base",
                      change > 0 ? "text-green-300" : "text-red-300",
                    )}
                  >
                    {change > 0 ? (
                      <ArrowUp className="size-5" />
                    ) : (
                      <ArrowDown className="size-5" />
                    )}
                    {Math.abs(change)}
                  </span>
                )}
                {moved ? (
                  <AnimatedPoints from={row.oldPoints} to={row.points} />
                ) : (
                  <span className="drop-shadow-md">{row.oldPoints}</span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

export default PlayerLeaderboard
