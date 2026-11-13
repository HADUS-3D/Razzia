# MCP server (AI tools)

Razzia has a built-in [MCP](https://modelcontextprotocol.io) server, so an AI tool can create and edit quizzes for you, including generating questions and translating them.

## What you need

- A Razzia account that may create quizzes (ask an admin if you cannot).
- Your Razzia address, for example `https://razzia.example.com`. The MCP address is that plus `/api/mcp`.
- An AI tool that supports remote MCP servers. The steps below use [Claude Code](https://claude.com/claude-code); other tools work the same way if they accept a URL and a custom header.

Every tool runs as you, with exactly your rights. The tools call the same HTTP routes as the manager, so validation and permissions are identical. The endpoint sits under `/api`, so an existing [reverse proxy](reverse-proxy.md) setup already forwards it.

## Step by step

### 1. Create an API token

1. Sign in to the manager. On the configuration screen, the row of small icons in the top right has a **plug icon** ("API tokens"), next to the icons for users, password and logout.
2. Click the plug icon.
3. Give the token a name, for example `Claude Code`, optionally choose an expiry, and click **Create token**.
4. Copy the token (it starts with `razzia_`). It is shown **once**; if you lose it, create a new one.

> **Keep the token secret.** It is a password for your quizzes. Never paste it in a chat with an AI, a ticket or a public repository. You only put it in the command in step 2, in your own terminal.

### 2. Add Razzia to your AI tool (you run this yourself)

This is a command for **your own computer**: open a terminal (Terminal on macOS, PowerShell or Windows Terminal on Windows) where Claude Code is installed, and run the command below with your own address and token. Nobody else can run it for you, because the token must stay on your machine.

```sh
claude mcp add --transport http razzia https://razzia.example.com/api/mcp --header "Authorization: Bearer razzia_PASTE_YOUR_TOKEN_HERE"
```

Replace `https://razzia.example.com` with your own address and `razzia_PASTE_YOUR_TOKEN_HERE` with the token from step 1. Keep it on one line (in a Unix shell you may split it with `\` at the end of the line).

Other AI tools: add a remote (HTTP) MCP server with the URL `https://razzia.example.com/api/mcp` and the header `Authorization: Bearer razzia_...`.

### 3. Check that it works

```sh
claude mcp list
```

`razzia` should be listed as connected. Then start Claude Code (`claude`) and type `/mcp`: the `razzia` server should show its tools (`create_quiz`, `generate_questions`, ...).

If it does not work:

| Problem                                    | Likely cause                                                                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `401` or "failed to connect"               | The token is wrong, expired or revoked: create a new one. The header must read `Bearer ` followed by the token |
| A tool answers `errors:auth.forbidden`     | Your account may not do that, for example creating quizzes: ask an admin                                       |
| `404` or the page of your Razzia           | The address is wrong, or the server runs a version from before the MCP server was added                        |
| It works from your laptop but not remotely | Your reverse proxy does not forward `/api`, see [Reverse proxy](reverse-proxy.md)                              |

### 4. Ask for a quiz

Start Claude Code and ask in plain language, for example:

> Make a quiz in Razzia called "Dutch history" with 15 questions: 10 from the question generator, translated to Dutch, and 5 you write yourself. Show me the questions before you save it.

or

> Look at my quiz "Capitals", add 5 harder questions and save it.

The AI reads the quiz format with `get_quiz_schema`, fetches or writes the questions and saves them with `create_quiz` or `update_quiz`. The quiz then shows up in the manager like any other quiz. Ask it to show the questions first if you want to check them before they are saved. Do not ask it to delete quizzes unless you mean it.

### 5. Revoke a token

If a token leaked, you no longer use it or you lost the device: open the manager, click the plug icon on the configuration screen, and use the trash icon next to the token. It stops working at once. Remove the tool's side too:

```sh
claude mcp remove razzia
```

A token also stops working when your account is deleted or has to change its password.

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
