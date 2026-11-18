import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Music, X } from "lucide-react"
import { Dialog } from "radix-ui"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"
import type { ResolvedSounds } from "@razzia/common/types/game"
import {
  settingsKeys,
  settingsQuery,
  updateSettings,
} from "@razzia/web/features/manager/queries"
import SoundPicker from "@razzia/web/features/quizz/components/SoundPicker"
import { ApiError } from "@razzia/web/lib/api"

const DEFAULT_VOLUME = 100

const AppSoundsDialog = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: settings } = useQuery(settingsQuery())
  const sounds = settings?.sounds

  const { mutate } = useMutation({
    mutationFn: updateSettings,
    onSuccess: (saved) => {
      queryClient.setQueryData(settingsKeys.all, saved)
      toast.success(t("manager:sounds.saved"))
    },
    onError: (error) =>
      toast.error(
        t(error instanceof ApiError ? error.key : "errors:route.description"),
      ),
  })

  const change = (
    key: keyof ResolvedSounds,
    value: string | number | undefined,
  ) => mutate({ ...settings, sounds: { ...sounds, [key]: value } })

  return (
    <Dialog.Root>
      <Dialog.Trigger
        className="rounded-sm p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        title={t("manager:sounds.title")}
      >
        <Music className="size-4" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-fade" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-background p-5 shadow-xl data-[state=open]:animate-fade"
        >
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              {t("manager:sounds.title")}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t("common:close")}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            {t("manager:sounds.hint")}
          </p>

          <div className="flex flex-col gap-3">
            <SoundPicker
              slot="music"
              label={t("quizz:sounds.music")}
              inheritLabel={t("quizz:sounds.default")}
              value={sounds?.music}
              onChange={(value) => change("music", value)}
            />
            <SoundPicker
              slot="answerEnd"
              label={t("quizz:sounds.answerEnd")}
              inheritLabel={t("quizz:sounds.default")}
              value={sounds?.answerEnd}
              onChange={(value) => change("answerEnd", value)}
            />
            <SoundPicker
              slot="leaderboard"
              label={t("quizz:sounds.leaderboard")}
              inheritLabel={t("quizz:sounds.default")}
              value={sounds?.leaderboard}
              onChange={(value) => change("leaderboard", value)}
            />
            <SoundPicker
              slot="podium"
              label={t("quizz:sounds.podium")}
              inheritLabel={t("quizz:sounds.default")}
              value={sounds?.podium}
              onChange={(value) => change("podium", value)}
            />

            <label className="flex flex-col gap-1.5">
              <span className="flex justify-between text-xs font-semibold text-muted-foreground">
                {t("manager:sounds.volume")}
                <span>{sounds?.volume ?? DEFAULT_VOLUME}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                defaultValue={sounds?.volume ?? DEFAULT_VOLUME}
                key={sounds?.volume}
                onPointerUp={(e) =>
                  change("volume", Number(e.currentTarget.value))
                }
                onKeyUp={(e) => change("volume", Number(e.currentTarget.value))}
              />
            </label>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default AppSoundsDialog
