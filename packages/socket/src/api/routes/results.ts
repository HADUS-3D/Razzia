import { StatusCodes } from "http-status-codes"
import { canViewResult } from "@razzia/common/permissions"
import { apiFactory } from "@razzia/socket/api/factory"
import { requireManager } from "@razzia/socket/api/middleware"
import {
  deleteResult,
  getResultById,
  getResultsMeta,
} from "@razzia/socket/services/config"
import { notFound } from "@razzia/socket/services/errors"

const routes = apiFactory
  .createApp()
  .use(requireManager)
  .get("/", (c) => {
    const user = c.get("user")

    return c.json({
      results: getResultsMeta((hostId) => canViewResult(user, hostId)),
    })
  })
  .get("/:id", (c) => {
    const result = getResultById(c.req.param("id"))

    // Results of other hosts are reported as missing, not forbidden.
    if (!canViewResult(c.get("user"), result.hostId)) {
      throw notFound("errors:result.notFound")
    }

    return c.json(result)
  })
  .delete("/:id", (c) => {
    const result = getResultById(c.req.param("id"))

    if (!canViewResult(c.get("user"), result.hostId)) {
      throw notFound("errors:result.notFound")
    }

    deleteResult(c.req.param("id"))

    return c.body(null, StatusCodes.NO_CONTENT)
  })

export const results = routes
