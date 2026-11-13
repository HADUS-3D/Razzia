import { createFileRoute, Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import Reconnect from "@razzia/web/features/game/components/join/Reconnect"
import Room from "@razzia/web/features/game/components/join/Room"
import Username from "@razzia/web/features/game/components/join/Username"
import { usePlayerStore } from "@razzia/web/features/game/stores/player"

const PlayerAuthPage = () => {
  const { inviteCode } = usePlayerStore()
  const { t } = useTranslation()

  if (inviteCode) {
    return <Username />
  }

  return (
    <>
      <Room />
      <Reconnect />
      <Link
        to="/manager"
        className="z-10 mt-4 rounded-lg bg-background/80 px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-background"
      >
        {t("manager:login.link")}
      </Link>
    </>
  )
}

export const Route = createFileRoute("/(auth)/")({
  component: PlayerAuthPage,
})
