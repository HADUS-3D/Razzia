import {
  ArrowBigDownDash,
  Clock,
  ListChecks,
  Star,
  Timer,
  Trophy,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import type { ScoringMode } from "@razzia/common/types/game"
import {
  MAX_POINTS,
  NO_TIME_LIMIT,
  QUIZZ_MODES,
} from "@razzia/common/constants"
import { isMultiOptions } from "@razzia/common/questions/options"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@razzia/web/components/Select"
import Switch from "@razzia/web/components/Switch"
import { QUESTION_REGISTRY } from "@razzia/web/features/questions"
import ConfigField from "@razzia/web/features/quizz/components/QuestionEditor/QuestionEditorConfig/ConfigField"
import ConfigNumberInput from "@razzia/web/features/quizz/components/QuestionEditor/QuestionEditorConfig/ConfigNumberInput"
import ConfigSection from "@razzia/web/features/quizz/components/QuestionEditor/QuestionEditorConfig/ConfigSection"
import { useQuizzEditor } from "@razzia/web/features/quizz/contexts/quizz-editor-context"

const DEFAULT_TIME = 20
const DEFAULT_PENALTY = 100
const DEFAULT_PENALTY_PERCENT = 25
const DEFAULT_TOP_PERCENT = 20

type PenaltyType = "points" | "percent"

const BaseConfig = () => {
  const { currentQuestion, currentIndex, gameMode, updateQuestion } =
    useQuizzEditor()
  const { t } = useTranslation()
  const isTimeLimitEnabled = currentQuestion.time !== NO_TIME_LIMIT
  const isPercentPenalty = currentQuestion.penaltyPercent !== undefined
  const isPenaltyEnabled =
    (currentQuestion.penalty ?? 0) > 0 || isPercentPenalty
  const penaltyType: PenaltyType = isPercentPenalty ? "percent" : "points"
  const penaltyUnit = isPercentPenalty ? "%" : "pts"
  const isTopChallenge = currentQuestion.topPercent !== undefined
  const { scoringModes } = QUESTION_REGISTRY[currentQuestion.type]
  const { options } = currentQuestion
  const scoringMode = isMultiOptions(options) ? options.scoringMode : undefined

  const handleScoringModeChange = (nextMode: ScoringMode) => {
    updateQuestion(currentIndex, { options: { scoringMode: nextMode } })
  }

  const handleToggleTimeLimit = (checked: boolean) => {
    updateQuestion(currentIndex, {
      time: checked ? DEFAULT_TIME : NO_TIME_LIMIT,
    })
  }

  const handleTogglePenalty = (checked: boolean) => {
    updateQuestion(currentIndex, {
      penalty: checked ? DEFAULT_PENALTY : undefined,
      penaltyPercent: undefined,
    })
  }

  const handlePenaltyType = (type: PenaltyType) => {
    updateQuestion(
      currentIndex,
      type === "percent"
        ? { penalty: undefined, penaltyPercent: DEFAULT_PENALTY_PERCENT }
        : { penalty: DEFAULT_PENALTY, penaltyPercent: undefined },
    )
  }

  const handleToggleTopChallenge = (checked: boolean) => {
    updateQuestion(currentIndex, {
      topPercent: checked ? DEFAULT_TOP_PERCENT : undefined,
    })
  }

  const scoringOptions = scoringModes?.map((value) => ({
    value,
    label: t(`quizz:question.config.scoringMode.${value}`),
  }))

  return (
    <>
      {gameMode !== QUIZZ_MODES.SURVEY && (
        <ConfigSection title={t("quizz:question.config.scoring")}>
          <ConfigField>
            <ConfigField.Label
              icon={<Star className="size-4" />}
              label={t("quizz:question.config.maxPoints")}
              unit="pts"
            />
            <ConfigNumberInput
              name="maxPoints"
              label={t("quizz:question.config.maxPoints")}
              fallback={MAX_POINTS}
              min={0}
            />
            <ConfigField.Description>
              {t("quizz:question.config.maxPointsHint")}
            </ConfigField.Description>
          </ConfigField>

          <ConfigField>
            <ConfigField.Label
              icon={<ArrowBigDownDash className="size-4" />}
              label={t("quizz:question.config.penalty")}
              unit={isPenaltyEnabled ? penaltyUnit : undefined}
              action={
                <Switch
                  aria-label={t("quizz:question.config.penalty")}
                  checked={isPenaltyEnabled}
                  onCheckedChange={handleTogglePenalty}
                />
              }
            />
            {isPenaltyEnabled && (
              <>
                <Select value={penaltyType} onValueChange={handlePenaltyType}>
                  <SelectTrigger
                    aria-label={t("quizz:question.config.penaltyType")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["points", "percent"] as const).map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`quizz:question.config.penaltyType.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isPercentPenalty ? (
                  <ConfigNumberInput
                    name="penaltyPercent"
                    label={t("quizz:question.config.penalty")}
                    fallback={DEFAULT_PENALTY_PERCENT}
                    min={1}
                    max={100}
                  />
                ) : (
                  <ConfigNumberInput
                    name="penalty"
                    label={t("quizz:question.config.penalty")}
                    fallback={DEFAULT_PENALTY}
                    min={1}
                  />
                )}
              </>
            )}
            <ConfigField.Description>
              {isPercentPenalty
                ? t("quizz:question.config.penaltyPercentHint")
                : t("quizz:question.config.penaltyHint")}
            </ConfigField.Description>
          </ConfigField>

          <ConfigField>
            <ConfigField.Label
              icon={<Trophy className="size-4" />}
              label={t("quizz:question.config.topChallenge")}
              unit={isTopChallenge ? "%" : undefined}
              action={
                <Switch
                  aria-label={t("quizz:question.config.topChallenge")}
                  checked={isTopChallenge}
                  onCheckedChange={handleToggleTopChallenge}
                />
              }
            />
            {isTopChallenge && (
              <ConfigNumberInput
                name="topPercent"
                label={t("quizz:question.config.topPercent")}
                fallback={DEFAULT_TOP_PERCENT}
                min={1}
                max={100}
              />
            )}
            <ConfigField.Description>
              {t("quizz:question.config.topChallengeHint")}
            </ConfigField.Description>
          </ConfigField>

          {scoringModes && scoringMode && (
            <ConfigField>
              <ConfigField.Label
                icon={<ListChecks className="size-4" />}
                label={t("quizz:question.config.scoringMode")}
              />
              <Select
                value={scoringMode}
                onValueChange={handleScoringModeChange}
              >
                <SelectTrigger
                  aria-label={t("quizz:question.config.scoringMode")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scoringOptions?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ConfigField.Description>
                {t(`quizz:question.config.scoringModeHint.${scoringMode}`)}
              </ConfigField.Description>
            </ConfigField>
          )}
        </ConfigSection>
      )}

      <ConfigSection title={t("quizz:question.config.timings")}>
        <ConfigField>
          <ConfigField.Label
            icon={<Clock className="size-4" />}
            label={t("quizz:question.config.questionDisplay")}
            unit="sec"
          />
          <ConfigNumberInput
            name="cooldown"
            label={t("quizz:question.config.questionDisplay")}
            min={3}
            max={15}
          />
          <ConfigField.Description>
            {t("quizz:question.config.questionDisplayHint")}
          </ConfigField.Description>
        </ConfigField>

        <ConfigField>
          <ConfigField.Label
            icon={<Timer className="size-4" />}
            label={t("quizz:question.config.answerTime")}
            unit={isTimeLimitEnabled ? "sec" : undefined}
            action={
              <Switch
                aria-label={t("quizz:question.config.answerTime")}
                checked={isTimeLimitEnabled}
                onCheckedChange={handleToggleTimeLimit}
              />
            }
          />
          {isTimeLimitEnabled && (
            <ConfigNumberInput
              name="time"
              label={t("quizz:question.config.answerTime")}
              min={5}
            />
          )}
          <ConfigField.Description>
            {isTimeLimitEnabled
              ? t("quizz:question.config.answerTimeHint")
              : t("quizz:question.config.noTimeLimitHint")}
          </ConfigField.Description>
        </ConfigField>
      </ConfigSection>
    </>
  )
}

export default BaseConfig
