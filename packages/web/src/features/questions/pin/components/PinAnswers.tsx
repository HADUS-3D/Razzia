import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { PinPosition } from "@razzia/common/types/game"
import type { AnswerComponentProps } from "@razzia/web/features/questions/types"
import Button from "@razzia/web/components/Button"
import PinBoard from "@razzia/web/features/questions/pin/components/PinBoard"
import { pinMode, pinView } from "@razzia/web/features/questions/pin/utils"

const PinAnswers = ({
  media,
  options,
  onSubmit,
  readOnly,
}: AnswerComponentProps) => {
  const { t } = useTranslation()
  const [pin, setPin] = useState<PinPosition | null>(null)
  const mode = pinMode(options)
  const view = pinView(options)

  if (readOnly) {
    return (
      <div className="mx-auto mb-6 w-full max-w-7xl px-2">
        <PinBoard
          mode={mode}
          media={media}
          view={view}
          heightClass="max-h-[55vh]"
          mapHeightClass="h-[55vh]"
        />
      </div>
    )
  }

  return (
    <div className="mx-auto mb-4 flex w-full max-w-3xl flex-col gap-3 px-2">
      <p className="text-center text-sm font-bold text-white drop-shadow-lg md:text-lg">
        {t(pin ? "game:pin.moveHint" : "game:pin.tapHint")}
      </p>

      <PinBoard
        mode={mode}
        media={media}
        view={view}
        onPick={setPin}
        markers={pin ? [pin] : []}
        heightClass="max-h-[45vh]"
        mapHeightClass="h-[45vh]"
      />

      <Button
        disabled={!pin}
        onClick={() => {
          if (pin) {
            onSubmit([], undefined, pin)
          }
        }}
        className="mx-auto w-full max-w-xs shadow-md"
      >
        {t("game:confirm")}
      </Button>
    </div>
  )
}

export default PinAnswers
