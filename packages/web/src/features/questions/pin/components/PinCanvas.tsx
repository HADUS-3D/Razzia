import type { CSSProperties, MouseEvent, ReactNode } from "react"
import clsx from "clsx"
import { MapPin } from "lucide-react"
import type { PinPosition } from "@razzia/common/types/game"

interface CanvasProps {
  src: string
  alt?: string
  /** Makes the image tappable and reports where, in percent of its size. */
  onPick?: (_position: PinPosition) => void
  onLoadAspect?: (_aspect: number) => void
  /** Tailwind max height of the image. */
  heightClass?: string
  children?: ReactNode
}

/**
 * An image with an overlay on top of it. Everything inside is positioned in
 * percent of the image, so it stays on the right spot at any size.
 */
export const PinCanvas = ({
  src,
  alt = "",
  onPick,
  onLoadAspect,
  heightClass = "max-h-[50vh]",
  children,
}: CanvasProps) => {
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!onPick) {
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()

    if (rect.width === 0 || rect.height === 0) {
      return
    }

    const clamp = (value: number) => Math.min(100, Math.max(0, value))

    onPick({
      x: clamp(((e.clientX - rect.left) / rect.width) * 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100),
    })
  }

  return (
    <div className="relative mx-auto w-fit max-w-full select-none">
      <img
        alt={alt}
        src={src}
        draggable={false}
        onLoad={(e) => {
          const { naturalWidth, naturalHeight } = e.currentTarget

          if (naturalWidth > 0 && naturalHeight > 0) {
            onLoadAspect?.(naturalWidth / naturalHeight)
          }
        }}
        className={clsx(
          "block h-auto w-auto max-w-full rounded-md bg-white shadow-lg",
          heightClass,
        )}
      />
      <div
        onClick={handleClick}
        data-testid="pin-field"
        className={clsx(
          "absolute inset-0 touch-manipulation overflow-hidden rounded-md",
          onPick && "cursor-crosshair",
        )}
      >
        {children}
      </div>
    </div>
  )
}

interface MarkerProps extends PinPosition {
  color?: string
  label?: string
  className?: string
  style?: CSSProperties
  size?: "sm" | "md"
}

/** A map pin whose tip points at the position. */
export const PinMarker = ({
  x,
  y,
  color = "#ef4444",
  label,
  className,
  style,
  size = "md",
}: MarkerProps) => (
  <div
    className={clsx(
      "pointer-events-none absolute flex -translate-x-1/2 -translate-y-full flex-col items-center",
      className,
    )}
    style={{ left: `${x}%`, top: `${y}%`, ...style }}
  >
    {label && (
      <span className="mb-0.5 max-w-24 truncate rounded bg-black/70 px-1 text-[10px] leading-4 font-bold text-white md:text-xs">
        {label}
      </span>
    )}
    <MapPin
      className={clsx(
        "stroke-white drop-shadow-md",
        size === "md" ? "size-7 md:size-9" : "size-5 md:size-6",
      )}
      strokeWidth={1.75}
      fill={color}
    />
  </div>
)

interface CircleProps extends PinPosition {
  /** Radius in percent of the image width. */
  radius: number
  className?: string
}

/** A circle around a position, sized in percent of the image width. */
export const PinCircle = ({ x, y, radius, className }: CircleProps) => (
  <div
    className={clsx(
      "pointer-events-none absolute aspect-square -translate-1/2 rounded-full border-2",
      className,
    )}
    style={{ left: `${x}%`, top: `${y}%`, width: `${radius * 2}%` }}
  />
)

interface LinesProps {
  from: PinPosition
  to: Array<PinPosition & { color: string }>
}

/** Straight lines from a position to others. */
export const PinLines = ({ from, to }: LinesProps) => (
  <svg
    className="pointer-events-none absolute inset-0 size-full"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
  >
    {to.map((point, i) => (
      <line
        key={i}
        x1={from.x}
        y1={from.y}
        x2={point.x}
        y2={point.y}
        stroke={point.color}
        strokeWidth={2}
        strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
      />
    ))}
  </svg>
)
