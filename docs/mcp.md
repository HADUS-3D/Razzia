# MCP server (AI tools)

Razzia has a built-in [MCP](https://modelcontextprotocol.io) server, so an AI tool can create and edit quizzes for you, including generating questions and translating them.

- **URL:** `https://<your-razzia>/api/mcp` (Streamable HTTP, stateless). It sits under `/api`, so an existing [reverse proxy](reverse-proxy.md) setup already forwards it.
- **Authentication:** an [API token](http-api.md#api-tokens-for-scripts-and-ai-tools) as bearer. A normal manager login does not work here. Create the token in the manager (plug icon in the settings).
- **Rights:** every tool runs as the owner of the token, with exactly that user's rights. The tools call the same HTTP routes as the manager, so validation and permissions are identical.

## Connect a tool

Give your AI tool the URL and the header `Authorization: Bearer razzia_...`. For Claude Code:

```sh
claude mcp add --transport http razzia https://razzia.example.com/api/mcp \
  --header "Authorization: Bearer razzia_..."
```

Other clients that support remote MCP servers with a custom header work the same way.

## Tools

| Tool                       | What it does                                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `get_quiz_schema`          | Explains the quiz format and returns its JSON Schema. The AI should read this first.                                              |
| `list_quizzes`             | The quizzes the user may see, with what they may do with each.                                                                    |
| `get_quiz`                 | One quiz in full.                                                                                                                 |
| `create_quiz`              | Creates a quiz, returns its id. Needs the create right.                                                                           |
| `update_quiz`              | Replaces a quiz with a complete new version. Needs the edit right.                                                                |
| `delete_quiz`              | Deletes a quiz. Needs the delete right.                                                                                           |
| `list_question_categories` | The Open Trivia Database categories.                                                                                              |
| `generate_questions`       | Fetches 1-50 trivia questions (`amount`, `category`, `difficulty`, `type`, `language`). Nothing is saved. Needs the create right. |

Errors come back as tool errors containing the same keys as the HTTP API, for example `errors:quizz.noSolution` or `errors:auth.forbidden`.

## Translating generated questions

The question source only has English questions. Passing `language` (for example `"Dutch"`) to `generate_questions` adds instructions to the result that tell the AI how to translate. The server itself never translates anything. The instructions say to:

- translate only while the question stays correct, and leave things untranslated when translating would break them: proper names, titles of books, films, songs and games, wordplay, rhymes, anagrams, questions about spelling or a specific word, questions about language itself, quotes, slogans, brand names, and abbreviations or codes;
- keep the answers in the same order so `solutions` stays right;
- drop and replace a question that cannot be translated in a meaningful way;
- when in doubt, leave it in English and tell you.

A typical request: "Make a Dutch quiz of 20 history questions and save it in Razzia."
