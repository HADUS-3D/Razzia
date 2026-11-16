import clsx from "clsx"
import { Plus, X } from "lucide-react"
import { Controller, useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import {
  MAX_PUZZLE_ANSWER_LENGTH,
  PUZZLE_GROUP_SIZE,
  PUZZLE_GROUPS,
} from "@razzia/common/constants"
import FieldError from "@razzia/web/components/forms/FieldError"
import { ANSWERS_COLORS } from "@razzia/web/features/game/utils/constants"
import {
  useQuizzEditor,
  type QuizzFormValues,
} from "@razzia/web/features/quizz/contexts/quizz-editor-context"

const MAX_VARIANTS = 8

const FIELD_CLASS =
  "w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"

const ConnectionFields = ({ group }: { group: number }) => {
  const { questionPath } = useQuizzEditor()
  const { control } = useFormContext<QuizzFormValues>()
  const { t } = useTranslation()

  return (
    <Controller
      control={control}
      name={questionPath(`options.connections.${group}`)}
      render={({ field, fieldState }) => {
        const variants = Array.isArray(field.value) ? field.value : [""]
        const setVariant = (index: number, value: string) =>
          field.onChange(variants.map((v, i) => (i === index ? value : v)))

        return (
          <div className="flex flex-col gap-1.5">
            {variants.map((variant, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <input
                  value={variant}
                  maxLength={MAX_PUZZLE_ANSWER_LENGTH}
                  onChange={(e) => setVariant(index, e.target.value)}
                  onBlur={field.onBlur}
                  aria-invalid={fieldState.invalid}
                  aria-label={
                    index === 0
                      ? t("quizz:question.config.puzzle.connection")
                      : t("quizz:question.config.puzzle.alternative")
                  }
                  placeholder={
                    index === 0
                      ? t("quizz:question.config.puzzle.connectionPlaceholder")
                      : t("quizz:question.config.puzzle.alternativePlaceholder")
                  }
                  className={clsx(FIELD_CLASS, index === 0 && "font-bold")}
                />
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      field.onChange(variants.filter((_, i) => i !== index))
                    }
                    aria-label={t(
                      "quizz:question.config.puzzle.removeAlternative",
                    )}
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-black/20 text-white hover:bg-black/30"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ))}
            {variants.length < MAX_VARIANTS && (
              <button
                type="button"
                onClick={() => field.onChange([...variants, ""])}
                className="flex w-fit items-center gap-1 rounded-lg bg-black/20 px-2 py-1 text-xs font-semibold text-white hover:bg-black/30"
              >
                <Plus className="size-3.5" />
                {t("quizz:question.config.puzzle.addAlternative")}
              </button>
            )}
            <FieldError errors={[fieldState.error]} pill />
          </div>
        )
      }}
    />
  )
}

const PuzzleEditor = () => {
  const { questionPath } = useQuizzEditor()
  const { control } = useFormContext<QuizzFormValues>()
  const { t } = useTranslation()

  return (
    <div className="z-10 flex flex-col gap-3">
      {Array.from({ length: PUZZLE_GROUPS }, (_, group) => (
        <div
          key={group}
          className={clsx(
            "flex flex-col gap-3 rounded-2xl p-4",
            ANSWERS_COLORS[group],
          )}
        >
          <h3 className="text-sm font-bold">
            {t("quizz:question.config.puzzle.groupTitle", {
              number: group + 1,
            })}
          </h3>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {Array.from({ length: PUZZLE_GROUP_SIZE }, (_word, i) => {
              const index = group * PUZZLE_GROUP_SIZE + i

              return (
                <Controller
                  key={index}
                  control={control}
                  name={questionPath(`answers.${index}`)}
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-1">
                      <input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        aria-label={t("quizz:question.config.puzzle.word", {
                          number: index + 1,
                        })}
                        placeholder={t("quizz:question.config.puzzle.word", {
                          number: index + 1,
                        })}
                        className={clsx(
                          FIELD_CLASS,
                          fieldState.invalid && "ring-2 ring-red-500",
                        )}
                      />
                      <FieldError errors={[fieldState.error]} pill />
                    </div>
                  )}
                />
              )
            })}
          </div>

          <ConnectionFields group={group} />
        </div>
      ))}
    </div>
  )
}

export default PuzzleEditor
