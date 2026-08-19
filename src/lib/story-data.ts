import { supabase } from "@/integrations/supabase/client";

export type StoryNode = {
  id: string;
  story_id: string;
  parent_node_id: string | null;
  author_id: string | null;
  author_name: string;
  content: string;
  ai_generated: boolean;
  ai_polished: boolean;
  original_price_paid: number;
  current_fork_price: number;
  upvote_count: number;
  descendant_count: number;
  downstream_revenue: number;
  depth: number;
  created_at: string;
};

export type Story = {
  id: string;
  title: string;
  root_node_id: string | null;
};

export type StoryData = {
  story: Story;
  nodes: StoryNode[];
  byId: Record<string, StoryNode>;
  childrenOf: Record<string, StoryNode[]>;
};

export type SortMode = "top" | "new" | "trending";

export async function fetchStory(): Promise<StoryData> {
  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, title, root_node_id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (storyError) throw storyError;
  if (!story) throw new Error("No story found");

  const { data: nodes, error: nodesError } = await supabase
    .from("story_nodes")
    .select("*")
    .eq("story_id", story.id)
    .order("created_at", { ascending: true });

  if (nodesError) throw nodesError;

  const list = (nodes ?? []) as unknown as StoryNode[];
  const byId: Record<string, StoryNode> = {};
  const childrenOf: Record<string, StoryNode[]> = {};

  for (const node of list) {
    byId[node.id] = node;
    if (node.parent_node_id) {
      (childrenOf[node.parent_node_id] ??= []).push(node);
    }
  }

  return { story: story as Story, nodes: list, byId, childrenOf };
}

export async function fetchMyVotes(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const { data, error } = await supabase.from("votes").select("node_id").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.node_id as string);
}

export function pathToNode(data: StoryData, nodeId: string): StoryNode[] {
  const path: StoryNode[] = [];
  let current: StoryNode | undefined = data.byId[nodeId];
  let guard = 0;
  while (current && guard++ < 500) {
    path.unshift(current);
    current = current.parent_node_id ? data.byId[current.parent_node_id] : undefined;
  }
  return path;
}

export function sortForks(forks: StoryNode[], mode: SortMode): StoryNode[] {
  const copy = [...forks];
  if (mode === "new") {
    return copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  if (mode === "trending") {
    return copy.sort((a, b) => trendScore(b) - trendScore(a));
  }
  return copy.sort(
    (a, b) => b.upvote_count - a.upvote_count || b.descendant_count - a.descendant_count,
  );
}

function trendScore(node: StoryNode): number {
  const ageHours = Math.max(1, (Date.now() - new Date(node.created_at).getTime()) / 3_600_000);
  return (node.upvote_count + node.descendant_count * 2 + 1) / Math.pow(ageHours + 2, 0.6);
}

export function formatPrice(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value;
  return `$${amount.toFixed(2)}`;
}

export function formatEarnings(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value;
  if (amount > 0 && amount < 0.01) return "<$0.01";
  return `$${amount.toFixed(2)}`;
}
