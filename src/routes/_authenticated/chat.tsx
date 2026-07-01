import { createFileRoute } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  ssr: false,
  component: ChatPage,
});

function ChatPage() {
  return (
    <div className="min-h-screen bg-navy pb-28 flex flex-col">
      <header className="pt-12 px-5 pb-4">
        <h1 className="text-3xl font-display font-extrabold italic uppercase text-white">Chat</h1>
      </header>

      <div className="flex-1 grid place-items-center px-6">
        <div className="text-center max-w-xs">
          <div className="size-20 rounded-full bg-cyan/10 grid place-items-center mx-auto mb-4">
            <MessageCircle className="size-9 text-cyan" strokeWidth={2} />
          </div>
          <h2 className="font-display font-extrabold italic uppercase text-xl text-white">
            Em breve
          </h2>
          <p className="text-sm text-white/60 mt-2">
            Chat entre organizadores e participantes chega nas próximas versões.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
