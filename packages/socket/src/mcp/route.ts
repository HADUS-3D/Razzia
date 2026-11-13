import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { Hono } from "hono"
import { StatusCodes } from "http-status-codes"
import { createMcpServer } from "@razzia/socket/mcp/server"
import {
  authenticateApiToken,
  looksLikeApiToken,
} from "@razzia/socket/services/api-tokens"

/**
 * MCP endpoint (Streamable HTTP, stateless). Only an API token opens it: every
 * request gets its own server, bound to the caller's token.
 */
export const mcp = new Hono().all("/", async (c) => {
  const authorization = c.req.header("Authorization") ?? ""
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : ""

  if (!looksLikeApiToken(token) || !authenticateApiToken(token)) {
    return c.json(
      { error: "errors:auth.unauthorized" },
      StatusCodes.UNAUTHORIZED,
    )
  }

  const server = createMcpServer(authorization)
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
