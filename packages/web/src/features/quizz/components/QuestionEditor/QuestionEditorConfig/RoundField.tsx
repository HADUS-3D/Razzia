import { Flag, ImageIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import Input from "@razzia/web/components/Input"
import BackgroundPicker from "@razzia/web/features/quizz/components/BackgroundPicker"
import ConfigField from "@razzia/web/features/quizz/components/QuestionEditor/QuestionEditorConfig/ConfigField"
import { useQuizzEditor } from "@razzia/web/features/quizz/contexts/quizz-editor-context"

/** Starts a round at the current question: its name and the background of its title slide. */
const RoundField = () => {
  const {
    currentQuestion,
    currentIndex,
    updateQuestion,
    removeMediaReferences,
  } = useQuizzEditor()
  const { t } = useTranslation()
  const { round } = currentQuestion

  const handleName = (name: string) => {
    updateQuestion(currentIndex, {
      round: name.trim() ? { ...round, name } : undefined,
    })
  }

  return (
    <>
      <ConfigField>
        <ConfigField.Label
          icon={<Flag className="size-4" />}
          label={t("quizz:round.label")}
        />
        <Input
          variant="sm"
          value={round?.name ?? ""}
          onChange={(event) => handleName(event.target.value)}
          placeholder={t("quizz:round.placeholder")}
          aria-label={t("quizz:round.label")}
          className="w-full"
        />
        <ConfigField.Description>
          {t("quizz:round.hint")}
        </ConfigField.Description>
      </ConfigField>

      {round && (
        <ConfigField>
          <ConfigField.Label
            icon={<ImageIcon className="size-4" />}
            label={t("quizz:round.background")}
          />
          <ConfigField.Description>
            {t("quizz:round.backgroundHint")}
          </ConfigField.Description>
          <BackgroundPicker
            value={round.background}
            onChange={(background) =>
              updateQuestion(currentIndex, {
                round: { ...round, background },
              })
            }
            onMediaDeleted={({ url }) => removeMediaReferences(url)}
            emptyLabel={t("quizz:background.inherit")}
          />
        </ConfigField>
      )}
    </>
  )
}

export default RoundField
