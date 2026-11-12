import { describe, expect, it } from "vitest"
import type { Question } from "@razzia/common/types/game"
import { parseRound, toRound } from "@razzia/common/validators/round"

const question: Question = {
  type: "single",
  question: "Q?",
  category: "Art",
  answers: ["A", "B", "C"],
  solutions: [2],
  cooldown: 9,
  time: 40,
}

describe("round", () => {
  it("exports only what is needed to import a round", () => {
    expect(toRound([question])).toEqual({
      questions: [
        {
          question: "Q?",
          answers: ["A", "B", "C"],
          solutions: [2],
          category: "Art",
        },
      ],
    })
  })

  it("imports with defaults for type and timing", () => {
    const [imported] = parseRound(JSON.stringify(toRound([question]))) ?? []

    expect(imported).toMatchObject({
      type: "single",
      question: "Q?",
      solutions: [2],
      cooldown: 5,
      time: 20,
    })
  })

  it("accepts a code fence and a bare array", () => {
    const text = JSON.stringify(toRound([question]).questions)

    expect(parseRound(`\`\`\`json\n${text}\n\`\`\``)).toHaveLength(1)
  })

  it("rejects broken input", () => {
    expect(parseRound("not json")).toBeNull()
    expect(parseRound("{}")).toBeNull()
    expect(
      parseRound(
        JSON.stringify({
          questions: [{ question: "Q", answers: ["A", "B"], solutions: [5] }],
        }),
      ),
    ).toBeNull()
  })
})
