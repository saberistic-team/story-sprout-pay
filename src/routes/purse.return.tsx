import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { finalizeTopUp } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { formatPrice } from "@/lib/story-data";
import { StoryHeader } from "@/components/StoryHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/purse/return")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { session_id: string | undefined } => ({
    session_id: typeof search["session_id"] === "string" ? search["session_id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Purse topped up — Once upon a time" },
      { name: "description", content: "Your story purse has been topped up." },
      { property: "og:title", content: "Purse topped up — Once upon a time" },
      { property: "og:description", content: "Your story purse has been topped up." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PurseReturn,
});

function PurseReturn() {
  const { session_id: sessionId } = Route.useSearch();
  const [state, setState] = useState<
    { status: "loading" } | { status: "done"; balance: number } | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    if (!sessionId) {
      setState({ status: "error", message: "No payment to confirm." });
      return;
    }
    void finalizeTopUp({ data: { sessionId, environment: getStripeEnvironment() } })
      .then((result) => {
        if ("error" in result) setState({ status: "error", message: result.error });
        else setState({ status: "done", balance: result.balance });
      })
      .catch(() => setState({ status: "error", message: "We couldn't confirm that payment." }));
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background">
      <StoryHeader />
      <main className="mx-auto max-w-sm px-4 py-16 text-center">
        {state.status === "loading" && (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Counting your coins…
          </p>
        )}
        {state.status === "done" && (
          <>
            <h1 className="font-display text-3xl font-semibold">Your purse is full</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Balance: {formatPrice(state.balance)}
            </p>
            <Button asChild className="mt-6">
              <Link to="/story">Back to the story</Link>
            </Button>
          </>
        )}
        {state.status === "error" && (
          <>
            <h1 className="font-display text-2xl font-semibold">We couldn&apos;t confirm that</h1>
            <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/story">Back to the story</Link>
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
