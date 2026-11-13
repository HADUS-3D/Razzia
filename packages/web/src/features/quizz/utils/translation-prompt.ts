/**
 * Instruction for an AI tool, in English on purpose: it is pasted into the tool
 * together with the downloaded round JSON and must be understood by any model.
 */
export const buildTranslationPrompt = (language: string) =>
  `IMPORTANT: I expect a JSON FILE back, not text. Deliver the result as a downloadable file named round-translated.json, attached to your reply. Do not paste the JSON into the chat and do not put it in a code block. If you can only reply with text, say so instead of pasting the JSON.

I attached a JSON file with a round of quiz questions. Translate the questions into ${language}.

Rules for the file you create:
- It must have exactly the same structure as the file I gave you: the same keys, the same order and the same number of questions.
- Only translate the text values of "question", "answers", "category" and the "name" inside "round".
- Keep the order of the "answers". The numbers in "solutions" are positions in "answers", so they must not change.
- Translate the answers "True" and "False" as well.
- The file must contain valid JSON only, nothing else.`
