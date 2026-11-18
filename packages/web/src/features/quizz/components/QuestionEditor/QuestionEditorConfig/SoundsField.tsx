import { Music } from "lucide-react"
import { useTranslation } from "react-i18next"
import { QUIZZ_MODES } from "@razzia/common/constants"
import ConfigField from "@razzia/web/features/quizz/components/QuestionEditor/QuestionEditorConfig/ConfigField"
import SoundPicker from "@razzia/web/features/quizz/components/SoundPicker"
import { useQuizzEditor } from "@razzia/web/features/quizz/contexts/quizz-editor-context"

const SoundsField = () => {
  const {
    currentQuestion,
    currentIndex,
    gameMode,
    updateQuestion,
    quizzSounds,
    setQuizzSounds,
  } = useQuizzEditor()
  const { t } = useTranslation()
  const isQuiz = gameMode === QUIZZ_MODES.QUIZ

  const setQuestionSound = (key: "music" | "answerEnd", value?: string) =>
    updateQuestion(currentIndex, {
      sounds: { ...currentQuestion.sounds, [key]: value },
    })

  const setQuizzSound = (
    key: "music" | "answerEnd" | "leaderboard" | "podium",
    value?: string,
  ) => setQuizzSounds({ ...quizzSounds, [key]: value })

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

      <ConfigField>
        <ConfigField.Label
          icon={<Music className="size-4" />}
          label={t("quizz:sounds.quizz")}
        />
        <ConfigField.Description>
          {t("quizz:sounds.quizzHint")}
        </ConfigField.Description>
        <SoundPicker
          slot="music"
          label={t("quizz:sounds.music")}
          inheritLabel={t("quizz:sounds.inheritApp")}
          value={quizzSounds?.music}
          onChange={(value) => setQuizzSound("music", value)}
        />
        <SoundPicker
          slot="answerEnd"
          label={t("quizz:sounds.answerEnd")}
          inheritLabel={t("quizz:sounds.inheritApp")}
          value={quizzSounds?.answerEnd}
          onChange={(value) => setQuizzSound("answerEnd", value)}
        />
        {isQuiz && (
          <SoundPicker
            slot="leaderboard"
            label={t("quizz:sounds.leaderboard")}
            inheritLabel={t("quizz:sounds.inheritApp")}
            value={quizzSounds?.leaderboard}
            onChange={(value) => setQuizzSound("leaderboard", value)}
          />
        )}
        <SoundPicker
          slot="podium"
          label={t("quizz:sounds.podium")}
          inheritLabel={t("quizz:sounds.inheritApp")}
          value={quizzSounds?.podium}
          onChange={(value) => setQuizzSound("podium", value)}
        />
      </ConfigField>
    </>
  )
}

export default SoundsField
