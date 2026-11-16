import clsx from "clsx"
import { Check, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { CommonStatusDataMap } from "@razzia/common/types/game/status"

interface Props {
  groups: NonNullable<CommonStatusDataMap["SHOW_RESULT"]["puzzle"]>["groups"]
}

/** The right connection of every puzzle group next to what the player typed. */
const PuzzleSolution = ({ groups }: Props) => {
  const { t } = useTranslation()
  const found = groups.filter((group) => group.correct).length

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-2">
      <p className="text-center text-lg font-bold text-white drop-shadow-lg">
        {t("game:puzzle.found", { count: found, total: groups.length })}
      </p>
      {groups.map((group, index) => (
        <div
          key={index}
          className="anim-show flex flex-col gap-1 rounded-xl bg-white px-4 py-2 text-foreground shadow-lg"
        >
          <p className="flex items-center gap-2 font-bold">
            {group.correct ? (
              <Check className="size-5 shrink-0 stroke-4 text-correct" />
            ) : (
              <X className="size-5 shrink-0 stroke-4 text-red-500" />
            )}
            <span className="min-w-0 wrap-anywhere">{group.connection}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {group.words.join(", ")}
          </p>
          {!group.correct && (
            <p
              className={clsx("text-sm font-semibold text-red-600", {
                italic: !group.given,
              })}
            >
              {group.given || t("game:puzzle.noAnswer")}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

export default PuzzleSolution
