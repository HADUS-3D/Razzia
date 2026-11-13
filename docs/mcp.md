# MCP server (AI tools)

Razzia has a built-in [MCP](https://modelcontextprotocol.io) server, so an AI tool can create and edit quizzes for you, including generating questions and translating them.

## What you need

- A Razzia account that may create quizzes (ask an admin if you cannot).
- Your Razzia address, for example `https://razzia.example.com`. The MCP address is that plus `/api/mcp`.
- An AI tool that can talk to an MCP server with a bearer token: [Claude Desktop](#option-a-claude-desktop-windows-or-macos) (via a small bridge) or [Claude Code](#option-b-claude-code). See [what does not work](#what-does-not-work) for the claude.ai connector screen.

Every tool runs as you, with exactly your rights. The tools call the same HTTP routes as the manager, so validation and permissions are identical. The endpoint sits under `/api`, so an existing [reverse proxy](reverse-proxy.md) setup already forwards it.

## Step by step

### 1. Create an API token

1. Sign in to the manager. On the configuration screen, the row of small icons in the top right has a **plug icon** ("API tokens"), next to the icons for users, password and logout.
2. Click the plug icon.
3. Give the token a name, for example `Claude Code`, optionally choose an expiry, and click **Create token**.
4. Copy the token (it starts with `razzia_`). It is shown **once**; if you lose it, create a new one.

> **Keep the token secret.** It is a password for your quizzes. Never paste it in a chat with an AI, a ticket or a public repository. You only put it in the command in step 2, in your own terminal.

### 2. Add Razzia to your AI tool (you do this yourself)

This happens on **your own computer**, because the token must stay on your machine. Nobody else can do it for you. Pick the tool you use.

#### Option A: Claude Desktop (Windows or macOS)

Claude Desktop reads its servers from a config file and only starts local programs from it, so a small bridge, [`mcp-remote`](https://github.com/geelen/mcp-remote), connects it to Razzia's address and adds your token. It needs [Node.js](https://nodejs.org) 18 or newer (the LTS installer is fine). Check with `node --version` in PowerShell.

1. In Claude Desktop open **Settings > Developer > Edit Config**. This opens the folder with `claude_desktop_config.json` (on Windows `%APPDATA%\Claude\claude_desktop_config.json`, on macOS `~/Library/Application Support/Claude/claude_desktop_config.json`).
2. Open that file in Notepad (or any editor) and make it look like this, with your own address and token. If the file already has an `mcpServers` section, only add the `razzia` entry inside it; keep the commas right.

```json
{
  "mcpServers": {
    "razzia": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://razzia.example.com/api/mcp",
        "--transport",
        "http-only",
        "--header",
        "Authorization:${RAZZIA_AUTH}"
      ],
      "env": {
        "RAZZIA_AUTH": "Bearer razzia_PASTE_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

3. Replace `https://razzia.example.com` with your own address and `razzia_PASTE_YOUR_TOKEN_HERE` with the token from step 1. Keep the word `Bearer ` (with a space) in front of the token.
4. Save, then **quit Claude Desktop completely** (on Windows right-click the tray icon and choose Quit; closing the window is not enough) and start it again.

The odd `Authorization:${RAZZIA_AUTH}` (no space after the colon) is deliberate: Claude Desktop on Windows does not escape spaces in `args`, so the space in `Bearer ...` lives in the `env` value instead. This follows the `mcp-remote` documentation; if you use another operating system it works the same.

The token is saved in plain text in that config file. Treat the file like a password and do not share or sync it.

#### Option B: Claude Code

If you use Claude Code, you can add the server with one command. If PowerShell says `claude : The term 'claude' is not recognized`, Claude Code is not installed yet (it is a separate program from Claude Desktop). On Windows 10 or later, install it in PowerShell:

```powershell
irm https://claude.ai/install.ps1 | iex
```

Close and reopen PowerShell, then check `claude --version` (see the [Claude Code setup page](https://code.claude.com/docs/en/setup) if that fails). Then run, in one line, with your own address and token:

```sh
claude mcp add --transport http razzia https://razzia.example.com/api/mcp --header "Authorization: Bearer razzia_PASTE_YOUR_TOKEN_HERE"
```

Replace the address and the token. In a Unix shell you may split it over lines with `\` at the end of a line.

#### What does not work

- **claude.ai or Claude Desktop "Add custom connector" screen.** That screen supports servers that sign in with OAuth or need no sign-in. Razzia uses a static token and has no OAuth login, so a plain connector cannot use it. Request headers for connectors exist, but only as a beta for a limited set of organizations: if your Claude has a "Request headers" field in the connector form you can enter `authorization` with `Bearer razzia_...`, otherwise use option A or B. Do not choose "No sign-in" without a header, because Razzia will answer `401`.
- **Phones and the Claude web app** can only use connectors, so the same limit applies.
- Other AI tools that take a remote MCP URL plus a custom header (such as Cursor or VS Code) can use the URL `https://razzia.example.com/api/mcp` with the header `Authorization: Bearer razzia_...`.

### 3. Check that it works

- **Claude Desktop:** start a new chat and open the tools menu below the message box. `razzia` should be listed, with tools such as `create_quiz` and `generate_questions`. If not, see the logs in `%APPDATA%\Claude\logs` (the file `mcp-server-razzia.log`).
- **Claude Code:** run `claude mcp list` and look for `razzia` as connected, then start `claude` and type `/mcp`.

If it does not work:

| Problem                                                                                                                                   | Likely cause                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `401` or "failed to connect"                                                                                                              | The token is wrong, expired or revoked: create a new one. The header must read `Bearer ` followed by the token                                                                                                                                                                                                        |
| `Unexpected token '<', "<!doctype "... is not valid JSON` in the Claude Desktop log, right after "Discovering OAuth server configuration" | The server or proxy answers `/.well-known/...` with the web page instead of a JSON 404. Update Razzia to a version with the `/.well-known/` rule in `docker/nginx.conf` (rebuild the image). If you put your own proxy in front, let `/.well-known/` reach Razzia like `/api` (see [Reverse proxy](reverse-proxy.md)) |
| `'npx' is not recognized` / `spawn npx ENOENT` in the Claude Desktop log                                                                  | Node.js is not installed, or Claude Desktop was started before it was. Install Node.js, restart your computer, and if it still fails put the full path in the config: `"command": "C:\\Program Files\\nodejs\\npx.cmd"`                                                                                               |
| Claude Desktop shows no `razzia` tools                                                                                                    | Node.js is missing or older than 18, the JSON has a typo (a missing comma), or Claude Desktop was not quit completely                                                                                                                                                                                                 |
| A tool answers `errors:auth.forbidden`                                                                                                    | Your account may not do that, for example creating quizzes: ask an admin                                                                                                                                                                                                                                              |
| `404` or the page of your Razzia                                                                                                          | The address is wrong, or the server runs a version from before the MCP server was added                                                                                                                                                                                                                               |
| It works from your laptop but not remotely                                                                                                | Your reverse proxy does not forward `/api`, see [Reverse proxy](reverse-proxy.md)                                                                                                                                                                                                                                     |

### 4. Ask for a quiz

Open a new chat in Claude Desktop (or start Claude Code) and ask in plain language, for example:

> Make a quiz in Razzia called "Dutch history" with 15 questions: 10 from the question generator, translated to Dutch, and 5 you write yourself. Show me the questions before you save it.

or

> Look at my quiz "Capitals", add 5 harder questions and save it.

The AI reads the quiz format with `get_quiz_schema`, fetches or writes the questions and saves them with `create_quiz` or `update_quiz`. The quiz then shows up in the manager like any other quiz. Ask it to show the questions first if you want to check them before they are saved. Do not ask it to delete quizzes unless you mean it.

### 5. Revoke a token

If a token leaked, you no longer use it or you lost the device: open the manager, click the plug icon on the configuration screen, and use the trash icon next to the token. It stops working at once. Remove the tool's side too: in Claude Desktop delete the `razzia` entry from `claude_desktop_config.json` and restart it, in Claude Code run `claude mcp remove razzia`.

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
