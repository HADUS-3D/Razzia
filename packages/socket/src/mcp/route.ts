import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { Hono } from "hono"
import { StatusCodes } from "http-status-codes"
import { createMcpServer } from "@razzia/socket/mcp/server"
import {
  checkApiToken,
  looksLikeApiToken,
} from "@razzia/socket/services/api-tokens"

/**
 * MCP endpoint (Streamable HTTP, stateless). Only an API token opens it: every
 * request gets its own server, bound to the caller's token.
 *
 * Unlike the rest of the API, a refused token is explained: MCP clients show
 * little more than the status and body, and a bare 401 sends them off to look
 * for OAuth, which hides the real reason. A request without any token is a
 * 401, as clients expect; a token that was sent but is wrong is a 403 with a
 * specific error key.
 */
export const mcp = new Hono().all("/", async (c) => {
  const authorization = c.req.header("Authorization") ?? ""

  if (!authorization.startsWith("Bearer ")) {
    return c.json(
      { error: "errors:tokens.missing" },
      StatusCodes.UNAUTHORIZED,
      {
        "WWW-Authenticate": 'Bearer realm="razzia"',
      },
    )
  }

  const token = authorization.slice("Bearer ".length).trim()

  if (!looksLikeApiToken(token)) {
    return c.json({ error: "errors:tokens.wrongFormat" }, StatusCodes.FORBIDDEN)
  }

  const check = checkApiToken(token)

  if (check.status !== "ok") {
    return c.json(
      {
        error:
          check.status === "expired"
            ? "errors:tokens.expired"
            : "errors:tokens.invalid",
      },
      StatusCodes.FORBIDDEN,
    )
  }

  const server = createMcpServer(`Bearer ${token}`)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })

  await server.connect(transport)

  try {
    return await transport.handleRequest(c.req.raw)
  } finally {
    await server.close()
  }
})
