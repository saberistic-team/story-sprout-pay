import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, PenLine } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchMyVotes,
  fetchStory,
  formatPrice,
  pathToNode,
  sortForks,
  type SortMode,
} from "@/lib/story-data";
import { ForkCard } from "@/components/ForkCard";
import { ContributeDialog } from "@/components/ContributeDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SORTS: { value: SortMode; label: string }[] = [
  { value: "top", label: "Most loved" },
  { value: "trending", label: "Rising" },
  { value: "new", label: "Newest" },
];

export function StoryReader({ nodeId }: { nodeId?: string }) {
  const { user } = useAuth();
  const [sort, setSort] = useState<SortMode>("top");
  const [writing, setWriting] = useState(false);

  const story = useQuery({ queryKey: ["story"], queryFn: fetchStory });
  const votes = useQuery({
    queryKey: ["votes", user?.id],
    queryFn: () => fetchMyVotes(user?.id ?? null),
    enabled: Boolean(user),
  });

  const votedSet = useMemo(() => new Set(votes.data ?? []), [votes.data]);

  const view = useMemo(() => {
    if (!story.data) return null;
    const focusId = nodeId ?? story.data.story.root_node_id;
    if (!focusId || !story.data.byId[focusId]) return null;
    const path = pathToNode(story.data, focusId);
    const forks = sortForks(story.data.childrenOf[focusId] ?? [], sort);
    return { focus: story.data.byId[focusId], path, forks };
  }, [story.data, nodeId, sort]);

  if (story.isLoading) {
    return (
      <div className="space-y-4 py-10">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-5/6" />
      </div>
    );
  }

  if (story.isError || !view) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        The story could not be opened right now.
      </p>
    );
  }

  const { focus, path, forks } = view;
  const parentId = focus.parent_node_id;

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between gap-2 py-4 text-xs text-muted-foreground">
        {parentId ? (
          <Link
            to="/story/$nodeId"
            params={{ nodeId: parentId }}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            Back one sentence
          </Link>
        ) : (
          <span>The beginning</span>
        )}
        <span>
          {path.length} {path.length === 1 ? "sentence" : "sentences"} on this path
        </span>
      </div>

      <h1 className="font-display text-2xl leading-tight font-semibold text-balance sm:text-3xl">
        {story.data?.story.title}
      </h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        {parentId
          ? `Branch by ${focus.author_name} · ${path.length} sentences so far`
          : "The opening of the story"}
      </p>

      <article className="story-prose">
        {path.map((node, index) => (
          <span key={node.id} className="group">
            {index > 0 && " "}
            <span
              title={`${node.author_name}${node.upvote_count ? ` · ${node.upvote_count} applause` : ""}`}
              className={cn(index === path.length - 1 && "bg-gilt-soft/30")}
            >
              {node.content}
            </span>
          </span>
        ))}
      </article>


      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">
            {forks.length > 0 ? "The story forks here" : "No one has written what happens next"}
          </h2>
          {forks.length > 1 && (
            <div className="flex gap-1 rounded-full border border-border p-0.5">
              {SORTS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSort(option.value)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs transition-colors",
                    sort === option.value
                      ? "bg-secondary font-medium text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {forks.map((fork) => (
            <ForkCard key={fork.id} node={fork} voted={votedSet.has(fork.id)} />
          ))}
          {forks.length === 0 && (
            <p className="text-sm text-muted-foreground">
              This ending is wide open. Whoever writes next owns the branch that grows from it.
            </p>
          )}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1 text-xs text-muted-foreground">
            <span className="block truncate">Add the next sentence here</span>
            <span className="text-foreground">
              {formatPrice(focus.current_fork_price)} · {forks.length}{" "}
              {forks.length === 1 ? "continuation" : "continuations"} · {focus.descendant_count}{" "}
              {focus.descendant_count === 1 ? "sentence" : "sentences"} downstream

            </span>
          </div>
          <Button onClick={() => setWriting(true)}>
            <PenLine className="h-4 w-4" aria-hidden />
            Continue the story
          </Button>
        </div>
      </div>

      <ContributeDialog parentNodeId={focus.id} open={writing} onOpenChange={setWriting} />
    </div>
  );
}
