import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Share2, X } from "lucide-react"
import { Dialog } from "radix-ui"
import { useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"
import type { QuizzAccess } from "@razzia/common/types/auth"
import { QUIZZ_VISIBILITIES } from "@razzia/common/constants"
import Button from "@razzia/web/components/Button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@razzia/web/components/Select"
import Switch from "@razzia/web/components/Switch"
import {
  quizzKeys,
  quizzQuery,
  updateQuizzAccess,
  userDirectoryQuery,
} from "@razzia/web/features/manager/queries"
import { ApiError } from "@razzia/web/lib/api"

interface Props {
  quizzId: string
  subject: string
}

interface FormProps extends Props {
  access: QuizzAccess
  onClose: () => void
}

const toggle = (list: string[], id: string, on: boolean) =>
  on ? [...new Set([...list, id])] : list.filter((item) => item !== id)

const AccessForm = ({ quizzId, access, onClose }: FormProps) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: directory } = useQuery(userDirectoryQuery())
  const [secret, setSecret] = useState(
    access.visibility === QUIZZ_VISIBILITIES.SECRET,
  )
  const [viewers, setViewers] = useState(access.viewers)
  const [editors, setEditors] = useState(access.editors)
  const [ownerId, setOwnerId] = useState(access.ownerId ?? "")
  const users = directory?.users ?? []

  const { mutate, isPending } = useMutation({
    mutationFn: updateQuizzAccess,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: quizzKeys.all })
      toast.success(t("manager:access.saved"))
      onClose()
    },
    onError: (error) =>
      toast.error(
        t(error instanceof ApiError ? error.key : "errors:route.description"),
      ),
  })

  const save = () =>
    mutate({
      id: quizzId,
      json: {
        visibility: secret ? QUIZZ_VISIBILITIES.SECRET : QUIZZ_VISIBILITIES.ALL,
        viewers,
        editors,
        ...(ownerId ? { ownerId } : {}),
      },
    })

  return (
    <div className="mt-4 flex flex-col gap-4">
      <label className="flex items-center justify-between gap-4">
        <span>
          <span className="block font-semibold">
            {t("manager:access.secret")}
          </span>
          <span className="block text-sm text-muted-foreground">
            {t("manager:access.secretHint")}
          </span>
        </span>
        <Switch checked={secret} onCheckedChange={setSecret} />
      </label>

      <div>
        <p className="mb-1 font-semibold">{t("manager:access.owner")}</p>
        <Select value={ownerId} onValueChange={setOwnerId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="max-h-64 overflow-auto rounded-lg border-2 border-accent">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="p-2">{t("manager:access.user")}</th>
              <th className="p-2">{t("manager:access.canView")}</th>
              <th className="p-2">{t("manager:access.canEdit")}</th>
            </tr>
          </thead>
          <tbody>
            {users
              .filter((u) => u.id !== ownerId)
              .map((u) => (
                <tr key={u.id} className="border-t border-accent">
                  <td className="p-2 font-medium">{u.username}</td>
                  <td className="p-2">
                    <input
                      type="checkbox"
                      disabled={!secret || editors.includes(u.id)}
                      checked={
                        !secret ||
                        viewers.includes(u.id) ||
                        editors.includes(u.id)
                      }
                      onChange={(e) =>
                        setViewers(toggle(viewers, u.id, e.target.checked))
                      }
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={editors.includes(u.id)}
                      onChange={(e) =>
                        setEditors(toggle(editors, u.id, e.target.checked))
                      }
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("manager:access.editHint")}
      </p>

      <div className="flex justify-end gap-2">
        <Button
          className="bg-accent px-4 py-2 text-sm text-accent-foreground"
          onClick={onClose}
        >
          {t("common:cancel")}
        </Button>
        <Button
          className="px-4 py-2 text-sm"
          onClick={save}
          disabled={isPending}
        >
          {t("common:save")}
        </Button>
      </div>
    </div>
  )
}

const QuizzAccessDialog = ({ quizzId, subject }: Props) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { data } = useQuery({ ...quizzQuery(quizzId), enabled: open })

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="rounded-sm p-2 text-accent-foreground hover:bg-accent-foreground/10"
          title={t("manager:access.title")}
        >
          <Share2 className="size-4" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">
                {t("manager:access.title")}
              </Dialog.Title>
              <Dialog.Description className="truncate text-sm text-muted-foreground">
                {subject}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-sm p-1 text-muted-foreground hover:bg-accent">
              <X className="size-4" />
            </Dialog.Close>
          </div>
          {data && (
            <AccessForm
              quizzId={quizzId}
              subject={subject}
              access={data.access}
              onClose={() => setOpen(false)}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default QuizzAccessDialog
