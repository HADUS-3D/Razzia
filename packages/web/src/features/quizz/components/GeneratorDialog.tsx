import { useMutation, useQuery } from "@tanstack/react-query"
import { Sparkles, X } from "lucide-react"
import { Dialog } from "radix-ui"
import { useRef, useState, type ChangeEvent, type SubmitEvent } from "react"
import toast from "react-hot-toast"
import { Trans, useTranslation } from "react-i18next"
import type { Question, QuizzSource } from "@razzia/common/types/game"
import {
  OPENTDB_DIFFICULTIES,
  OPENTDB_LICENSE_URL,
  OPENTDB_MAX_AMOUNT,
  OPENTDB_TYPES,
  OPENTDB_URL,
  QUIZZ_SOURCES,
} from "@razzia/common/constants"
import { parseRound, toRound } from "@razzia/common/validators/round"
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
  generateQuestions,
  generatorCategoriesQuery,
} from "@razzia/web/features/manager/queries"
import { buildTranslationPrompt } from "@razzia/web/features/quizz/utils/translation-prompt"
import { ApiError } from "@razzia/web/lib/api"
import { downloadJson } from "@razzia/web/lib/download"

const ANY = "any"
const DEFAULT_AMOUNT = 10
const DEFAULT_LANGUAGE = "Dutch"

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
  onGenerated: (questions: Question[]) => void
}

const GeneratorForm = ({ onGenerated }: FormProps) => {
  const { t } = useTranslation()
  const { data: categoriesData, isPending: loadingCategories } = useQuery(
    generatorCategoriesQuery(),
  )
  const [category, setCategory] = useState(ANY)
  const [difficulty, setDifficulty] = useState(ANY)
  const [type, setType] = useState(ANY)
  const [amount, setAmount] = useState(String(DEFAULT_AMOUNT))

  const { mutate, isPending } = useMutation({
    mutationFn: generateQuestions,
    onSuccess: ({ questions }) => onGenerated(questions as Question[]),
    onError: (error) =>
      toast.error(
        t(error instanceof ApiError ? error.key : "errors:generator.failed"),
      ),
  })

  const submit = (e: SubmitEvent) => {
    e.preventDefault()

    mutate({
      amount: Number(amount),
      ...(category !== ANY ? { category: Number(category) } : {}),
      ...(difficulty !== ANY
        ? { difficulty: difficulty as (typeof OPENTDB_DIFFICULTIES)[number] }
        : {}),
      ...(type !== ANY ? { type: type as (typeof OPENTDB_TYPES)[number] } : {}),
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

interface ReadyProps {
  questions: Question[]
  onAdd: (questions: Question[]) => void
}

const GeneratorReady = ({ questions, onAdd }: ReadyProps) => {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [translating, setTranslating] = useState(false)
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE)
  const [pasted, setPasted] = useState("")
  const prompt = buildTranslationPrompt(language || DEFAULT_LANGUAGE)

  const download = () => downloadJson(toRound(questions), "round.json")

  const startTranslation = () => {
    setTranslating(true)
    download()
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      toast.success(t("manager:generator.copied"))
    } catch {
      toast.error(t("manager:generator.copyFailed"))
    }
  }

  const importText = (text: string) => {
    const imported = parseRound(text)

    if (!imported) {
      toast.error(t("errors:generator.invalidImport"))

      return
    }

    onAdd(imported)
  }

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    e.target.value = ""

    if (!file) {
      return
    }

    void file.text().then(importText)
  }

  if (!translating) {
    return (
      <div className="mt-4 flex flex-col gap-4">
        <p>{t("manager:generator.created", { count: questions.length })}</p>
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
            onClick={() => onAdd(questions)}
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
          rows={8}
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

      <div className="flex flex-col gap-2 border-t border-accent pt-3">
        <p className="font-semibold">{t("manager:generator.importTitle")}</p>
        <textarea
          rows={4}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder={t("manager:generator.importPaste")}
          className="w-full rounded-lg border-2 border-accent bg-background p-2 text-sm text-foreground"
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            className="bg-accent px-4 py-2 text-sm text-accent-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            {t("manager:generator.importFile")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            className="px-4 py-2 text-sm"
            disabled={!pasted.trim()}
            onClick={() => importText(pasted)}
          >
            {t("manager:generator.importSubmit")}
          </Button>
        </div>
        <button
          type="button"
          className="self-start text-sm text-muted-foreground underline hover:text-foreground"
          onClick={() => onAdd(questions)}
        >
          {t("manager:generator.addEnglish")}
        </button>
      </div>
    </div>
  )
}

interface Props {
  onAdd: (questions: Question[], source: QuizzSource) => void
}

const GeneratorDialog = ({ onAdd }: Props) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [questions, setQuestions] = useState<Question[] | null>(null)

  const onOpenChange = (value: boolean) => {
    setOpen(value)

    if (!value) {
      setQuestions(null)
    }
  }

  const add = (added: Question[]) => {
    onAdd(added, QUIZZ_SOURCES.OPENTDB)
    toast.success(t("manager:generator.added", { count: added.length }))
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <Button className="mt-1 mb-8 flex items-center justify-center gap-2 bg-accent text-accent-foreground">
          <Sparkles className="size-5" />
          {t("manager:generator.button")}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-xl bg-background p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">
                {questions
                  ? t("manager:generator.createdTitle")
                  : t("manager:generator.title")}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                {t("manager:generator.description")}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-sm p-1 text-muted-foreground hover:bg-accent">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          {questions ? (
            <GeneratorReady questions={questions} onAdd={add} />
          ) : (
            <GeneratorForm onGenerated={setQuestions} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default GeneratorDialog
