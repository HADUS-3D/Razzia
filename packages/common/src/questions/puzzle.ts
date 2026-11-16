import { PUZZLE_GROUP_SIZE } from "@razzia/common/constants"

/**
 * Compares answers without capitals, accents and stray spaces. Typos are not
 * forgiven: "Mozart" and "Motzart" are different answers.
 */
export const normalizePuzzleAnswer = (value: string): string =>
  value
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll(/\s+/gu, " ")
    .trim()

export const isPuzzleAnswerCorrect = (
  value: string,
  connections: string[],
): boolean => {
  const given = normalizePuzzleAnswer(value)

  return (
    given !== "" &&
    connections.some(
      (connection) => normalizePuzzleAnswer(connection) === given,
    )
  )
}

/** The indexes of the groups whose connection was named correctly. */
export const solvedPuzzleGroups = (
  texts: string[],
  connections: string[][],
): number[] =>
  connections.flatMap((accepted, group) =>
    isPuzzleAnswerCorrect(texts.at(group) ?? "", accepted) ? [group] : [],
  )

/** The words of one group, out of the question's flat list of words. */
export const puzzleGroupWords = (answers: string[], group: number): string[] =>
  answers.slice(group * PUZZLE_GROUP_SIZE, (group + 1) * PUZZLE_GROUP_SIZE)
