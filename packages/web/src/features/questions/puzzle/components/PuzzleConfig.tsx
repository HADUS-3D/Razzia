import { useTranslation } from "react-i18next"
import BaseConfig from "@razzia/web/features/quizz/components/QuestionEditor/QuestionEditorConfig/BaseConfig"
import ConfigField from "@razzia/web/features/quizz/components/QuestionEditor/QuestionEditorConfig/ConfigField"
import ConfigSection from "@razzia/web/features/quizz/components/QuestionEditor/QuestionEditorConfig/ConfigSection"

const PuzzleConfig = () => {
  const { t } = useTranslation()

  return (
    <>
      <ConfigSection title={t("quizz:question.config.puzzle.title")}>
        <ConfigField.Description>
          {t("quizz:question.config.puzzle.hint")}
        </ConfigField.Description>
        <ConfigField.Description>
          {t("quizz:question.config.puzzle.spellingHint")}
        </ConfigField.Description>
      </ConfigSection>

      <BaseConfig />
    </>
  )
}

export default PuzzleConfig
