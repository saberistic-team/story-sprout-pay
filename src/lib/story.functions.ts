import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const composeWithAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { mode: "polish" | "write"; parentNodeId: string; roughText: string }) => {
    if (data.mode !== "polish" && data.mode !== "write") throw new Error("Unknown mode");
    if (data.mode === "polish" && data.roughText.trim().length < 3) {
      throw new Error("Write a little more first");
    }
    if (data.roughText.length > 600) throw new Error("That's a bit long for one sentence");
    return data;
  })
  .handler(
    async ({
      data,
      context,
    }): Promise<{ text: string; balance: number } | { error: string; code?: string }> => {
      const { buildStorySoFar } = await import("@/lib/story-context.server");
      const { composeSentence } = await import("@/lib/ai.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      try {
        const storySoFar = await buildStorySoFar(context.supabase, data.parentNodeId);
        const text = await composeSentence({
          mode: data.mode,
          storySoFar,
          roughText: data.roughText,
        });

        const { data: balance, error } = await supabaseAdmin.rpc("charge_ai_assist", {
          p_user_id: context.userId,
          p_reference: `ai:${crypto.randomUUID()}`,
          p_memo: data.mode === "polish" ? "Polished a sentence with AI" : "Wrote a sentence with AI",
        });

        if (error) {
          if (error.message.includes("INSUFFICIENT_BALANCE")) {
            return { error: "Your story purse is empty", code: "insufficient_balance" };
          }
          console.error("charge_ai_assist failed", error);
          return { error: "The storyteller could not be paid. Try again." };
        }

        return { text, balance: Number(balance ?? 0) };
      } catch (error) {
        return { error: error instanceof Error ? error.message : "The storyteller stumbled" };
      }
    },
  );

export const getContributionContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { parentNodeId: string }) => data)
  .handler(
    async ({ data, context }): Promise<{ price: number; balance: number; aiPrice: number }> => {
      const { data: node, error } = await context.supabase
        .from("story_nodes")
        .select("current_fork_price")
        .eq("id", data.parentNodeId)
        .maybeSingle();
      if (error || !node) throw new Error("That part of the story could not be found");

      const { data: wallet } = await context.supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", context.userId)
        .maybeSingle();

      const { data: config } = await context.supabase
        .from("platform_config")
        .select("value")
        .eq("key", "ai_assist_price")
        .maybeSingle();

      return {
        price: Number(node.current_fork_price),
        balance: Number(wallet?.balance ?? 0),
        aiPrice: Number(config?.value ?? 0.05),
      };
    },
  );


export const publishContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      parentNodeId: string;
      content: string;
      aiGenerated: boolean;
      aiPolished: boolean;
      idempotencyKey: string;
    }) => {
      const content = data.content.trim();
      if (content.length < 3) throw new Error("Write something first");
      if (content.length > 400) throw new Error("Keep it to a sentence or two");
      if (!/^[a-zA-Z0-9:_-]{8,80}$/.test(data.idempotencyKey)) throw new Error("Invalid request");
      return { ...data, content };
    },
  )
  .handler(
    async ({ data, context }): Promise<{ nodeId: string } | { error: string; code?: string }> => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      await context.supabase
        .from("profiles")
        .upsert({ id: context.userId }, { onConflict: "id", ignoreDuplicates: true });

      const { data: nodeId, error } = await supabaseAdmin.rpc("publish_contribution", {
        p_user_id: context.userId,
        p_parent_node_id: data.parentNodeId,
        p_content: data.content,
        p_ai_generated: data.aiGenerated,
        p_ai_polished: data.aiPolished,
        p_idempotency_key: data.idempotencyKey,
        p_payment_provider_id: "wallet",
      });

      if (error) {
        if (error.message.includes("INSUFFICIENT_BALANCE")) {
          return { error: "Your story purse is empty", code: "insufficient_balance" };
        }
        console.error("publish_contribution failed", error);
        return { error: "The page refused the ink. Try again." };
      }

      return { nodeId: nodeId as unknown as string };
    },
  );
