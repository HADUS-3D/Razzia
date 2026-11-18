import { ImagePlus } from "lucide-react"
import {
  useFormContext,
  type FieldError as RhfFieldError,
} from "react-hook-form"
import { useTranslation } from "react-i18next"
import { MEDIA_TYPES, PIN_MODES } from "@razzia/common/constants"
import FieldError from "@razzia/web/components/forms/FieldError"
import PinBoard from "@razzia/web/features/questions/pin/components/PinBoard"
import {
  getPinOptions,
  pinMode,
} from "@razzia/web/features/questions/pin/utils"
import {
  useQuizzEditor,
  type QuizzFormValues,
} from "@razzia/web/features/quizz/contexts/quizz-editor-context"

const round = (value: number, factor: number) =>
  Math.round(value * factor) / factor

const ASPECT_EPSILON = 0.001

const PinEditor = () => {
  const { currentQuestion, currentIndex, questionPath, updateQuestion } =
    useQuizzEditor()
  const { getFieldState, formState } = useFormContext<QuizzFormValues>()
  const { t } = useTranslation()
  const options = getPinOptions(currentQuestion.options)
  const { media } = currentQuestion
  const mediaError = getFieldState(questionPath("media"), formState).error as
    | RhfFieldError
    | undefined

  const isMap = pinMode(currentQuestion.options) === PIN_MODES.MAP

  if (!isMap && media?.type !== MEDIA_TYPES.IMAGE) {
    return (
      <div className="z-10 flex flex-col gap-1">
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white px-5 py-8 text-center shadow-sm">
          <ImagePlus className="size-10 text-accent-foreground" />
          <p className="text-sm font-semibold text-foreground">
            {t("quizz:question.config.pin.needsImage")}
          </p>
        </div>
        <FieldError errors={[mediaError]} pill />
      </div>
    )
  }

  return (
    <div className="z-10 flex flex-col gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm">
      <p className="text-center text-sm font-semibold text-foreground">
        {t(
          isMap
            ? "quizz:question.config.pin.placeHintMap"
            : "quizz:question.config.pin.placeHint",
        )}
      </p>

      <PinBoard
        mode={options.mode}
        media={media}
        view={options.view}
        heightClass="max-h-[60vh]"
        mapHeightClass="h-[60vh]"
        onPick={({ x, y }) =>
          updateQuestion(currentIndex, {
            options: {
              ...options,
              x: round(x, isMap ? 10_000 : 10),
              y: round(y, isMap ? 10_000 : 10),
            },
          })
        }
        onLoadAspect={(aspect) => {
          if (Math.abs((options.aspect ?? 1) - aspect) > ASPECT_EPSILON) {
            updateQuestion(currentIndex, { options: { ...options, aspect } })
          }
        }}
        onViewChange={(view) =>
          updateQuestion(currentIndex, {
            options: {
              ...options,
              view: {
                lat: round(view.lat, 10_000),
                lng: round(view.lng, 10_000),
                zoom: view.zoom,
              },
            },
          })
        }
        circles={[
          {
            x: options.x,
            y: options.y,
            radius: options.maxDistance,
            tone: "limit",
          },
          {
            x: options.x,
            y: options.y,
            radius: options.radius,
            tone: "right",
          },
        ]}
        markers={[{ x: options.x, y: options.y, color: "#22c55e" }]}
      />

      <p className="text-center text-xs text-muted-foreground">
        {t(
          isMap
            ? "quizz:question.config.pin.legendMap"
            : "quizz:question.config.pin.legend",
        )}
      </p>
      <FieldError errors={[mediaError]} pill />
    </div>
  )
}

export default PinEditor
