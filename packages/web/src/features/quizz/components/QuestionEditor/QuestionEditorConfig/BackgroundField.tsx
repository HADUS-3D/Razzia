import { ImageIcon, ImagePlay } from "lucide-react"
import { useTranslation } from "react-i18next"
import { MEDIA_TYPES } from "@razzia/common/constants"
import BackgroundPicker from "@razzia/web/features/quizz/components/BackgroundPicker"
import ConfigField from "@razzia/web/features/quizz/components/QuestionEditor/QuestionEditorConfig/ConfigField"
import { useQuizzEditor } from "@razzia/web/features/quizz/contexts/quizz-editor-context"

const BackgroundField = () => {
  const {
    currentQuestion,
    currentIndex,
    updateQuestion,
    quizzBackground,
    setQuizzBackground,
    removeMediaReferences,
  } = useQuizzEditor()
  const { t } = useTranslation()
  const image =
    currentQuestion.media?.type === MEDIA_TYPES.IMAGE
      ? currentQuestion.media
      : undefined
  const imageIsBackground = image && image.url === currentQuestion.background

  return (
    <>
      <ConfigField>
        <ConfigField.Label
          icon={<ImageIcon className="size-4" />}
          label={t("quizz:background.question")}
        />
        <ConfigField.Description>
          {t("quizz:background.questionHint")}
        </ConfigField.Description>
        <BackgroundPicker
          value={currentQuestion.background}
          onChange={(background) =>
            updateQuestion(currentIndex, { background })
          }
          onMediaDeleted={({ url }) => removeMediaReferences(url)}
          emptyLabel={t("quizz:background.inherit")}
        />
        {image && !imageIsBackground && (
          <button
            type="button"
            onClick={() =>
              updateQuestion(currentIndex, { background: image.url })
            }
            className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-2 py-1.5 text-sm font-semibold text-accent-foreground hover:brightness-[0.97]"
          >
            <ImagePlay className="size-4" />
            {t("quizz:background.useQuestionImage")}
          </button>
        )}
        {imageIsBackground && (
          <ConfigField.Description>
            {t("quizz:background.imageIsBackground")}
          </ConfigField.Description>
        )}
      </ConfigField>

      <ConfigField>
        <ConfigField.Label
          icon={<ImageIcon className="size-4" />}
          label={t("quizz:background.quizz")}
        />
        <ConfigField.Description>
          {t("quizz:background.quizzHint")}
        </ConfigField.Description>
        <BackgroundPicker
          value={quizzBackground}
          onChange={setQuizzBackground}
          onMediaDeleted={({ url }) => removeMediaReferences(url)}
          emptyLabel={t("quizz:background.appDefault")}
        />
      </ConfigField>
    </>
  )
}

export default BackgroundField
