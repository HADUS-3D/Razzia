import clsx from "clsx"
import { Check, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type { PinResponse } from "@razzia/common/types/game/status"
import type { ResponsesComponentProps } from "@razzia/web/features/questions/types"
import PinBoard from "@razzia/web/features/questions/pin/components/PinBoard"
import {
  formatPinDistance,
  getPinOptions,
  pinColor,
} from "@razzia/web/features/questions/pin/utils"

/** First every pin shows up on the map, then the right spot and the distances are revealed. */
const REVEAL_DELAY_MS = 3500

const STAGGER_MS = 120

const MAX_STAGGER_MS = 2000

const NO_PINS: PinResponse[] = []

const PinResponses = ({
  data: { media, options, pins: sent },
}: ResponsesComponentProps) => {
  const { t } = useTranslation()
  const pins = sent ?? NO_PINS
  const pinOptions = getPinOptions(options)
  // Revealed once the delay passed for these very pins.
  const [revealedFor, setRevealedFor] = useState<PinResponse[] | null>(null)
  const revealed = revealedFor === pins

  useEffect(() => {
    const timer = setTimeout(() => setRevealedFor(pins), REVEAL_DELAY_MS)

    return () => clearTimeout(timer)
  }, [pins])

  const colored = pins.map((pin, index) => ({ ...pin, color: pinColor(index) }))

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex flex-col items-center gap-3">
        <PinBoard
          mode={pinOptions.mode}
          media={media}
          view={pinOptions.view}
          fit={revealed}
          heightClass="max-h-[60vh]"
          mapHeightClass="h-[60vh]"
          circles={
            revealed
              ? [
                  {
                    x: pinOptions.x,
                    y: pinOptions.y,
                    radius: pinOptions.radius,
                    tone: "right",
                  },
                ]
              : []
          }
          lines={revealed ? { from: pinOptions, to: colored } : undefined}
          markers={[
            ...colored.map((pin, index) => ({
              x: pin.x,
              y: pin.y,
              color: pin.color,
              label: pin.username,
              size: "sm" as const,
              className: "anim-show",
              style: {
                animationDelay: `${Math.min(index * STAGGER_MS, MAX_STAGGER_MS)}ms`,
                animationFillMode: "backwards",
              },
            })),
            ...(revealed
              ? [
                  {
                    x: pinOptions.x,
                    y: pinOptions.y,
                    color: "#22c55e",
                    className: "anim-show",
                  },
                ]
              : []),
          ]}
        />

        <p className="flex items-center gap-2 rounded-lg bg-black/40 px-3 py-1 text-lg font-bold text-white">
          {revealed ? (
            <>
              <Check className="size-5 stroke-4" />
              {t("game:pin.rightSpot")}
            </>
          ) : (
            <>
              <Users className="size-5 stroke-3" />
              {t("game:pin.pinsPlaced", { count: pins.length })}
            </>
          )}
        </p>
      </div>

      {revealed && (
        <ol className="anim-show flex max-h-[60vh] flex-col gap-1.5 self-start overflow-y-auto rounded-2xl bg-white/90 p-3 shadow-lg">
          {colored.length === 0 && (
            <li className="text-center text-sm font-semibold text-muted-foreground">
              {t("game:pin.nobody")}
            </li>
          )}
          {colored.map((pin, index) => (
            <li key={index} className="flex items-center gap-2 text-foreground">
              <span className="w-5 shrink-0 text-right text-sm font-bold text-muted-foreground">
                {index + 1}
              </span>
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ background: pin.color }}
              />
              <span className="min-w-0 flex-1 truncate font-bold">
                {pin.username}
              </span>
              <span className="shrink-0 text-sm font-semibold">
                {formatPinDistance(pin.distance, pinOptions)}
              </span>
              <span
                className={clsx(
                  "w-14 shrink-0 text-right text-sm font-bold",
                  pin.points > 0 ? "text-correct" : "text-muted-foreground",
                )}
              >
                +{pin.points}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default PinResponses
