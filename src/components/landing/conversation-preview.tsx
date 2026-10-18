import { LockKeyhole, Users } from "lucide-react";

import { AvatarFigure } from "@/components/game/avatar";
import { DEFAULT_AVATAR } from "@/game/core/cosmetics";
/** Illustrative conversation, deliberately labelled. Never represents real student messages. */
export function ConversationPreview() {
  return (
    <section
      aria-label="Illustrative friend conversation"
      className="overflow-hidden rounded-3xl border bg-[#f7f1e6] text-[#13203a] shadow-xl"
    >
      <header className="flex items-center gap-3 bg-[#13203a] p-5 text-white">
        <Users className="size-6" />
        <div className="flex-1">
          <p className="font-black">Your study circle</p>
          <p className="text-xs text-white/70">Friends in IlluminatED</p>
        </div>
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
          Demo conversation
        </span>
      </header>
      <div className="flex justify-center gap-6 bg-[#e9e4f5] px-6 py-3">
        <div className="text-center">
          <AvatarFigure avatar={DEFAULT_AVATAR} size={86} />
          <p className="text-xs font-black">Alex · demo</p>
        </div>
        <div className="text-center">
          <AvatarFigure
            avatar={{
              ...DEFAULT_AVATAR,
              topColor: "topColor-2",
              hair: "hair-bob",
            }}
            size={86}
          />
          <p className="text-xs font-black">Sam · demo</p>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="mr-10 rounded-2xl rounded-tl-sm bg-white p-4">
          <p className="text-xs font-bold text-[#596480]">Alex</p>
          <p className="mt-1 text-sm">Study Quarter before the games hub?</p>
        </div>
        <div className="ml-10 rounded-2xl rounded-tr-sm bg-[#2b5fd9] p-4 text-white">
          <p className="text-xs font-bold text-white/75">Sam</p>
          <p className="mt-1 text-sm">
            Yes! Five maths questions, then a game.
          </p>
        </div>
        <div className="mr-10 rounded-2xl rounded-tl-sm bg-white p-4">
          <p className="text-xs font-bold text-[#596480]">Alex</p>
          <p className="mt-1 text-sm">
            Let’s compare how we worked out the answers.
          </p>
        </div>
      </div>
      <footer className="flex items-start gap-2 border-t p-4 text-xs leading-5 text-[#596480]">
        <LockKeyhole className="mt-0.5 size-4 shrink-0" />
        <p>
          Mutual friends · encrypted private messages · block and report
          controls. Example text, not a real conversation.
        </p>
      </footer>
    </section>
  );
}
