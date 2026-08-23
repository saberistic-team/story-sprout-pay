import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, GitBranch, Sparkles, ArrowBigUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice, type StoryNode } from "@/lib/story-data";
import { cn } from "@/lib/utils";

export function ForkCard({ node, voted }: { node: StoryNode; voted: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const vote = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("sign-in-required");
      if (voted) {
        const { error } = await supabase
          .from("votes")
          .delete()
          .eq("node_id", node.id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("votes")
          .insert({ node_id: node.id, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["story"] });
      void queryClient.invalidateQueries({ queryKey: ["votes"] });
    },
    onError: (error: Error) => {
      if (error.message === "sign-in-required") {
        toast("Sign in to applaud a sentence", {
          action: { label: "Sign in", onClick: () => void navigate({ to: "/auth" }) },
        });
        return;
      }
      toast.error("That vote didn't stick. Try again.");
    },
  });

  return (
    <article className="group relative rounded-xl border border-border bg-card p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-colors hover:border-gilt/60">
      <Link
        to="/story/$nodeId"
        params={{ nodeId: node.id }}
        className="block focus-visible:outline-none"
      >
        <p className="font-display text-lg leading-snug text-foreground">{node.content}</p>
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => vote.mutate()}
          disabled={vote.isPending}
          aria-pressed={voted}
          aria-label={voted ? "Remove your applause" : "Applaud this sentence"}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-1 font-medium transition-colors",
            voted
              ? "border-gilt bg-gilt/15 text-foreground"
              : "border-border hover:border-gilt/60 hover:text-foreground",
          )}
        >
          <ArrowBigUp className="h-3.5 w-3.5" aria-hidden />
          {node.upvote_count}
        </button>

        <span className="inline-flex items-center gap-1">
          <GitBranch className="h-3.5 w-3.5" aria-hidden />
          {node.descendant_count} {node.descendant_count === 1 ? "sentence" : "sentences"} below
        </span>

        {(node.ai_generated || node.ai_polished) && (
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {node.ai_generated ? "AI written" : "AI polished"}
          </span>
        )}

        <span className="ml-auto inline-flex items-center gap-2">
          <span className="italic">{node.author_name}</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
            {formatPrice(node.current_fork_price)} to continue
          </span>
        </span>
      </div>

      <Link
        to="/story/$nodeId"
        params={{ nodeId: node.id }}
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-foreground/80 transition-colors hover:text-foreground"
      >
        Follow this path
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </article>
  );
}
