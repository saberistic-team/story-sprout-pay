import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/lib/story-data";
import {
  composeWithAI,
  getContributionContext,
  publishContribution,
} from "@/lib/story.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { TopUpDialog } from "@/components/TopUpDialog";

function newKey() {
  return `c${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function ContributeDialog({
  parentNodeId,
  open,
  onOpenChange,
}: {
  parentNodeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [aiPolished, setAiPolished] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(newKey);
  const [topUpOpen, setTopUpOpen] = useState(false);

  useEffect(() => {
    if (open) setIdempotencyKey(newKey());
  }, [open, parentNodeId]);

  const context = useQuery({
    queryKey: ["contribution-context", parentNodeId, user?.id],
    enabled: open && Boolean(user),
    queryFn: () => getContributionContext({ data: { parentNodeId } }),
  });

  const ai = useMutation({
    mutationFn: async (mode: "polish" | "write") => {
      const result = await composeWithAI({ data: { mode, parentNodeId, roughText: text } });
      if ("error" in result) throw Object.assign(new Error(result.error), { code: result.code });
      return { mode, text: result.text };
    },
    onSuccess: ({ mode, text: next }) => {
      setText(next);
      if (mode === "polish") setAiPolished(true);
      else setAiGenerated(true);
      void context.refetch();
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === "insufficient_balance") {
        setTopUpOpen(true);
        return;
      }
      toast.error(error.message);
    },
  });

  const publish = useMutation({
    mutationFn: async () => {
      const result = await publishContribution({
        data: { parentNodeId, content: text, aiGenerated, aiPolished, idempotencyKey },
      });
      if ("error" in result) throw Object.assign(new Error(result.error), { code: result.code });
      return result.nodeId;
    },
    onSuccess: (nodeId) => {
      void queryClient.invalidateQueries();
      onOpenChange(false);
      setText("");
      setAiGenerated(false);
      setAiPolished(false);
      toast.success("Your sentence is part of the story");
      void navigate({ to: "/story/$nodeId", params: { nodeId } });
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === "insufficient_balance") {
        setTopUpOpen(true);
        return;
      }
      toast.error(error.message);
    },
  });

  const price = context.data?.price ?? 0;
  const balance = context.data?.balance ?? 0;
  const aiPrice = context.data?.aiPrice ?? 0.05;
  const canAfford = balance >= price;
  const canAffordAI = balance >= aiPrice;


  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Sign in to write</DialogTitle>
            <DialogDescription>
              Reading is free and always will be. Writing a sentence needs an account so your
              royalties can find you.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="w-full" onClick={() => void navigate({ to: "/auth" })}>
              Sign in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Write what happens next</DialogTitle>
            <DialogDescription>
              One sentence. If people build on it, you earn a share of everything downstream.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="And then, quite without warning…"
            rows={4}
            maxLength={400}
            className="font-display text-lg leading-snug"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={ai.isPending || text.trim().length < 3 || !canAffordAI}
              onClick={() => ai.mutate("polish")}
            >
              {ai.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Wand2 className="h-4 w-4" aria-hidden />
              )}
              Polish with AI · {formatPrice(aiPrice)}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={ai.isPending || !canAffordAI}
              onClick={() => ai.mutate("write")}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Write with AI · {formatPrice(aiPrice)}
            </Button>
            <span className="ml-auto self-center text-xs text-muted-foreground">
              {text.length}/400
            </span>
          </div>
          {!canAffordAI && (
            <p className="-mt-1 text-xs text-destructive">
              Fill your purse to use the AI storyteller ({formatPrice(aiPrice)} per use).
            </p>
          )}

          <dl className="rounded-lg border border-border bg-secondary/50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Cost to continue here</dt>
              <dd className="font-semibold">{formatPrice(price)}</dd>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <dt className="text-muted-foreground">AI help, each time</dt>
              <dd>{formatPrice(aiPrice)}</dd>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <dt className="text-muted-foreground">Your purse</dt>
              <dd className={canAfford ? "" : "text-destructive"}>{formatPrice(balance)}</dd>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              30% of this goes to the five writers above you, weighted by closeness, applause and
              how much their branch has grown.
            </p>
          </dl>

          <DialogFooter className="gap-2 sm:justify-between">
            {!canAfford && (
              <Button type="button" variant="outline" onClick={() => setTopUpOpen(true)}>
                Fill purse
              </Button>
            )}
            <Button
              type="button"
              className="sm:ml-auto"
              disabled={publish.isPending || text.trim().length < 3 || !canAfford}
              onClick={() => publish.mutate()}
            >
              {publish.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Publish for {formatPrice(price)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TopUpDialog open={topUpOpen} onOpenChange={setTopUpOpen} />
    </>
  );
}
