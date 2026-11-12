import { useMutation, useQuery } from "@tanstack/react-query"
import { type SubmitEvent, useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"
import Button from "@razzia/web/components/Button"
import Card from "@razzia/web/components/Card"
import Input from "@razzia/web/components/Input"
import Loader from "@razzia/web/components/Loader"
import {
  authStatusQuery,
  managerLogin,
  managerSetup,
} from "@razzia/web/features/manager/queries"
import { ApiError } from "@razzia/web/lib/api"

interface Props {
  onLoggedIn: (_token: string) => void
}

const ManagerLogin = ({ onLoggedIn }: Props) => {
  const { t } = useTranslation()
  const { data: status } = useQuery(authStatusQuery())
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [setupCode, setSetupCode] = useState("")
  const needsSetup = status?.needsSetup ?? false

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      needsSetup
        ? managerSetup({ username, password, setupCode })
        : managerLogin({ username, password }),
    onSuccess: (session) => onLoggedIn(session.token),
    onError: (error) => {
      toast.error(
        t(error instanceof ApiError ? error.key : "errors:route.description"),
      )
    },
  })

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (needsSetup && password !== confirm) {
      toast.error(t("manager:account.passwordMismatch"))

      return
    }

    mutate()
  }

  if (!status) {
    return <Loader />
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <p className="text-lg font-semibold">
          {t(needsSetup ? "manager:setup.title" : "manager:login.title")}
        </p>
        {needsSetup && (
          <p className="text-sm text-muted-foreground">
            {t("manager:setup.description")}
          </p>
        )}
        <Input
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={t("manager:account.username")}
        />
        <Input
          type="password"
          autoComplete={needsSetup ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("manager:passwordPlaceholder")}
        />
        {needsSetup && (
          <>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t("manager:account.confirmPassword")}
            />
            <Input
              type="password"
              value={setupCode}
              onChange={(e) => setSetupCode(e.target.value)}
              placeholder={t("manager:setup.code")}
            />
          </>
        )}
        <Button type="submit" disabled={isPending}>
          {t(needsSetup ? "manager:setup.submit" : "manager:login.submit")}
        </Button>
      </form>
    </Card>
  )
}

export default ManagerLogin
