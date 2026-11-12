/**
 * Instruction for an AI tool, in English on purpose: it is pasted into the tool
 * together with the downloaded round JSON and must be understood by any model.
 */
export const buildTranslationPrompt = (language: string) =>
  `You will receive a JSON file with a round of quiz questions. Translate the questions into ${language}.

Rules:
- Only translate the text values of "question", "answers" and "category".
- Keep the order of the "answers". The numbers in "solutions" are positions in "answers", so they must not change.
- Do not change anything else: keep every key and the structure of the JSON exactly the same.
- Translate the answers "True" and "False" as well.
- The output must be JSON in the same format as the input. Reply with the complete, valid JSON only, without explanation and without markdown code fences, so it can be imported straight back into the quizz editor.`
