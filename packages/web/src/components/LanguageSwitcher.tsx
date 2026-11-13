import { Globe } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@razzia/web/components/Select"

const LANGUAGES = [
  { code: "en", label: "common:language.en" },
  { code: "nl", label: "common:language.nl" },
]

const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation()
  const normalizedLanguage = i18n.resolvedLanguage ?? "en"

  return (
    <Select
      value={normalizedLanguage}
      onValueChange={(lang) => i18n.changeLanguage(lang)}
    >
      <SelectTrigger
        aria-label={t("common:changeLanguage")}
        hideChevron
        className="w-auto gap-1.5 border px-2 py-1.5 text-accent-foreground"
      >
        <Globe className="size-4 text-muted-foreground" />
        <SelectValue>{normalizedLanguage.toUpperCase()}</SelectValue>
      </SelectTrigger>
      <SelectContent className="w-auto min-w-32">
        {LANGUAGES.map((l) => (
          <SelectItem key={l.code} value={l.code}>
            {t(l.label)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default LanguageSwitcher
