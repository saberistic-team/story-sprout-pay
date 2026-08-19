import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createTopUpCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { amountInCents: number; returnUrl: string; environment: "sandbox" | "live" }) => {
      if (!Number.isInteger(data.amountInCents) || data.amountInCents < 500) {
        throw new Error("Choose at least $5.00");
      }
      if (data.amountInCents > 20000) throw new Error("That's more than we can hold for now");
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    try {
      const stripe = createStripeClient(data.environment);
      const {
        data: { user },
      } = await context.supabase.auth.getUser();

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Story purse top-up" },
              unit_amount: data.amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        payment_intent_data: { description: "Story purse top-up" },
        metadata: { userId: context.userId, kind: "wallet_topup" },
        ...(user?.email && { customer_email: user.email }),
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const finalizeTopUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sessionId: string; environment: "sandbox" | "live" }) => {
    if (!/^cs_[a-zA-Z0-9_]+$/.test(data.sessionId)) throw new Error("Invalid session");
    return data;
  })
  .handler(
    async ({ data, context }): Promise<{ balance: number; credited: number } | { error: string }> => {
      const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
      try {
        const stripe = createStripeClient(data.environment);
        const session = await stripe.checkout.sessions.retrieve(data.sessionId);

        if (session.metadata?.["userId"] !== context.userId) throw new Error("Not your payment");
        if (session.payment_status === "unpaid") return { balance: 0, credited: 0 };

        const amount = (session.amount_total ?? 0) / 100;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: balance, error } = await supabaseAdmin.rpc("credit_wallet", {
          p_user_id: context.userId,
          p_amount: amount,
          p_reference: session.id,
          p_memo: "Story purse top-up",
        });
        if (error) throw error;

        return { balance: Number(balance ?? 0), credited: amount };
      } catch (error) {
        return { error: getStripeErrorMessage(error) };
      }
    },
  );
