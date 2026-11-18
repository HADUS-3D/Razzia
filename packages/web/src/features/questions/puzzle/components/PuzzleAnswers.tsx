import clsx from "clsx"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { AnswerComponentProps } from "@razzia/web/features/questions/types"
import {
  MAX_PUZZLE_ANSWER_LENGTH,
  PUZZLE_GROUPS,
} from "@razzia/common/constants"
import Button from "@razzia/web/components/Button"
import Input from "@razzia/web/components/Input"

const Word = ({ children }: { children: string }) => (
  <span className="flex min-h-11 items-center justify-center rounded-lg bg-white px-1.5 py-1 text-center text-sm leading-tight font-bold wrap-anywhere text-foreground shadow-md md:min-h-14 md:text-xl">
    {children}
  </span>
)

const PuzzleAnswers = ({
  answers,
  onSubmit,
  readOnly,
  fill,
}: AnswerComponentProps) => {
  const { t } = useTranslation()
  const [texts, setTexts] = useState<string[]>(() =>
    Array.from({ length: PUZZLE_GROUPS }, () => ""),
  )

  const canSubmit = texts.some((text) => text.trim() !== "")

  // The words are only shown on the big screen: on a phone they would crowd
  // out the fields and the button.
  if (readOnly) {
    return (
      <div className="mx-auto w-full max-w-7xl px-2">
        <div className="mb-6 grid w-full grid-cols-4 gap-1.5 md:gap-3">
          {answers.map((word, i) => (
            <Word key={i}>{word}</Word>
          ))}
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()

        if (canSubmit) {
          onSubmit([], texts)
        }
      }}
      className={clsx(
        "mx-auto mb-4 flex w-full max-w-3xl flex-col gap-3 px-2",
        fill && "flex-1 justify-center",
      )}
    >
      <p className="text-center text-lg font-bold text-white drop-shadow-lg">
        {t("game:puzzle.hint")}
      </p>

      {texts.map((text, group) => (
        <Input
          key={group}
          value={text}
          maxLength={MAX_PUZZLE_ANSWER_LENGTH}
          onChange={(e) =>
            setTexts((current) =>
              current.map((value, i) => (i === group ? e.target.value : value)),
            )
          }
          placeholder={t("game:puzzle.placeholder")}
          aria-label={t("game:puzzle.connection", { number: group + 1 })}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="w-full bg-white shadow-md"
        />
      ))}

      <Button
        type="submit"
        disabled={!canSubmit}
        className="mx-auto w-full max-w-xs shadow-md"
      >
        {t("game:confirm")}
      </Button>
    </form>
  )
}

export default PuzzleAnswers
