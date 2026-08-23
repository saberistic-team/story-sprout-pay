-- 1. Financial + ledger tables: remove any client write privileges entirely.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.wallets FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.wallet_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.earnings_ledger FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.contributions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.royalty_distributions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.story_nodes FROM anon, authenticated;
REVOKE ALL ON public.platform_config FROM anon;

-- Explicit deny policies so no future permissive policy silently opens writes.
DROP POLICY IF EXISTS wallets_no_client_writes ON public.wallets;
CREATE POLICY wallets_no_client_writes ON public.wallets FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS wallet_tx_no_client_writes ON public.wallet_transactions;
CREATE POLICY wallet_tx_no_client_writes ON public.wallet_transactions FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS ledger_no_client_writes ON public.earnings_ledger;
CREATE POLICY ledger_no_client_writes ON public.earnings_ledger FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS contributions_no_client_writes ON public.contributions;
CREATE POLICY contributions_no_client_writes ON public.contributions FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS royalties_no_client_writes ON public.royalty_distributions;
CREATE POLICY royalties_no_client_writes ON public.royalty_distributions FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS nodes_no_client_writes ON public.story_nodes;
CREATE POLICY nodes_no_client_writes ON public.story_nodes FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Ensure trusted backend keeps full access.
GRANT ALL ON public.wallets, public.wallet_transactions, public.earnings_ledger,
  public.contributions, public.royalty_distributions, public.story_nodes,
  public.platform_config TO service_role;

-- 2. story_nodes: hide author_id (auth user reference) from anonymous readers.
REVOKE SELECT ON public.story_nodes FROM anon;
GRANT SELECT (id, story_id, parent_node_id, author_name, content, ai_generated,
  ai_polished, original_price_paid, current_fork_price, upvote_count,
  descendant_count, downstream_revenue, depth, created_at)
  ON public.story_nodes TO anon;
GRANT SELECT ON public.story_nodes TO authenticated;