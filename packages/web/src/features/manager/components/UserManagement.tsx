import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, KeyRound, Trash2 } from "lucide-react"
import { type SubmitEvent, useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"
import type { PublicUser, UserPermissions } from "@razzia/common/types/auth"
import { USER_ROLES } from "@razzia/common/constants"
import AlertDialog from "@razzia/web/components/AlertDialog"
import Button from "@razzia/web/components/Button"
import Card from "@razzia/web/components/Card"
import Input from "@razzia/web/components/Input"
import {
  createUser,
  deleteUser,
  meQuery,
  resetUserPassword,
  updateUser,
  userKeys,
  usersQuery,
} from "@razzia/web/features/manager/queries"
import { ApiError } from "@razzia/web/lib/api"

const PERMISSIONS = [
  ["createQuizz", "manager:users.permissions.createQuizz"],
  ["editQuizz", "manager:users.permissions.editQuizz"],
  ["deleteQuizz", "manager:users.permissions.deleteQuizz"],
] as const

const NEW_USER_PERMISSIONS: UserPermissions = {
  createQuizz: true,
  editQuizz: true,
  deleteQuizz: false,
}

const NewUserForm = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const { mutate, isPending } = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all })
      setUsername("")
      setPassword("")
      toast.success(t("manager:users.created"))
    },
    onError: (error) =>
      toast.error(
        t(error instanceof ApiError ? error.key : "errors:route.description"),
      ),
  })

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    mutate({
      username,
      password,
      role: USER_ROLES.USER,
      permissions: NEW_USER_PERMISSIONS,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        variant="sm"
        className="flex-1"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder={t("manager:account.username")}
      />
      <Input
        variant="sm"
        className="flex-1"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t("manager:users.temporaryPassword")}
      />
      <Button type="submit" size="sm" disabled={isPending}>
        {t("manager:users.add")}
      </Button>
    </form>
  )
}

interface RowProps {
  user: PublicUser
  isSelf: boolean
  onReset: (_name: string, _password: string) => void
}

const UserRow = ({ user, isSelf, onReset }: RowProps) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const admin = user.role === USER_ROLES.ADMIN

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: userKeys.all })

  const onError = (error: Error) =>
    toast.error(
      t(error instanceof ApiError ? error.key : "errors:route.description"),
    )

  const { mutate: update } = useMutation({
    mutationFn: updateUser,
    onSuccess: refresh,
    onError,
  })

  const { mutate: reset } = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: async ({ password }) => {
      await refresh()
      onReset(user.username, password)
    },
    onError,
  })

  const { mutate: remove } = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      refresh()
      toast.success(t("manager:users.deleted"))
    },
    onError,
  })

  return (
    <tr className="border-t border-accent">
      <td className="p-2 font-medium">
        {user.username}
        {user.mustChangePassword && (
          <span className="ml-2 text-xs text-muted-foreground">
            {t("manager:users.pendingPassword")}
          </span>
        )}
      </td>
      <td className="p-2">
        <input
          type="checkbox"
          checked={admin}
          disabled={isSelf}
          title={t("manager:users.admin")}
          onChange={(e) =>
            update({
              id: user.id,
              json: {
                role: e.target.checked ? USER_ROLES.ADMIN : USER_ROLES.USER,
              },
            })
          }
        />
      </td>
      {PERMISSIONS.map(([key]) => (
        <td key={key} className="p-2">
          <input
            type="checkbox"
            checked={admin || user.permissions[key]}
            disabled={admin}
            onChange={(e) =>
              update({
                id: user.id,
                json: {
                  permissions: {
                    ...user.permissions,
                    [key]: e.target.checked,
                  },
                },
              })
            }
          />
        </td>
      ))}
      <td className="p-2">
        <div className="flex justify-end gap-0.5">
          <AlertDialog
            trigger={
              <button
                className="rounded-sm p-2 text-accent-foreground hover:bg-accent-foreground/10"
                title={t("manager:users.resetPassword")}
              >
                <KeyRound className="size-4" />
              </button>
            }
            title={t("manager:users.resetPassword")}
            description={t("manager:users.resetConfirm", {
              name: user.username,
            })}
            confirmLabel={t("manager:users.reset")}
            onConfirm={() => reset(user.id)}
          />
          {!isSelf && (
            <AlertDialog
              trigger={
                <button
                  className="rounded-sm p-2 hover:bg-red-600/10"
                  title={t("manager:users.delete")}
                >
                  <Trash2 className="size-4 stroke-red-500" />
                </button>
              }
              title={t("manager:users.delete")}
              description={t("manager:users.deleteConfirm", {
                name: user.username,
              })}
              confirmLabel={t("common:delete")}
              onConfirm={() => remove(user.id)}
            />
          )}
        </div>
      </td>
    </tr>
  )
}

const UserManagement = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: me } = useQuery(meQuery())
  const { data } = useQuery(usersQuery())
  const [temp, setTemp] = useState<{ name: string; password: string } | null>(
    null,
  )

  if (me && me.role !== USER_ROLES.ADMIN) {
    navigate({ to: "/manager/config" })
  }

  return (
    <Card className="max-h-[90dvh] w-full max-w-3xl">
      <div className="mb-4 flex items-center gap-2">
        <button
          className="rounded-sm p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={() => navigate({ to: "/manager/config" })}
          title={t("common:back")}
        >
          <ArrowLeft className="size-4" />
        </button>
        <p className="text-lg font-semibold">{t("manager:users.title")}</p>
      </div>
      {temp && (
        <div className="mb-4 rounded-lg border-2 border-primary p-3 text-sm">
          <p>{t("manager:users.temporaryPasswordIs")}</p>
          <p className="mt-1 font-mono text-base font-semibold select-all">
            {temp.name}: {temp.password}
          </p>
          <button
            className="mt-2 text-muted-foreground underline"
            onClick={() => setTemp(null)}
          >
            {t("common:close")}
          </button>
        </div>
      )}
      <NewUserForm />
      <p className="mt-2 text-sm text-muted-foreground">
        {t("manager:users.newHint")}
      </p>
      <div className="mt-4 min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="p-2">{t("manager:account.username")}</th>
              <th className="p-2">{t("manager:users.admin")}</th>
              {PERMISSIONS.map(([key, label]) => (
                <th key={key} className="p-2">
                  {t(label)}
                </th>
              ))}
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {(data?.users ?? []).map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isSelf={user.id === me?.id}
                onReset={(name, password) => setTemp({ name, password })}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default UserManagement
