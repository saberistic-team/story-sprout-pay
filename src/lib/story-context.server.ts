import type { SupabaseClient } from "@supabase/supabase-js";

/** Walks up from a node to the root and returns the story path as prose. */
export async function buildStorySoFar(
  supabase: SupabaseClient,
  nodeId: string,
  maxDepth = 24,
): Promise<string> {
  const parts: string[] = [];
  let currentId: string | null = nodeId;
  let guard = 0;

  while (currentId && guard++ < maxDepth) {
    const { data, error } = await supabase
      .from("story_nodes")
      .select("content, parent_node_id")
      .eq("id", currentId)
      .maybeSingle();
    if (error || !data) break;
    parts.unshift(data.content as string);
    currentId = (data.parent_node_id as string | null) ?? null;
  }

  return parts.join(" ");
}
