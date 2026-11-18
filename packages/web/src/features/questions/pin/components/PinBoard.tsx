import type {
  PinMapView,
  PinPosition,
  QuestionMedia,
} from "@razzia/common/types/game"
import { MEDIA_TYPES, PIN_MODES } from "@razzia/common/constants"
import LeafletBoard, {
  type BoardCircle,
  type BoardLines,
  type BoardMarker,
} from "@razzia/web/features/questions/pin/components/LeafletBoard"
import {
  PinCanvas,
  PinCircle,
  PinLines,
  PinMarker,
} from "@razzia/web/features/questions/pin/components/PinCanvas"

export type { BoardCircle, BoardLines, BoardMarker }

interface Props {
  mode?: "image" | "map"
  media?: QuestionMedia
  view?: PinMapView
  onPick?: (_position: PinPosition) => void
  onLoadAspect?: (_aspect: number) => void
  onViewChange?: (_view: PinMapView) => void
  markers?: BoardMarker[]
  circles?: BoardCircle[]
  lines?: BoardLines
  /** Map only: zoom to show everything on it. */
  fit?: boolean
  /** Tailwind max height of an image, or the height of a map. */
  heightClass?: string
  mapHeightClass?: string
}

const CIRCLE_CLASS = {
  right: "border-correct bg-correct/25",
  limit: "border-dashed border-red-500/70",
} as const

/**
 * The field a pin question is played on: an image or a real map, with the same
 * markers, circles and lines on top of either one.
 */
const PinBoard = ({
  mode = PIN_MODES.IMAGE,
  media,
  heightClass,
  mapHeightClass,
  view,
  onPick,
  onLoadAspect,
  onViewChange,
  markers = [],
  circles = [],
  lines,
  fit,
}: Props) => {
  if (mode === PIN_MODES.MAP) {
    return (
      <LeafletBoard
        view={view}
        onPick={onPick}
        onViewChange={onViewChange}
        markers={markers}
        circles={circles}
        lines={lines}
        fit={fit}
        heightClass={mapHeightClass}
      />
    )
  }

  if (media?.type !== MEDIA_TYPES.IMAGE) {
    return null
  }

  return (
    <PinCanvas
      src={media.url}
      onPick={onPick}
      onLoadAspect={onLoadAspect}
      heightClass={heightClass}
    >
      {circles.map((circle, index) => (
        <PinCircle
          key={index}
          x={circle.x}
          y={circle.y}
          radius={circle.radius}
          className={CIRCLE_CLASS[circle.tone]}
        />
      ))}
      {lines && <PinLines from={lines.from} to={lines.to} />}
      {markers.map((marker, index) => (
        <PinMarker key={index} {...marker} />
      ))}
    </PinCanvas>
  )
}

export default PinBoard
