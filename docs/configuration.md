# Configuration

Razzia is configured in two places:

- **Environment variables** for the setup code and the session secret.
- The **`config` folder** for content: quizzes, results and branding. It is mounted as a Docker volume, or resolved as `../../config` relative to the packages when running without Docker.

## Environment variables

Copy [`.env.example`](../.env.example) to `.env` at the root of the project:

```bash
MANAGER_PASSWORD=your-setup-code
JWT_SECRET=
```

| Variable           | Required | What it does                                                                                                                                                                                                       |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MANAGER_PASSWORD` | Yes      | Setup code: needed once, on the first-setup screen, to create the first admin. It is not a login password and is unused afterwards. Until it is set, setup is refused with `errors:manager.passwordNotConfigured`. |
| `JWT_SECRET`       | No       | Signs session tokens. Must be at least 32 characters; a shorter value is ignored.                                                                                                                                  |
| `WEB_PORT`         | No       | Without Docker only: port the app is served on. Defaults to `3000`.                                                                                                                                                |
| `SOCKET_PORT`      | No       | Without Docker only: port of the socket server, proxied behind the web port. Defaults to `3001`.                                                                                                                   |

`pnpm dev` and `pnpm start` load `.env` automatically. With Docker, `compose.yml` reads the same file through `env_file`, or you can set the variables inline with `environment:`. With a bare `docker run`, pass them with `-e MANAGER_PASSWORD=...`.

### About `JWT_SECRET`

Leave it empty and the server generates a new secret at every start. The consequence is that a restart logs every manager out and hands every player a fresh identity.

That is usually fine: game state lives in memory, so a restart already ends every running game — the sessions it invalidates point at games that no longer exist. Set the variable only if you want sessions to survive a restart, and keep it secret: anyone holding it can forge a manager session.

Generate one with either of these:

```bash
openssl rand -hex 32

# No openssl? Node is already a prerequisite:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Both print 64 hexadecimal characters, the same shape the server generates for itself.

## Accounts and permissions

The manager interface uses accounts. Open `/manager` (or the "Manager login" button on the home page) after the first start: while no account exists it shows the first-setup screen, where you choose a username and password for the first admin and enter `MANAGER_PASSWORD` as setup code. Quizzes that already exist are assigned to that admin and stay visible to everyone.

Accounts live in `config/users.json`. Back it up with the rest of the folder; deleting it brings back the setup screen.

| Who        | Can                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Admin      | See, edit, delete and host every quiz and result; create users, change rights, reset passwords, hand over quizzes |
| Every user | Host the quizzes they can see, and see the results of the games they hosted                                       |
| Create     | Right to create quizzes (the creator becomes the owner)                                                           |
| Edit       | Right to edit own quizzes and quizzes where the owner added them as editor                                        |
| Delete own | Right to delete quizzes they own (never someone else's)                                                           |

A quiz is visible to every user unless the owner or an admin marks it **secret**; then only the owner, admins and the users chosen in the sharing dialog can see it. Admins reset a password from the user list: the user gets a temporary password and must choose a new one at the next login. Results without a recorded host (from before accounts existed) are visible to admins only.

## The `config` folder

Created automatically on first run, with an example quiz:

```
config/
  users.json  manager accounts (hashed passwords)
  quizz/      your quizzes
  results/    saved game results
  media/      files uploaded from the quiz editor
  branding/   optional theming
```

See [Quiz Configuration](quiz.md) and [Custom Branding](branding.md).
