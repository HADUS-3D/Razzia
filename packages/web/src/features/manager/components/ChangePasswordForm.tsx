import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type SubmitEvent, useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"
import Button from "@razzia/web/components/Button"
import Input from "@razzia/web/components/Input"
import { authKeys, changePassword } from "@razzia/web/features/manager/queries"
import { ApiError } from "@razzia/web/lib/api"

interface Props {
  forced: boolean
  onDone: () => void
}

const ChangePasswordForm = ({ forced, onDone }: Props) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")

  const { mutate, isPending } = useMutation({
    mutationFn: changePassword,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.me })
      toast.success(t("manager:account.passwordChanged"))
      onDone()
    },
    onError: (error) =>
      toast.error(
        t(error instanceof ApiError ? error.key : "errors:route.description"),
      ),
  })

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (next !== confirm) {
      toast.error(t("manager:account.passwordMismatch"))

      return
    }

    mutate({ currentPassword: current, newPassword: next })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-lg font-semibold">
        {t("manager:account.changePassword")}
      </p>
      {forced && (
        <p className="text-sm text-muted-foreground">
          {t("manager:account.mustChange")}
        </p>
      )}
      <Input
        type="password"
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        placeholder={t("manager:account.currentPassword")}
      />
      <Input
        type="password"
        autoComplete="new-password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        placeholder={t("manager:account.newPassword")}
      />
      <Input
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder={t("manager:account.confirmPassword")}
      />
      <div className="flex gap-2">
        {!forced && (
          <Button
            type="button"
            className="flex-1 bg-accent text-accent-foreground"
            onClick={onDone}
          >
            {t("common:cancel")}
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={isPending}>
          {t("common:submit")}
        </Button>
      </div>
    </form>
  )
}

export default ChangePasswordForm
