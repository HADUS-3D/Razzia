import { Gauge, ImageIcon, Info, Music, Settings, X } from "lucide-react"
import { Dialog } from "radix-ui"
import { useController, useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { QUIZZ_MODES } from "@razzia/common/constants"
import Button from "@razzia/web/components/Button"
import Input from "@razzia/web/components/Input"
import Switch from "@razzia/web/components/Switch"
import BackgroundPicker from "@razzia/web/features/quizz/components/BackgroundPicker"
import ConfigField from "@razzia/web/features/quizz/components/QuestionEditor/QuestionEditorConfig/ConfigField"
import SoundPicker from "@razzia/web/features/quizz/components/SoundPicker"
import {
  useQuizzEditor,
  type QuizzFormValues,
} from "@razzia/web/features/quizz/contexts/quizz-editor-context"

type QuizzSoundKey = "music" | "answerEnd" | "leaderboard" | "podium"

const SpeedBonusField = () => {
  const { t } = useTranslation()
  const { control } = useFormContext<QuizzFormValues>()
  const { field } = useController({ control, name: "speedBonus" })
  const value = field.value ?? 100

  return (
    <ConfigField>
      <ConfigField.Label
        icon={<Gauge className="size-4" />}
        label={t("quizz:question.config.speedBonus")}
        unit="%"
      />
      <Input
        variant="sm"
        type="number"
        min={0}
        max={100}
        aria-label={t("quizz:question.config.speedBonus")}
        value={value}
        onChange={(e) => {
          const num = Number(e.target.value)

          if (e.target.value !== "" && !isNaN(num)) {
            field.onChange(Math.min(100, Math.max(0, Math.round(num))))
          }
        }}
        className="w-full"
      />
      <ConfigField.Description>
        {t("quizz:question.config.speedBonusHint")}
      </ConfigField.Description>
    </ConfigField>
  )
}

const IntroField = () => {
  const { t } = useTranslation()
  const { control } = useFormContext<QuizzFormValues>()
  const { field } = useController({ control, name: "intro" })

  return (
    <ConfigField>
      <ConfigField.Label
        icon={<Info className="size-4" />}
        label={t("quizz:settings.intro")}
        action={
          <Switch
            aria-label={t("quizz:settings.intro")}
            checked={field.value === true}
            onCheckedChange={(checked) =>
              field.onChange(checked ? true : undefined)
            }
          />
        }
      />
      <ConfigField.Description>
        {t("quizz:settings.introHint")}
      </ConfigField.Description>
    </ConfigField>
  )
}

/** Everything that applies to the whole quizz instead of the selected question. */
const QuizzSettingsDialog = () => {
  const {
    gameMode,
    quizzBackground,
    setQuizzBackground,
    quizzSounds,
    setQuizzSounds,
    removeMediaReferences,
  } = useQuizzEditor()
  const { t } = useTranslation()
  const isQuiz = gameMode === QUIZZ_MODES.QUIZ

  const setSound = (key: QuizzSoundKey, value?: string) =>
    setQuizzSounds({ ...quizzSounds, [key]: value })

  const soundPicker = (key: QuizzSoundKey, label: string) => (
    <SoundPicker
      slot={key}
      label={label}
      inheritLabel={t("quizz:sounds.inheritApp")}
      value={quizzSounds?.[key]}
      onChange={(value) => setSound(key, value)}
    />
  )

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          className="text-md flex items-center gap-2 bg-accent px-4 py-2 font-semibold text-accent-foreground"
          title={t("quizz:settings.open")}
        >
          <Settings className="size-5" />
          {t("quizz:settings.open")}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-xl bg-background p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">
                {t("quizz:settings.title")}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                {t("quizz:settings.description")}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="rounded-sm p-1 text-muted-foreground hover:bg-accent"
              aria-label={t("common:close")}
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="mt-4 flex flex-col gap-5">
            <IntroField />

            {isQuiz && <SpeedBonusField />}

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

            <ConfigField>
              <ConfigField.Label
                icon={<Music className="size-4" />}
                label={t("quizz:sounds.quizz")}
              />
              <ConfigField.Description>
                {t("quizz:sounds.quizzHint")}
              </ConfigField.Description>
              {soundPicker("music", t("quizz:sounds.music"))}
              {soundPicker("answerEnd", t("quizz:sounds.answerEnd"))}
              {isQuiz &&
                soundPicker("leaderboard", t("quizz:sounds.leaderboard"))}
              {soundPicker("podium", t("quizz:sounds.podium"))}
            </ConfigField>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default QuizzSettingsDialog
