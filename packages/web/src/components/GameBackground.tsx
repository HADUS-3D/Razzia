import { useQuery } from "@tanstack/react-query"
import defaultBackground from "@razzia/web/assets/background.png"
import { getBranding, imageFallback } from "@razzia/web/branding"
import { settingsQuery } from "@razzia/web/features/manager/queries"

interface Props {
  /** Most specific background (question or quizz); wins over the app default. */
  background?: string
}

const GameBackground = ({ background }: Props) => {
  const { data: settings, isPending } = useQuery(settingsQuery())
  const fallback = getBranding()?.background ?? defaultBackground
  const src = background ?? settings?.background ?? fallback

  // Wait for the app setting so the stock image does not flash first.
  if (!background && isPending) {
    return <div className="fixed top-0 left-0 h-full w-full bg-secondary" />
  }

  return (
    <div className="fixed top-0 left-0 h-full w-full bg-secondary">
      <img
        key={src}
        className="pointer-events-none h-full w-full object-cover select-none"
        src={src}
        onError={imageFallback(fallback)}
        alt=""
      />
    </div>
  )
}

export default GameBackground
