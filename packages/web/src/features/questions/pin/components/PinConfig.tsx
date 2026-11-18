import { CircleDot, Map, Ruler, Target } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { PinMode } from "@razzia/common/types/game"
import { MAX_PIN_UNIT_LENGTH, PIN_MODES } from "@razzia/common/constants"
import {
  defaultMapPinOptions,
  defaultPinOptions,
} from "@razzia/common/questions/pin"
import Input from "@razzia/web/components/Input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@razzia/web/components/Select"
import { getPinOptions } from "@razzia/web/features/questions/pin/utils"
import BaseConfig from "@razzia/web/features/quizz/components/QuestionEditor/QuestionEditorConfig/BaseConfig"
import ConfigField from "@razzia/web/features/quizz/components/QuestionEditor/QuestionEditorConfig/ConfigField"
import ConfigNumberInput from "@razzia/web/features/quizz/components/QuestionEditor/QuestionEditorConfig/ConfigNumberInput"
import ConfigSection from "@razzia/web/features/quizz/components/QuestionEditor/QuestionEditorConfig/ConfigSection"
import { useQuizzEditor } from "@razzia/web/features/quizz/contexts/quizz-editor-context"

const PinConfig = () => {
  const { currentQuestion, currentIndex, updateQuestion } = useQuizzEditor()
  const { t } = useTranslation()
  const options = getPinOptions(currentQuestion.options)
  const isMap = options.mode === PIN_MODES.MAP

  const handleModeChange = (mode: PinMode) => {
    if (mode === options.mode || (mode === PIN_MODES.IMAGE && !isMap)) {
      return
    }

    // The two kinds do not share positions or distances, so each starts afresh.
    updateQuestion(currentIndex, {
      options:
        mode === PIN_MODES.MAP ? defaultMapPinOptions() : defaultPinOptions(),
    })
  }

  return (
    <>
      <ConfigSection title={t("quizz:question.config.pin.title")}>
        <ConfigField.Description>
          {t("quizz:question.config.pin.hint")}
        </ConfigField.Description>

        <ConfigField>
          <ConfigField.Label
            icon={<Map className="size-4" />}
            label={t("quizz:question.config.pin.mode")}
          />
          <Select
            value={isMap ? PIN_MODES.MAP : PIN_MODES.IMAGE}
            onValueChange={handleModeChange}
          >
            <SelectTrigger aria-label={t("quizz:question.config.pin.mode")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(PIN_MODES).map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {t(`quizz:question.config.pin.modes.${mode}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ConfigField>

        <ConfigField>
          <ConfigField.Label
            icon={<Target className="size-4" />}
            label={t("quizz:question.config.pin.radius")}
            unit={isMap ? "km" : "%"}
          />
          <ConfigNumberInput
            name="options.radius"
            label={t("quizz:question.config.pin.radius")}
            min={0}
            max={isMap ? 20_000 : 100}
          />
          <ConfigField.Description>
            {t(
              isMap
                ? "quizz:question.config.pin.radiusHintMap"
                : "quizz:question.config.pin.radiusHint",
            )}
          </ConfigField.Description>
        </ConfigField>

        <ConfigField>
          <ConfigField.Label
            icon={<CircleDot className="size-4" />}
            label={t("quizz:question.config.pin.maxDistance")}
            unit={isMap ? "km" : "%"}
          />
          <ConfigNumberInput
            name="options.maxDistance"
            label={t("quizz:question.config.pin.maxDistance")}
            min={1}
            max={isMap ? 20_000 : 200}
          />
          <ConfigField.Description>
            {t("quizz:question.config.pin.maxDistanceHint")}
          </ConfigField.Description>
        </ConfigField>

        {!isMap && (
          <ConfigField>
            <ConfigField.Label
              icon={<Ruler className="size-4" />}
              label={t("quizz:question.config.pin.imageWidth")}
            />
            <ConfigNumberInput
              name="options.imageWidth"
              label={t("quizz:question.config.pin.imageWidth")}
              fallback={0}
              min={0}
            />
            <Input
              variant="sm"
              maxLength={MAX_PIN_UNIT_LENGTH}
              aria-label={t("quizz:question.config.pin.unit")}
              placeholder={t("quizz:question.config.pin.unitPlaceholder")}
              value={options.unit ?? ""}
              onChange={(e) =>
                updateQuestion(currentIndex, {
                  options: { ...options, unit: e.target.value },
                })
              }
              className="w-full"
            />
            <ConfigField.Description>
              {t("quizz:question.config.pin.imageWidthHint")}
            </ConfigField.Description>
          </ConfigField>
        )}
      </ConfigSection>

      <BaseConfig />
    </>
  )
}

export default PinConfig
