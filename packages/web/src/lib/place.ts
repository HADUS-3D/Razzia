import { useTranslation } from "react-i18next"

const ENGLISH_SUFFIXES: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" }

const englishOrdinal = (rank: number) => {
  const lastTwo = rank % 100
  const suffix =
    lastTwo >= 11 && lastTwo <= 13
      ? "th"
      : (ENGLISH_SUFFIXES[rank % 10] ?? "th")

  return `${rank}${suffix}`
}

// Dutch writes 2de and 3de, every other number gets "e" (1e, 4e, 12e, 22e).
const dutchOrdinal = (rank: number) =>
  `${rank}${rank === 2 || rank === 3 ? "de" : "e"}`

export const formatOrdinal = (language: string, rank: number) =>
  language.toLowerCase().startsWith("nl")
    ? dutchOrdinal(rank)
    : englishOrdinal(rank)

export const usePlace = () => {
  const { t, i18n } = useTranslation()
  const ordinal = (rank: number) => formatOrdinal(i18n.language, rank)

  return {
    /** "2nd place" / "2de plaats" */
    place: (rank: number) => t("game:place", { nth: ordinal(rank) }),
  }
}
