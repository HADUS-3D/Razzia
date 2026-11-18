import { useQuery } from "@tanstack/react-query"
import { Play, Square, Upload } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { MEDIA_TYPES, SOUND_NONE } from "@razzia/common/constants"
import Loader from "@razzia/web/components/Loader"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@razzia/web/components/Select"
import {
  librarySoundsFor,
  soundName,
  soundUrl,
  type SoundSlot,
} from "@razzia/web/features/game/utils/sounds"
import { useUploadMedia } from "@razzia/web/features/quizz/hooks/useUploadMedia"
import { mediaListQuery } from "@razzia/web/features/quizz/queries"

const INHERIT = "__inherit__"
const AUDIO_ACCEPT = "audio/mpeg,audio/ogg,audio/wav,.mp3,.ogg,.wav"

interface Props {
  slot: SoundSlot
  /** Undefined means: inherit from the level above. */
  value: string | undefined
  onChange: (_value: string | undefined) => void
  label: string
  /** What "inherit" is called here, e.g. "Uses the quizz or app sound". */
  inheritLabel: string
}

/** Picks a sound: inherit, silence, one that ships with the app or an uploaded file, with a preview. */
const SoundPicker = ({ slot, value, onChange, label, inheritLabel }: Props) => {
  const { t } = useTranslation()
  const { data: media } = useQuery(mediaListQuery())
  const { upload, pendingCount } = useUploadMedia((item) => onChange(item.url))
  const audio = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const isUploading = pendingCount > 0

  const uploads = (media?.media ?? []).filter(
    ({ type }) => type === MEDIA_TYPES.AUDIO,
  )
  const library = librarySoundsFor(slot)
  // An uploaded file that was deleted since stays visible as the current value.
  const missing =
    value?.startsWith("/") === true &&
    !uploads.some(({ url }) => url === value) &&
    !library.some(({ id }) => id === value)

  const stop = () => {
    audio.current?.pause()
    audio.current = null
    setPlaying(false)
  }

  useEffect(() => stop, [])

  // Another choice ends the preview of the old one.
  useEffect(() => stop, [value])

  const preview = () => {
    if (playing) {
      stop()

      return
    }

    const url = soundUrl(slot, value)

    if (!url) {
      return
    }

    const element = new Audio(url)
    element.volume = 0.5
    element.addEventListener("ended", () => setPlaying(false))
    audio.current = element
    setPlaying(true)
    element.play().catch(() => setPlaying(false))
  }

  const canPreview = soundUrl(slot, value) !== null

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <Select
          value={value ?? INHERIT}
          onValueChange={(next) =>
            onChange(next === INHERIT ? undefined : next)
          }
        >
          <SelectTrigger aria-label={label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={INHERIT}>{inheritLabel}</SelectItem>
            <SelectItem value={SOUND_NONE}>{t("quizz:sounds.none")}</SelectItem>
            {library.map(({ id }) => (
              <SelectItem key={id} value={id}>
                {id.includes("default/")
                  ? t("quizz:sounds.default")
                  : soundName(id)}
              </SelectItem>
            ))}
            {uploads.map(({ url, name }) => (
              <SelectItem key={url} value={url}>
                {name}
              </SelectItem>
            ))}
            {missing && value && (
              <SelectItem value={value}>{t("quizz:sounds.missing")}</SelectItem>
            )}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={preview}
          disabled={!canPreview}
          aria-label={t(playing ? "quizz:sounds.stop" : "quizz:sounds.play")}
          title={t(playing ? "quizz:sounds.stop" : "quizz:sounds.play")}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground hover:brightness-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {playing ? (
            <Square className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
        </button>
      </div>

      <label
        aria-disabled={isUploading}
        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground hover:brightness-[0.97] aria-disabled:cursor-wait aria-disabled:opacity-50"
      >
        {isUploading ? (
          <Loader className="size-3.5" />
        ) : (
          <Upload className="size-3.5" />
        )}
        {t("quizz:sounds.upload")}
        <input
          type="file"
          accept={AUDIO_ACCEPT}
          className="hidden"
          disabled={isUploading}
          onChange={(e) => {
            upload(Array.from(e.target.files ?? []))
            e.target.value = ""
          }}
        />
      </label>
    </div>
  )
}

export default SoundPicker
