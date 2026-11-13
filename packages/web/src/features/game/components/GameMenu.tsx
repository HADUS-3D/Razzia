import { Flag, Settings } from "lucide-react"
import { DropdownMenu } from "radix-ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { EVENTS } from "@razzia/common/constants"
import AlertDialog from "@razzia/web/components/AlertDialog"
import Tooltip from "@razzia/web/components/Tooltip"
import { useSocket } from "@razzia/web/features/game/contexts/socket-context"
import { useManagerStore } from "@razzia/web/features/game/stores/manager"

/** Settings menu of a running game, for now only to end the quiz early. */
const GameMenu = () => {
  const { gameId } = useManagerStore()
  const { socket } = useSocket()
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)

  const handleEnd = () => {
    if (gameId) {
      socket.emit(EVENTS.MANAGER.END_GAME, { gameId })
    }
  }

  return (
    <>
      <DropdownMenu.Root>
        <Tooltip content={t("game:menu.title")}>
          <DropdownMenu.Trigger
            aria-label={t("game:menu.title")}
            className="flex items-center justify-center rounded-lg bg-black/40 px-2.5 text-white drop-shadow-md hover:bg-black/60"
          >
            <Settings className="size-5" />
          </DropdownMenu.Trigger>
        </Tooltip>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="top"
            align="end"
            sideOffset={8}
            className="z-50 min-w-48 rounded-lg bg-background p-1 shadow-xl"
          >
            <DropdownMenu.Item
              onSelect={() => setConfirming(true)}
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-red-500 outline-none data-[highlighted]:bg-muted"
            >
              <Flag className="size-4" />
              {t("game:menu.endQuizz")}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <AlertDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("game:menu.endTitle")}
        description={t("game:menu.endDescription")}
        confirmLabel={t("game:menu.endConfirm")}
        onConfirm={handleEnd}
      />
    </>
  )
}

export default GameMenu
