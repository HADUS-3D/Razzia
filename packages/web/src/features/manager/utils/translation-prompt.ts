/**
 * Instruction for an AI tool, in English on purpose: it is pasted into the tool
 * together with the exported quizz JSON and must be understood by any model.
 */
export const buildTranslationPrompt = (language: string) =>
  `You will receive a JSON file that contains a quiz. Translate the quiz into ${language}.

Rules:
- Only translate the text values of "subject", "question", "answers", "category" and "note" (if present).
- Keep the order of the "answers". The numbers in "solutions" are positions in "answers", so they must not change.
- Do not change anything else: keep every key, number, boolean and the structure of the JSON exactly the same, including the "source" field.
- Translate the answers "True" and "False" as well.
- Reply with the complete, valid JSON only, without explanation and without markdown code fences, so it can be imported straight back into the app.`
