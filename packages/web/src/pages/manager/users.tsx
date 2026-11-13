import { createFileRoute, redirect } from "@tanstack/react-router"
import { SESSION_ROLES } from "@razzia/common/constants"
import Background from "@razzia/web/components/Background"
import UserManagement from "@razzia/web/features/manager/components/UserManagement"
import { getRole } from "@razzia/web/lib/session"

const ManagerUsersPage = () => (
  <Background>
    <UserManagement />
  </Background>
)

export const Route = createFileRoute("/manager/users")({
  beforeLoad: () => {
    if (getRole() !== SESSION_ROLES.MANAGER) {
      // oxlint-disable-next-line typescript/only-throw-error
      throw redirect({ to: "/manager" })
    }
  },
  component: ManagerUsersPage,
})
