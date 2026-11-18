import { Music } from "lucide-react"
import { useTranslation } from "react-i18next"
import ConfigField from "@razzia/web/features/quizz/components/QuestionEditor/QuestionEditorConfig/ConfigField"
import SoundPicker from "@razzia/web/features/quizz/components/SoundPicker"
import { useQuizzEditor } from "@razzia/web/features/quizz/contexts/quizz-editor-context"

const SoundsField = () => {
  const { currentQuestion, currentIndex, updateQuestion } = useQuizzEditor()
  const { t } = useTranslation()

  const setQuestionSound = (key: "music" | "answerEnd", value?: string) =>
    updateQuestion(currentIndex, {
      sounds: { ...currentQuestion.sounds, [key]: value },
    })

  return (
    <>
      <ConfigField>
        <ConfigField.Label
          icon={<Music className="size-4" />}
          label={t("quizz:sounds.question")}
        />
        <ConfigField.Description>
          {t("quizz:sounds.questionHint")}
        </ConfigField.Description>
        <SoundPicker
          slot="music"
          label={t("quizz:sounds.music")}
          inheritLabel={t("quizz:sounds.inheritQuizz")}
          value={currentQuestion.sounds?.music}
          onChange={(value) => setQuestionSound("music", value)}
        />
        <SoundPicker
          slot="answerEnd"
          label={t("quizz:sounds.answerEnd")}
          inheritLabel={t("quizz:sounds.inheritQuizz")}
          value={currentQuestion.sounds?.answerEnd}
          onChange={(value) => setQuestionSound("answerEnd", value)}
        />
      </ConfigField>
    </>
  )
}

export default SoundsField
