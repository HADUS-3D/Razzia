import { createFileRoute, redirect } from "@tanstack/react-router"
import { SESSION_ROLES } from "@razzia/common/constants"
import Background from "@razzia/web/components/Background"
import ApiTokens from "@razzia/web/features/manager/components/ApiTokens"
import { getRole } from "@razzia/web/lib/session"

const ManagerTokensPage = () => (
  <Background>
    <ApiTokens />
  </Background>
)

export const Route = createFileRoute("/manager/tokens")({
  beforeLoad: () => {
    if (getRole() !== SESSION_ROLES.MANAGER) {
      // oxlint-disable-next-line typescript/only-throw-error
      throw redirect({ to: "/manager" })
    }
  },
  component: ManagerTokensPage,
})
