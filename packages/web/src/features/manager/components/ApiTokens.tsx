import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Copy, Trash2 } from "lucide-react"
import { type SubmitEvent, useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"
import AlertDialog from "@razzia/web/components/AlertDialog"
import Button from "@razzia/web/components/Button"
import Card from "@razzia/web/components/Card"
import Input from "@razzia/web/components/Input"
import {
  apiTokensQuery,
  createApiToken,
  revokeApiToken,
  tokenKeys,
} from "@razzia/web/features/manager/queries"
import { ApiError } from "@razzia/web/lib/api"

const EXPIRIES = [
  ["", "manager:tokens.expiry.never"],
  ["30", "manager:tokens.expiry.days30"],
  ["90", "manager:tokens.expiry.days90"],
  ["365", "manager:tokens.expiry.year"],
] as const

const formatDate = (value: string | null, fallback: string) =>
  value ? new Date(value).toLocaleDateString() : fallback

const ApiTokens = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data } = useQuery(apiTokensQuery())
  const [name, setName] = useState("")
  const [expiry, setExpiry] = useState("")
  const [created, setCreated] = useState<string | null>(null)

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: tokenKeys.all })

  const onError = (error: Error) =>
    toast.error(
      t(error instanceof ApiError ? error.key : "errors:route.description"),
    )

  const { mutate: create, isPending } = useMutation({
    mutationFn: createApiToken,
    onSuccess: async (token) => {
      await refresh()
      setName("")
      setCreated(token.token)
    },
    onError,
  })

  const { mutate: revoke } = useMutation({
    mutationFn: revokeApiToken,
    onSuccess: async () => {
      await refresh()
      toast.success(t("manager:tokens.revoked"))
    },
    onError,
  })

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    create({ name, ...(expiry ? { expiresInDays: Number(expiry) } : {}) })
  }

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(t("manager:tokens.copied"))
    } catch {
      toast.error(t("errors:route.description"))
    }
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
        <p className="text-lg font-semibold">{t("manager:tokens.title")}</p>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        {t("manager:tokens.description")}
      </p>
      {created && (
        <div className="mb-4 rounded-lg border-2 border-primary p-3 text-sm">
          <p>{t("manager:tokens.shownOnce")}</p>
          <p className="mt-1 font-mono text-sm font-semibold break-all select-all">
            {created}
          </p>
          <div className="mt-2 flex gap-4">
            <button
              className="flex items-center gap-1 text-muted-foreground underline"
              onClick={() => copy(created)}
            >
              <Copy className="size-3.5" />
              {t("manager:tokens.copy")}
            </button>
            <button
              className="text-muted-foreground underline"
              onClick={() => setCreated(null)}
            >
              {t("common:close")}
            </button>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          variant="sm"
          className="flex-1"
          value={name}
          maxLength={64}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("manager:tokens.namePlaceholder")}
        />
        <select
          className="rounded-lg border-2 border-accent bg-background px-2 py-1 text-sm font-semibold text-foreground"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          aria-label={t("manager:tokens.expiry.label")}
        >
          {EXPIRIES.map(([value, label]) => (
            <option key={value} value={value}>
              {t(label)}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
          {t("manager:tokens.create")}
        </Button>
      </form>
      <div className="mt-4 min-h-0 flex-1 overflow-auto">
        {data?.tokens.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("manager:tokens.empty")}
          </p>
        )}
        <table className="w-full text-sm">
          <tbody>
            {(data?.tokens ?? []).map((token) => (
              <tr key={token.id} className="border-t border-accent">
                <td className="p-2 font-medium">{token.name}</td>
                <td className="p-2 font-mono text-muted-foreground">
                  {token.prefix}...
                </td>
                <td className="p-2 text-muted-foreground">
                  {t("manager:tokens.lastUsed", {
                    date: formatDate(
                      token.lastUsedAt,
                      t("manager:tokens.neverUsed"),
                    ),
                  })}
                </td>
                <td className="p-2 text-muted-foreground">
                  {t("manager:tokens.expires", {
                    date: formatDate(
                      token.expiresAt,
                      t("manager:tokens.expiry.never"),
                    ),
                  })}
                </td>
                <td className="p-2">
                  <div className="flex justify-end">
                    <AlertDialog
                      trigger={
                        <button
                          className="rounded-sm p-2 hover:bg-red-600/10"
                          title={t("manager:tokens.revoke")}
                        >
                          <Trash2 className="size-4 stroke-red-500" />
                        </button>
                      }
                      title={t("manager:tokens.revoke")}
                      description={t("manager:tokens.revokeConfirm", {
                        name: token.name,
                      })}
                      confirmLabel={t("manager:tokens.revoke")}
                      onConfirm={() => revoke(token.id)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default ApiTokens
