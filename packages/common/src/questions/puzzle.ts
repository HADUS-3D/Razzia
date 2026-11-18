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

/**
 * Pairs the typed texts with the groups they name, whatever field a text was
 * typed in. Returns, per group, the index of the text that solved it. A text
 * solves at most one group and a group is solved at most once, so typing the
 * same answer twice never scores twice.
 */
export const matchPuzzleTexts = (
  texts: string[],
  connections: string[][],
): Array<number | undefined> => {
  const matchedGroupOfText = new Map<number, number>()

  const tryAssign = (group: number, seen: Set<number>): boolean => {
    for (const [index, text] of texts.entries()) {
      if (
        seen.has(index) ||
        !isPuzzleAnswerCorrect(text, connections[group] ?? [])
      ) {
        continue
      }

      seen.add(index)
      const taken = matchedGroupOfText.get(index)

      if (taken === undefined || tryAssign(taken, seen)) {
        matchedGroupOfText.set(index, group)

        return true
      }
    }

    return false
  }

  for (let group = 0; group < connections.length; group += 1) {
    tryAssign(group, new Set())
  }

  const result: Array<number | undefined> = connections.map(() => undefined)

  for (const [index, group] of matchedGroupOfText) {
    result[group] = index
  }

  return result
}

/** The indexes of the groups whose connection was named, in any field. */
export const solvedPuzzleGroups = (
  texts: string[],
  connections: string[][],
): number[] =>
  matchPuzzleTexts(texts, connections).flatMap((text, group) =>
    text === undefined ? [] : [group],
  )

/** The words of one group, out of the question's flat list of words. */
export const puzzleGroupWords = (answers: string[], group: number): string[] =>
  answers.slice(group * PUZZLE_GROUP_SIZE, (group + 1) * PUZZLE_GROUP_SIZE)
