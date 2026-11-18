import { useTranslation } from "react-i18next"
import type { CommonStatusDataMap } from "@razzia/common/types/game/status"
import PinBoard from "@razzia/web/features/questions/pin/components/PinBoard"
import { formatPinDistance } from "@razzia/web/features/questions/pin/utils"

interface Props {
  pin: NonNullable<CommonStatusDataMap["SHOW_RESULT"]["pin"]>
}

/** The field with the player's pin, the right spot and the distance in between. */
const PinSolution = ({ pin: { media, options, guess, distance } }: Props) => {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-2">
      <p className="text-center text-lg font-bold text-white drop-shadow-lg">
        {distance === null
          ? t("game:pin.noAnswer")
          : t("game:pin.distance", {
              distance: formatPinDistance(distance, options),
            })}
      </p>
      <PinBoard
        mode={options.mode}
        media={media}
        view={options.view}
        fit
        heightClass="max-h-[35vh]"
        mapHeightClass="h-[35vh]"
        circles={[
          {
            x: options.x,
            y: options.y,
            radius: options.radius,
            tone: "right",
          },
        ]}
        lines={
          guess
            ? { from: options, to: [{ ...guess, color: "#ffffff" }] }
            : undefined
        }
        markers={[
          { x: options.x, y: options.y, color: "#22c55e", size: "sm" },
          ...(guess ? [guess] : []),
        ]}
      />
    </div>
  )
}

export default PinSolution
