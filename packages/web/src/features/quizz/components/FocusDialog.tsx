import { Crosshair, X } from "lucide-react"
import { Dialog } from "radix-ui"
import { useState, type PointerEvent } from "react"
import { useTranslation } from "react-i18next"
import {
  type BackgroundFocus,
  DEFAULT_FOCUS,
  parseBackground,
  withFocus,
} from "@razzia/common/background"

/** Screens the background gets cropped to, as width / height. */
const FRAMES = [
  { key: "wide", aspect: 16 / 9, color: "#3b82f6" },
  { key: "tablet", aspect: 4 / 3, color: "#22c55e" },
  { key: "phone", aspect: 9 / 19.5, color: "#f97316" },
] as const

interface Props {
  /** Background including its current focus point. */
  value: string
  onChange: (_value: string) => void
}

/** Where `object-fit: cover` puts a frame on the image, in image fractions. */
const frameRect = (
  frameAspect: number,
  imageAspect: number,
  focus: BackgroundFocus,
) => {
  const width = frameAspect > imageAspect ? 1 : frameAspect / imageAspect
  const height = frameAspect > imageAspect ? imageAspect / frameAspect : 1

  return {
    left: (1 - width) * (focus.x / 100) * 100,
    top: (1 - height) * (focus.y / 100) * 100,
    width: width * 100,
    height: height * 100,
  }
}

const FocusDialog = ({ value, onChange }: Props) => {
  const { t } = useTranslation()
  const { url, focus: saved } = parseBackground(value)
  const [aspect, setAspect] = useState(16 / 9)
  // Dragging only changes this draft; the value is saved when the pointer lifts.
  const [draft, setDraft] = useState<BackgroundFocus>()
  const focus = draft ?? saved

  const setFocus = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - box.left) / box.width) * 100
    const y = ((event.clientY - box.top) / box.height) * 100

    setDraft({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    })
  }

  const commit = () => {
    if (draft) {
      onChange(withFocus(url, draft))
      setDraft(undefined)
    }
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-2 py-1.5 text-sm font-semibold text-accent-foreground hover:brightness-[0.97]">
        <Crosshair className="size-4" />
        {t("quizz:background.focus.open")}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-fade" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-5 shadow-xl data-[state=open]:animate-fade"
        >
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              {t("quizz:background.focus.title")}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t("common:close")}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            {t("quizz:background.focus.hint")}
          </p>

          <div
            className="relative mx-auto max-h-[60vh] w-fit max-w-full cursor-crosshair touch-none overflow-hidden rounded-lg bg-muted select-none"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              setFocus(event)
            }}
            onPointerUp={commit}
            onPointerCancel={commit}
            onPointerMove={(event) => {
              if (event.buttons > 0) {
                setFocus(event)
              }
            }}
          >
            <img
              src={url}
              alt={t("quizz:background.preview")}
              draggable={false}
              className="pointer-events-none block max-h-[60vh] max-w-full"
              onLoad={(event) =>
                setAspect(
                  event.currentTarget.naturalWidth /
                    event.currentTarget.naturalHeight,
                )
              }
            />
            {FRAMES.map(({ key, aspect: frameAspect, color }) => {
              const rect = frameRect(frameAspect, aspect, focus)

              return (
                <div
                  key={key}
                  data-testid={`focus-frame-${key}`}
                  className="pointer-events-none absolute border-2 border-dashed"
                  style={{
                    borderColor: color,
                    left: `${rect.left}%`,
                    top: `${rect.top}%`,
                    width: `${rect.width}%`,
                    height: `${rect.height}%`,
                  }}
                />
              )
            })}
            <div
              data-testid="focus-marker"
              className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary/70 shadow"
              style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
            />
          </div>

          <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {FRAMES.map(({ key, color }) => (
              <li key={key} className="flex items-center gap-1.5">
                <span
                  className="size-3 rounded-sm border-2 border-dashed"
                  style={{ borderColor: color }}
                />
                {t(`quizz:background.focus.frames.${key}`)}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-between gap-2">
            <button
              type="button"
              onClick={() => onChange(withFocus(url, DEFAULT_FOCUS))}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground hover:brightness-[0.97]"
            >
              {t("quizz:background.focus.reset")}
            </button>
            <Dialog.Close className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:brightness-[1.05]">
              {t("quizz:background.focus.done")}
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default FocusDialog
