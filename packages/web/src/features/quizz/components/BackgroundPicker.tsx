import { ImageOff, Library, Upload, X } from "lucide-react"
import { useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"
import type { UploadedMedia } from "@razzia/common/types/game"
import { ACCEPTED_MEDIA_TYPES, MEDIA_TYPES } from "@razzia/common/constants"
import Loader from "@razzia/web/components/Loader"
import MediaLibrary from "@razzia/web/features/quizz/components/QuestionEditor/MediaLibrary"
import { useUploadMedia } from "@razzia/web/features/quizz/hooks/useUploadMedia"

const IMAGE_ACCEPT = Object.entries(ACCEPTED_MEDIA_TYPES)
  .filter(([, { type }]) => type === MEDIA_TYPES.IMAGE)
  .flatMap(([mime, { ext }]) => [mime, ext])
  .join(",")

interface Props {
  value: string | undefined
  onChange: (_url: string | undefined) => void
  onMediaDeleted?: (_item: UploadedMedia) => void
  /** Shown instead of the empty state when no image is set. */
  emptyLabel: string
}

const BackgroundPicker = ({
  value,
  onChange,
  onMediaDeleted,
  emptyLabel,
}: Props) => {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const { t } = useTranslation()

  const select = ({ type, url }: UploadedMedia) => {
    if (type !== MEDIA_TYPES.IMAGE) {
      toast.error(t("quizz:background.imageOnly"))

      return
    }

    onChange(url)
  }

  const { upload, pendingCount } = useUploadMedia(select)
  const isUploading = pendingCount > 0

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted">
        {value ? (
          <img
            src={value}
            alt={t("quizz:background.preview")}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 px-2 text-center text-xs text-muted-foreground">
            <ImageOff className="size-5" />
            {emptyLabel}
          </div>
        )}

        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            aria-label={t("quizz:background.remove")}
            title={t("quizz:background.remove")}
            className="absolute top-1.5 right-1.5 rounded-md bg-background p-1 text-foreground shadow hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <label
          aria-disabled={isUploading}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-1.5 text-sm font-semibold text-white hover:brightness-[1.05] aria-disabled:cursor-wait aria-disabled:opacity-50"
        >
          {isUploading ? (
            <Loader className="size-4 text-white" />
          ) : (
            <Upload className="size-4" />
          )}
          {t("quizz:media.upload")}
          <input
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            disabled={isUploading}
            onChange={(e) => {
              upload(Array.from(e.target.files ?? []))
              e.target.value = ""
            }}
          />
        </label>

        <button
          type="button"
          onClick={() => setIsLibraryOpen(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-2 py-1.5 text-sm font-semibold text-accent-foreground hover:brightness-[0.97]"
        >
          <Library className="size-4" />
          {t("quizz:media.library")}
        </button>
      </div>

      <MediaLibrary
        open={isLibraryOpen}
        onOpenChange={setIsLibraryOpen}
        onSelect={select}
        onDeleted={onMediaDeleted}
        initialFilter={MEDIA_TYPES.IMAGE}
      />
    </div>
  )
}

export default BackgroundPicker
