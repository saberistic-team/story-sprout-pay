
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets_read_own" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  kind TEXT NOT NULL,
  reference TEXT UNIQUE,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_tx_read_own" ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.credit_wallet(p_user_id UUID, p_amount NUMERIC, p_reference TEXT, p_memo TEXT)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  IF EXISTS (SELECT 1 FROM public.wallet_transactions WHERE reference = p_reference) THEN
    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id;
    RETURN COALESCE(v_balance, 0);
  END IF;

  INSERT INTO public.wallets (user_id, balance) VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET balance = public.wallets.balance + p_amount, updated_at = now()
  RETURNING balance INTO v_balance;

  INSERT INTO public.wallet_transactions (user_id, amount, kind, reference, memo)
  VALUES (p_user_id, p_amount, 'topup', p_reference, p_memo);

  RETURN v_balance;
END;
$$;
REVOKE ALL ON FUNCTION public.credit_wallet(UUID, NUMERIC, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_wallet(UUID, NUMERIC, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.credit_wallet(UUID, NUMERIC, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet(UUID, NUMERIC, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.publish_contribution(
  p_user_id UUID,
  p_parent_node_id UUID,
  p_content TEXT,
  p_ai_generated BOOLEAN,
  p_ai_polished BOOLEAN,
  p_idempotency_key TEXT,
  p_payment_provider_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing UUID;
  v_parent public.story_nodes%ROWTYPE;
  v_price NUMERIC(12,2);
  v_node_id UUID;
  v_contribution_id UUID;
  v_pool NUMERIC;
  v_lambda NUMERIC;
  v_max INT;
  v_author_name TEXT;
  v_balance NUMERIC;
  v_total_weight NUMERIC := 0;
  r RECORD;
BEGIN
  SELECT node_id INTO v_existing FROM public.contributions WHERE idempotency_key = p_idempotency_key;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  SELECT * INTO v_parent FROM public.story_nodes WHERE id = p_parent_node_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Parent node not found'; END IF;

  v_price := public.fork_price(v_parent.descendant_count::NUMERIC);

  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_price THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  UPDATE public.wallets SET balance = balance - v_price, updated_at = now() WHERE user_id = p_user_id;
  INSERT INTO public.wallet_transactions (user_id, amount, kind, reference, memo)
  VALUES (p_user_id, -v_price, 'contribution', p_idempotency_key, 'Added a sentence to the story');

  v_lambda := public.config_value('royalty_lambda', 0.5);
  v_max := public.config_value('royalty_max_ancestors', 5)::INT;
  v_pool := ROUND(v_price * public.config_value('royalty_pool_pct', 0.30), 4);

  SELECT COALESCE(display_name, 'Anonymous') INTO v_author_name FROM public.profiles WHERE id = p_user_id;
  IF v_author_name IS NULL THEN v_author_name := 'Anonymous'; END IF;

  INSERT INTO public.story_nodes (
    story_id, parent_node_id, author_id, author_name, content,
    ai_generated, ai_polished, original_price_paid, current_fork_price, depth
  ) VALUES (
    v_parent.story_id, v_parent.id, p_user_id, v_author_name, p_content,
    p_ai_generated, p_ai_polished, v_price, public.fork_price(0::NUMERIC), v_parent.depth + 1
  ) RETURNING id INTO v_node_id;

  INSERT INTO public.contributions (node_id, parent_node_id, user_id, amount, payment_provider_id, idempotency_key, status)
  VALUES (v_node_id, v_parent.id, p_user_id, v_price, p_payment_provider_id, p_idempotency_key, 'succeeded')
  RETURNING id INTO v_contribution_id;

  CREATE TEMP TABLE IF NOT EXISTS _anc (
    node_id UUID, recipient UUID, distance INT,
    aw NUMERIC, pw NUMERIC, ew NUMERIC, rw NUMERIC
  ) ON COMMIT DROP;
  DELETE FROM _anc;

  INSERT INTO _anc
  WITH RECURSIVE chain AS (
    SELECT n.id, n.parent_node_id, n.author_id, n.upvote_count, n.downstream_revenue, 1 AS distance
    FROM public.story_nodes n WHERE n.id = v_parent.id
    UNION ALL
    SELECT p.id, p.parent_node_id, p.author_id, p.upvote_count, p.downstream_revenue, c.distance + 1
    FROM public.story_nodes p JOIN chain c ON p.id = c.parent_node_id
    WHERE c.distance < v_max
  )
  SELECT id, author_id, distance,
    EXP(-v_lambda * distance),
    1::NUMERIC + LN(1::NUMERIC + upvote_count::NUMERIC),
    1::NUMERIC + LN(1::NUMERIC + downstream_revenue),
    EXP(-v_lambda * distance)
      * (1::NUMERIC + LN(1::NUMERIC + upvote_count::NUMERIC))
      * (1::NUMERIC + LN(1::NUMERIC + downstream_revenue))
  FROM chain
  WHERE distance <= v_max AND author_id IS NOT NULL AND author_id <> p_user_id;

  SELECT COALESCE(SUM(rw), 0) INTO v_total_weight FROM _anc;

  IF v_total_weight > 0 AND v_pool > 0 THEN
    FOR r IN SELECT * FROM _anc LOOP
      INSERT INTO public.royalty_distributions (
        contribution_id, source_node_id, ancestor_node_id, recipient_user_id,
        ancestry_distance, ancestry_weight, popularity_weight, economic_weight, raw_weight, payout_amount
      ) VALUES (
        v_contribution_id, v_node_id, r.node_id, r.recipient,
        r.distance, r.aw, r.pw, r.ew, r.rw, ROUND(v_pool * r.rw / v_total_weight, 4)
      );

      INSERT INTO public.earnings_ledger (user_id, entry_type, amount, status, contribution_id, node_id, memo)
      VALUES (r.recipient, 'royalty', ROUND(v_pool * r.rw / v_total_weight, 4), 'pending', v_contribution_id, r.node_id,
        'Someone built on your sentence');
    END LOOP;
  END IF;

  INSERT INTO public.earnings_ledger (user_id, entry_type, amount, status, contribution_id, node_id, memo)
  VALUES
    (NULL, 'platform', ROUND(v_price * public.config_value('platform_pct', 0.50), 4), 'settled', v_contribution_id, v_node_id, 'Platform share'),
    (NULL, 'treasury', ROUND(v_price * public.config_value('treasury_pct', 0.20), 4), 'settled', v_contribution_id, v_node_id, 'Story treasury share');

  IF v_total_weight = 0 AND v_pool > 0 THEN
    INSERT INTO public.earnings_ledger (user_id, entry_type, amount, status, contribution_id, node_id, memo)
    VALUES (NULL, 'treasury', v_pool, 'settled', v_contribution_id, v_node_id, 'Unclaimed royalty pool');
  END IF;

  WITH RECURSIVE chain AS (
    SELECT n.id, n.parent_node_id FROM public.story_nodes n WHERE n.id = v_parent.id
    UNION ALL
    SELECT p.id, p.parent_node_id FROM public.story_nodes p JOIN chain c ON p.id = c.parent_node_id
  )
  UPDATE public.story_nodes n
  SET descendant_count = n.descendant_count + 1,
      downstream_revenue = n.downstream_revenue + v_price,
      current_fork_price = public.fork_price((n.descendant_count + 1)::NUMERIC)
  FROM chain WHERE n.id = chain.id;

  RETURN v_node_id;
END;
$$;
