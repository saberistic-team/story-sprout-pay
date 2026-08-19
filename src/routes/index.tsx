import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Coins, GitBranch, Sparkles } from "lucide-react";
import { fetchStory, formatPrice, sortForks } from "@/lib/story-data";
import { StoryHeader } from "@/components/StoryHeader";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Once upon a time — a story everyone writes" },
      {
        name: "description",
        content:
          "A branching fairy tale written one sentence at a time. Read for free, pay cents to add a sentence, and earn royalties when others build on yours.",
      },
      { property: "og:title", content: "Once upon a time — a story everyone writes" },
      {
        property: "og:description",
        content:
          "Read free, add a sentence for cents, and earn royalties when the branch you started grows.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const story = useQuery({ queryKey: ["story"], queryFn: fetchStory });
  const rootId = story.data?.story.root_node_id ?? null;
  const root = rootId ? story.data?.byId[rootId] : undefined;
  const topForks = rootId ? sortForks(story.data?.childrenOf[rootId] ?? [], "top").slice(0, 3) : [];

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <StoryHeader />

      <main className="mx-auto max-w-3xl px-4">
        <section className="py-16 text-center sm:py-24">
          <p className="text-xs tracking-[0.25em] text-muted-foreground uppercase">
            A story with no single author
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] font-semibold text-balance sm:text-6xl">
            {root?.content ?? "Once upon a time…"}
          </h1>
          <p className="mx-auto mt-5 max-w-md text-base text-muted-foreground">
            Everyone adds one sentence. Every sentence forks the tale. The busier a branch becomes,
            the more the next sentence costs — and the more its writers earn.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/story">
                <BookOpen className="h-4 w-4" aria-hidden />
                Start reading
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Write a sentence</Link>
            </Button>
          </div>
        </section>

        {topForks.length > 0 && (
          <section className="pb-16">
            <h2 className="font-display text-xl font-semibold">Where readers went first</h2>
            <div className="mt-4 space-y-3">
              {topForks.map((fork) => (
                <Link
                  key={fork.id}
                  to="/story/$nodeId"
                  params={{ nodeId: fork.id }}
                  className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-gilt/60"
                >
                  <p className="font-display text-lg leading-snug">{fork.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {fork.author_name} · {fork.upvote_count} applause · {fork.descendant_count}{" "}
                    branches · {formatPrice(fork.current_fork_price)} to continue
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-4 pb-24 sm:grid-cols-3">
          <Feature
            icon={<GitBranch className="h-5 w-5 text-gilt" aria-hidden />}
            title="Branches, not comments"
            body="Every sentence can be continued in as many directions as people imagine."
          />
          <Feature
            icon={<Coins className="h-5 w-5 text-gilt" aria-hidden />}
            title="Prices that grow"
            body="A sentence starts at $0.10 and rises as its branch fills with writers."
          />
          <Feature
            icon={<Sparkles className="h-5 w-5 text-gilt" aria-hidden />}
            title="Royalties upstream"
            body="30% of every payment flows back to the five writers who set it up."
          />
        </section>
      </main>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {icon}
      <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
