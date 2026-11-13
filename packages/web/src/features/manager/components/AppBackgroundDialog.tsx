import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Image, X } from "lucide-react"
import { Dialog } from "radix-ui"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"
import {
  settingsKeys,
  settingsQuery,
  updateSettings,
} from "@razzia/web/features/manager/queries"
import BackgroundPicker from "@razzia/web/features/quizz/components/BackgroundPicker"
import { ApiError } from "@razzia/web/lib/api"

const AppBackgroundDialog = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: settings } = useQuery(settingsQuery())

  const { mutate } = useMutation({
    mutationFn: updateSettings,
    onSuccess: (saved) => {
      queryClient.setQueryData(settingsKeys.all, saved)
      toast.success(t("manager:background.saved"))
    },
    onError: (error) =>
      toast.error(
        t(error instanceof ApiError ? error.key : "errors:route.description"),
      ),
  })

  const handleChange = (background: string | undefined) => {
    mutate({ ...settings, background })
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger
        className="rounded-sm p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        title={t("manager:background.title")}
      >
        <Image className="size-4" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-fade" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-5 shadow-xl data-[state=open]:animate-fade"
        >
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              {t("manager:background.title")}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t("common:close")}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            {t("manager:background.hint")}
          </p>
          <BackgroundPicker
            value={settings?.background}
            onChange={handleChange}
            onMediaDeleted={({ url }) => {
              if (settings?.background === url) {
                handleChange(undefined)
              }
            }}
            emptyLabel={t("manager:background.stock")}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default AppBackgroundDialog
