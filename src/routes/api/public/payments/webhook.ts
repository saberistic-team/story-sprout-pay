import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function creditFromSession(session: Record<string, unknown>) {
  const metadata = (session["metadata"] ?? {}) as Record<string, string | undefined>;
  if (metadata["kind"] !== "wallet_topup" || !metadata["userId"]) return;
  if (session["payment_status"] === "unpaid") return;

  const creditCents = Number(metadata["creditCents"] ?? 0);
  const amount = (creditCents > 0 ? creditCents : Number(session["amount_subtotal"] ?? 0)) / 100;
  if (amount <= 0) return;


  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("credit_wallet", {
    p_user_id: metadata["userId"],
    p_amount: amount,
    p_reference: String(session["id"]),
    p_memo: "Story purse top-up",
  });
  if (error) console.error("credit_wallet failed", error);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          if (
            event.type === "checkout.session.completed" ||
            event.type === "checkout.session.async_payment_succeeded"
          ) {
            await creditFromSession(event.data.object);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
