import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Sparkles, X } from "lucide-react"
import { Dialog } from "radix-ui"
import { useState, type SubmitEvent } from "react"
import toast from "react-hot-toast"
import { Trans, useTranslation } from "react-i18next"
import {
  OPENTDB_DIFFICULTIES,
  OPENTDB_LICENSE_URL,
  OPENTDB_MAX_AMOUNT,
  OPENTDB_TYPES,
  OPENTDB_URL,
} from "@razzia/common/constants"
import Button from "@razzia/web/components/Button"
import Input from "@razzia/web/components/Input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@razzia/web/components/Select"
import {
  generateQuizz,
  generatorCategoriesQuery,
  quizzKeys,
} from "@razzia/web/features/manager/queries"
import { buildTranslationPrompt } from "@razzia/web/features/manager/utils/translation-prompt"
import { api, ApiError, unwrap } from "@razzia/web/lib/api"
import { downloadJson } from "@razzia/web/lib/download"

const ANY = "any"
const DEFAULT_AMOUNT = 10
const DEFAULT_LANGUAGE = "Dutch"

interface Created {
  id: string
  subject: string
  questionCount: number
}

const linkClass = "underline hover:text-foreground"

export const Attribution = ({ className }: { className?: string }) => (
  <p className={className}>
    <Trans
      i18nKey="manager:generator.attribution"
      components={{
        odb: (
          <a
            href={OPENTDB_URL}
            target="_blank"
            rel="noreferrer"
            className={linkClass}
          />
        ),
        cc: (
          <a
            href={OPENTDB_LICENSE_URL}
            target="_blank"
            rel="noreferrer"
            className={linkClass}
          />
        ),
      }}
    />
  </p>
)

const Field = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold">{label}</span>
    {children}
  </label>
)

interface FormProps {
  onCreated: (created: Created) => void
}

const GeneratorForm = ({ onCreated }: FormProps) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: categoriesData, isPending: loadingCategories } = useQuery(
    generatorCategoriesQuery(),
  )
  const [category, setCategory] = useState(ANY)
  const [difficulty, setDifficulty] = useState(ANY)
  const [type, setType] = useState(ANY)
  const [amount, setAmount] = useState(String(DEFAULT_AMOUNT))
  const [subject, setSubject] = useState("")

  const { mutate, isPending } = useMutation({
    mutationFn: generateQuizz,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: quizzKeys.all })
      onCreated(created)
    },
    onError: (error) =>
      toast.error(
        t(error instanceof ApiError ? error.key : "errors:generator.failed"),
      ),
  })

  const submit = (e: SubmitEvent) => {
    e.preventDefault()

    const parsedAmount = Number(amount)

    mutate({
      amount: parsedAmount,
      ...(category !== ANY ? { category: Number(category) } : {}),
      ...(difficulty !== ANY
        ? { difficulty: difficulty as (typeof OPENTDB_DIFFICULTIES)[number] }
        : {}),
      ...(type !== ANY ? { type: type as (typeof OPENTDB_TYPES)[number] } : {}),
      ...(subject.trim() ? { subject: subject.trim() } : {}),
    })
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
      <Field label={t("manager:generator.category")}>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger disabled={loadingCategories}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>
              {t("manager:generator.anyCategory")}
            </SelectItem>
            {categoriesData?.categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("manager:generator.difficulty")}>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>
                {t("manager:generator.anyDifficulty")}
              </SelectItem>
              {OPENTDB_DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>
                  {t(`manager:generator.difficulties.${d}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label={t("manager:generator.type")}>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>
                {t("manager:generator.anyType")}
              </SelectItem>
              {OPENTDB_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`manager:generator.types.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label={t("manager:generator.amount")}>
        <Input
          variant="sm"
          type="number"
          min={1}
          max={OPENTDB_MAX_AMOUNT}
          className="w-full"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </Field>

      <Field label={t("manager:generator.subject")}>
        <Input
          variant="sm"
          className="w-full"
          value={subject}
          maxLength={100}
          onChange={(e) => setSubject(e.target.value)}
        />
      </Field>

      <p className="text-sm text-muted-foreground">
        {t("manager:generator.englishNote")}
      </p>

      <Attribution className="text-xs text-muted-foreground" />

      {isPending && (
        <p className="text-sm text-muted-foreground">
          {t("manager:generator.wait")}
        </p>
      )}

      <div className="flex justify-end">
        <Button className="px-4 py-2 text-sm" disabled={isPending}>
          {isPending
            ? t("manager:generator.generating")
            : t("manager:generator.submit")}
        </Button>
      </div>
    </form>
  )
}

interface DoneProps {
  created: Created
  onClose: () => void
}

const GeneratorDone = ({ created, onClose }: DoneProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [translating, setTranslating] = useState(false)
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE)
  const prompt = buildTranslationPrompt(language || DEFAULT_LANGUAGE)

  const download = async () => {
    try {
      const { id: _id, ...quizz } = await unwrap(
        api.quizz[":id"].$get({ param: { id: created.id } }),
      )

      downloadJson(quizz, `${created.subject}.json`)
    } catch (error) {
      toast.error(
        t(error instanceof ApiError ? error.key : "errors:quizz.notFound"),
      )
    }
  }

  const startTranslation = async () => {
    setTranslating(true)
    await download()
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      toast.success(t("manager:generator.copied"))
    } catch {
      toast.error(t("manager:generator.copyFailed"))
    }
  }

  const edit = () => {
    onClose()
    void navigate({
      to: "/manager/quizz/$quizzId",
      params: { quizzId: created.id },
    })
  }

  if (!translating) {
    return (
      <div className="mt-4 flex flex-col gap-4">
        <p>
          {t("manager:generator.created", {
            subject: created.subject,
            count: created.questionCount,
          })}
        </p>
        <p className="font-semibold">
          {t("manager:generator.keepOrTranslate")}
        </p>
        <Field label={t("manager:generator.targetLanguage")}>
          <Input
            variant="sm"
            className="w-full"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          />
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            className="bg-accent px-4 py-2 text-sm text-accent-foreground"
            onClick={edit}
          >
            {t("manager:generator.keepEnglish")}
          </Button>
          <Button
            className="px-4 py-2 text-sm"
            disabled={!language.trim()}
            onClick={startTranslation}
          >
            {t("manager:generator.translate")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <p className="text-sm">{t("manager:generator.translateSteps")}</p>
      <Field label={t("manager:generator.instruction")}>
        <textarea
          readOnly
          rows={9}
          value={prompt}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-lg border-2 border-accent bg-background p-2 text-sm text-foreground"
        />
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          className="bg-accent px-4 py-2 text-sm text-accent-foreground"
          onClick={download}
        >
          {t("manager:generator.downloadAgain")}
        </Button>
        <Button className="px-4 py-2 text-sm" onClick={copy}>
          {t("manager:generator.copy")}
        </Button>
      </div>
      <div className="flex justify-end gap-2 border-t border-accent pt-3">
        <Button
          className="bg-accent px-4 py-2 text-sm text-accent-foreground"
          onClick={edit}
        >
          {t("manager:generator.editEnglish")}
        </Button>
        <Button className="px-4 py-2 text-sm" onClick={onClose}>
          {t("manager:generator.done")}
        </Button>
      </div>
    </div>
  )
}

const GeneratorDialog = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [created, setCreated] = useState<Created | null>(null)

  const onOpenChange = (value: boolean) => {
    setOpen(value)

    if (!value) {
      setCreated(null)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <Button
          className="aspect-square bg-accent px-3 text-accent-foreground"
          title={t("manager:generator.button")}
        >
          <Sparkles className="size-4" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-xl bg-background p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">
                {created
                  ? t("manager:generator.createdTitle")
                  : t("manager:generator.title")}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                {created ? created.subject : t("manager:generator.description")}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-sm p-1 text-muted-foreground hover:bg-accent">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          {created ? (
            <GeneratorDone
              created={created}
              onClose={() => onOpenChange(false)}
            />
          ) : (
            <GeneratorForm onCreated={setCreated} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default GeneratorDialog
