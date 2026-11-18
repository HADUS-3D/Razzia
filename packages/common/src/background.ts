/**
 * A background is an image URL that may carry a focus point as a fragment,
 * e.g. `/media/photo.png#focus=30,65`: the spot (in percent of the image
 * width and height, from the top left) that must stay in view when the image
 * is cropped to fit a screen. Browsers and servers ignore the fragment, so it
 * travels with the URL through settings, quizzes and the game unchanged.
 */
export interface BackgroundFocus {
  x: number
  y: number
}

export const DEFAULT_FOCUS: BackgroundFocus = { x: 50, y: 50 }

const FOCUS_PATTERN = /#focus=(\d{1,3}(?:\.\d)?),(\d{1,3}(?:\.\d)?)$/u

const clamp = (value: number) => Math.min(100, Math.max(0, value))
const round = (value: number) => Math.round(clamp(value) * 10) / 10

export const parseBackground = (
  value: string,
): { url: string; focus: BackgroundFocus } => {
  const match = FOCUS_PATTERN.exec(value)

  if (!match) {
    return { url: value, focus: DEFAULT_FOCUS }
  }

  return {
    url: value.slice(0, match.index),
    focus: { x: clamp(Number(match[1])), y: clamp(Number(match[2])) },
  }
}

/** The image URL without its focus point. */
export const backgroundUrl = (value: string): string =>
  parseBackground(value).url

/** Attaches a focus point; the centered default is stored as no fragment. */
export const withFocus = (url: string, focus: BackgroundFocus): string => {
  const base = backgroundUrl(url)
  const x = round(focus.x)
  const y = round(focus.y)

  return x === DEFAULT_FOCUS.x && y === DEFAULT_FOCUS.y
    ? base
    : `${base}#focus=${x},${y}`
}

/** True when both values point at the same image, whatever their focus. */
export const isSameImage = (a: string | undefined, b: string | undefined) =>
  a !== undefined && b !== undefined && backgroundUrl(a) === backgroundUrl(b)
