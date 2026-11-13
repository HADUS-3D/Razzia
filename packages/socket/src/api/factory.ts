import { createFactory } from "hono/factory"
import type { PublicUser, SessionClaims } from "@razzia/common/types/auth"

export interface ApiEnv {
  Variables: {
    claims: SessionClaims
    user: PublicUser
  }
}

export const apiFactory = createFactory<ApiEnv>()
