<p align="center">
  <img width="450" height="120" align="center" src=".github/logo.svg">
</p>

## 🧩 What is this project?

Razzia is a straightforward, self-hosted quiz platform for smaller events: you run it on your own server, host games from a manager interface, and players join from their own device.

This repository is a personal fork of [Ralex91/Razzia](https://github.com/Ralex91/Razzia), extended with its own features (see [What this fork adds](#-what-this-fork-adds)) and run on its own server. It is maintained independently and is not affiliated with the original project.

> **Disclaimer**: Razzia is an independent, open-source software project. It is not affiliated with, endorsed by, or sponsored by any third-party quiz platform or service. Any resemblance to other quiz platforms is purely incidental.

<p align="center">
  <img width="30%" src=".github/previews/1.png" alt="Login">
  <img width="30%" src=".github/previews/2.png" alt="Manager Room">
  <img width="30%" src=".github/previews/3.png" alt="Question Screen">
</p>

## ✨ What this fork adds

- **Multiple manager accounts with permissions.** Admins create users and choose per user whether they may create, edit and delete quizzes. Quizzes can be marked secret and shared with chosen users. See [Configuration](docs/configuration.md#accounts-and-permissions).
- **Question generator.** Add a generated round of questions from the [Open Trivia Database](https://opentdb.com) (category, difficulty, type and number of questions) straight from the quiz editor. The questions are in English and can be translated with an AI tool. See [Quiz](docs/quiz.md#generated-question-rounds-open-trivia-database).
- **Puzzle question type.** Inspired by De Slimste Mens ter Wereld: 12 words form 3 groups of 4, and players type the connection of each group. See [Quiz](docs/quiz.md#puzzle-questions).
- **Pin question type.** Players tap a spot on an image or a real OpenStreetMap map. The big screen shows every pin, reveals the right spot and the distances, and points follow the distance. See [Quiz](docs/quiz.md#pin-questions).
- **Rounds.** Split a quiz into named rounds with a title slide, a full leaderboard with animated score movement and the longest answer streak when a round ends. See [Quiz](docs/quiz.md#rounds).
- **Customizable backgrounds.** Set a background per quiz, per round or per question, next to the optional app-wide branding.
- **Customizable sounds.** Change the answer music and the effects for the whole app, per quiz or per question, with a library of bundled sounds and your own uploads.
- **Explanation per question.** An optional note that is shown when the answer is revealed.
- **End a quiz early.** The host can stop a running quiz; everyone goes to the final screen with the scores so far.
- **API tokens.** Scripts and AI tools can call the HTTP API with a personal token. See [HTTP API](docs/http-api.md).
- **MCP server at `/api/mcp`.** Let an AI tool such as Claude Desktop or Claude Code create and edit quizzes, generate questions and translate them. See [MCP server](docs/mcp.md).
- **English and Dutch.** The interface is available in both languages.

## 📖 Getting Started

### 🐳 Using Docker (Recommended)

Requires Docker, Docker Compose and Git. The image is built from this repository.

1. Clone the repository:

```bash
git clone https://github.com/HADUS-3D/Razzia.git
cd Razzia
```

2. Open `compose.yml` and set `MANAGER_PASSWORD`. This is the setup code used once to create the first admin account. `JWT_SECRET`, `PUID` and `PGID` are optional, see [Configuration](docs/configuration.md#environment-variables). You can also use an `.env` file instead of the inline `environment:` block: uncomment `env_file` and start from `.env.example`.

3. Build and start it:

```bash
docker compose up -d --build
```

By default the app is published on port `3005` (see `ports` in `compose.yml`). Open http://localhost:3005 to play and http://localhost:3005/manager to host a game.

Accounts, quizzes and results are stored in `./config` next to `compose.yml`, created on first run with an example quiz. They persist across rebuilds.

To update:

```bash
git pull
docker compose up -d --build
```

### 🛠️ Without Docker

Requires Node.js 26 and [pnpm](https://pnpm.io/) 10.16+.

1. Clone and install:

```bash
git clone https://github.com/HADUS-3D/Razzia.git
cd Razzia
pnpm install
```

2. Create your `.env` and set `MANAGER_PASSWORD` in it. `WEB_PORT` (default `3000`) and `SOCKET_PORT` (default `3001`) are optional:

```bash
cp .env.example .env
```

3. Build and start:

```bash
pnpm build
pnpm start
```

Open http://localhost:3000 to play and http://localhost:3000/manager to host a game.

> Want to work on the code? See [CONTRIBUTING.md](.github/CONTRIBUTING.md) to run it in development mode.

## 📚 Documentation

- [Configuration](docs/configuration.md): environment variables, accounts and the `config` folder.
- [Quiz](docs/quiz.md): creating and structuring quizzes, question types, rounds and generated questions.
- [Branding](docs/branding.md): optional custom theming.
- [Reverse Proxy](docs/reverse-proxy.md): running behind Traefik, Nginx, Caddy, or another reverse proxy.
- [WebSocket Protocol](docs/websocket-protocol.md): build a custom client (e.g. an ESP32 physical buzzer).
- [HTTP API](docs/http-api.md): the `/api` surface: sessions, quiz and result CRUD, game creation, API tokens.
- [MCP server](docs/mcp.md): connect an AI tool to create quizzes.
- [Testing](docs/testing.md): running and writing the tests.

Full index in [docs/](docs/README.md).

## 🎮 How to Play

1. Access the manager interface at `/manager`
2. On the very first start, create the first admin (setup code: `MANAGER_PASSWORD`); afterwards log in with your account. Admins add more users, see [Configuration](docs/configuration.md#accounts-and-permissions)
3. Share the game URL and room code with participants
4. Wait for players to join
5. Click the start button to begin the game

## 🌍 Languages

The interface is available in English and Dutch. Use the language switcher to change it; the browser language is used the first time, with English as fallback. Add every new text to both `packages/web/src/locales/en` and `nl`; the tests check that both have the same keys.

## 🎲 Question generator

The quiz editor can add a generated round of questions from the [Open Trivia Database](https://opentdb.com) (category, difficulty, type and number of questions), next to "Add question". Questions are in English and can be translated with an AI tool before they are added. The questions are provided by the Open Trivia Database under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); the podium of a quiz with generated questions shows this credit. See [Quiz](docs/quiz.md#generated-question-rounds-open-trivia-database).

## 📝 Contributing and issues

This is a personal fork that is developed at its own pace for its own server. Changes go through pull requests to the `dev` branch of this repository, see [CONTRIBUTING.md](.github/CONTRIBUTING.md). Bugs or ideas for this fork can be reported at [HADUS-3D/Razzia/issues](https://github.com/HADUS-3D/Razzia/issues).

## 🙏 Credits and license

Razzia was created by [Ralex](https://github.com/Ralex91); this fork builds on the original project at [Ralex91/Razzia](https://github.com/Ralex91/Razzia). Both are released under the [MIT License](LICENSE), which keeps the original copyright notice. Generated trivia questions are provided by the [Open Trivia Database](https://opentdb.com) under CC BY-SA 4.0.
