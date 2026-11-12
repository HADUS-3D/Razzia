import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { SESSION_ROLES } from "@razzia/common/constants"
import ManagerLogin from "@razzia/web/features/manager/components/ManagerLogin"
import { getRole, setToken } from "@razzia/web/lib/session"

const ManagerAuthPage = () => {
  const navigate = useNavigate()

  return (
    <ManagerLogin
      onLoggedIn={(token) => {
        setToken(token)
        navigate({ to: "/manager/config" })
      }}
    />
  )
}

export const Route = createFileRoute("/(auth)/manager/")({
  beforeLoad: () => {
    if (getRole() === SESSION_ROLES.MANAGER) {
      // oxlint-disable-next-line typescript/only-throw-error
      throw redirect({ to: "/manager/config" })
    }
  },
  component: ManagerAuthPage,
})
