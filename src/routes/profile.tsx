import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatEarnings, formatPrice } from "@/lib/story-data";
import { StoryHeader } from "@/components/StoryHeader";
import { TopUpDialog } from "@/components/TopUpDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My writing — Once upon a time" },
      {
        name: "description",
        content: "Your sentences, your purse, and the royalties your branches have earned.",
      },
      { property: "og:title", content: "My writing — Once upon a time" },
      {
        property: "og:description",
        content: "Your sentences, your purse and your royalties.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [topUpOpen, setTopUpOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const [{ data: row }, { data: wallet }, { data: nodes }, { data: ledger }] =
        await Promise.all([
          supabase.from("profiles").select("display_name").eq("id", user!.id).maybeSingle(),
          supabase.from("wallets").select("balance").eq("user_id", user!.id).maybeSingle(),
          supabase
            .from("story_nodes")
            .select("id, content, upvote_count, descendant_count, current_fork_price, created_at")
            .eq("author_id", user!.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("earnings_ledger")
            .select("amount, memo, created_at, status")
            .eq("user_id", user!.id)
            .order("created_at", { ascending: false })
            .limit(25),
        ]);

      const earnings = (ledger ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
      return {
        displayName: (row?.display_name as string | undefined) ?? "Anonymous",
        balance: Number(wallet?.balance ?? 0),
        nodes: nodes ?? [],
        ledger: ledger ?? [],
        earnings,
      };
    },
  });

  useEffect(() => {
    if (profile.data) setDisplayName(profile.data.displayName);
  }, [profile.data]);

  const saveName = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: displayName || "Anonymous" });
    if (error) toast.error("Couldn't save your pen name");
    else toast.success("Pen name saved");
  };

  return (
    <div className="min-h-screen bg-background">
      <StoryHeader />
      <main className="mx-auto max-w-3xl space-y-10 px-4 py-8">
        <section>
          <h1 className="font-display text-3xl font-semibold">My writing</h1>
          {profile.isLoading ? (
            <Skeleton className="mt-4 h-24 w-full" />
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Story purse" value={formatPrice(profile.data?.balance ?? 0)} />
              <Stat label="Royalties earned" value={formatEarnings(profile.data?.earnings ?? 0)} />
              <Stat label="Sentences written" value={String(profile.data?.nodes.length ?? 0)} />
            </div>
          )}
          <Button className="mt-4" variant="outline" onClick={() => setTopUpOpen(true)}>
            Fill purse
          </Button>
        </section>

        <section className="space-y-2">
          <Label htmlFor="penname">Pen name</Label>
          <div className="flex gap-2">
            <Input
              id="penname"
              value={displayName}
              maxLength={40}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <Button variant="secondary" onClick={() => void saveName()}>
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Shown on sentences you write from now on.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Your sentences</h2>
          <div className="mt-3 space-y-3">
            {(profile.data?.nodes ?? []).map((node) => (
              <Link
                key={node.id as string}
                to="/story/$nodeId"
                params={{ nodeId: node.id as string }}
                className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-gilt/60"
              >
                <p className="font-display text-lg leading-snug">{node.content as string}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {node.upvote_count as number} applause · {node.descendant_count as number}{" "}
                  branches · now {formatPrice(node.current_fork_price as number)} to continue
                </p>
              </Link>
            ))}
            {profile.data && profile.data.nodes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                You haven&apos;t written anything yet.{" "}
                <Link to="/story" className="underline">
                  Find a branch you like.
                </Link>
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Royalty ledger</h2>
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
            {(profile.data?.ledger ?? []).map((entry, index) => (
              <li key={index} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">{(entry.memo as string) ?? "Royalty"}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.created_at as string).toLocaleDateString()} ·{" "}
                    {entry.status as string}
                  </span>
                </span>
                <span className="font-medium">{formatEarnings(entry.amount as number)}</span>
              </li>
            ))}
            {profile.data && profile.data.ledger.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                Royalties appear here when someone builds on your sentence.
              </li>
            )}
          </ul>
        </section>
      </main>

      <TopUpDialog open={topUpOpen} onOpenChange={setTopUpOpen} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
