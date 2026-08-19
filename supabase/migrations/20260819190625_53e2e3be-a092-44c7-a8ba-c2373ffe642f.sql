
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Anonymous',
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.platform_config (
  key TEXT PRIMARY KEY,
  value NUMERIC NOT NULL,
  description TEXT
);
GRANT SELECT ON public.platform_config TO anon, authenticated;
GRANT ALL ON public.platform_config TO service_role;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_public_read" ON public.platform_config FOR SELECT USING (true);

INSERT INTO public.platform_config (key, value, description) VALUES
  ('base_price', 0.10, 'Starting price to add a sentence'),
  ('price_exponent', 1.5, 'Steepness of the pricing curve'),
  ('royalty_pool_pct', 0.30, 'Share of each payment given to earlier authors'),
  ('platform_pct', 0.50, 'Share of each payment kept by the platform'),
  ('treasury_pct', 0.20, 'Share of each payment kept for the story treasury'),
  ('royalty_lambda', 0.5, 'Ancestry decay constant'),
  ('royalty_max_ancestors', 5, 'How many ancestors are eligible for royalties');

CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  root_node_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stories TO anon, authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stories_public_read" ON public.stories FOR SELECT USING (true);

CREATE TABLE public.story_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  parent_node_id UUID REFERENCES public.story_nodes(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  content TEXT NOT NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  ai_polished BOOLEAN NOT NULL DEFAULT false,
  original_price_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_fork_price NUMERIC(12,2) NOT NULL DEFAULT 0.10,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  descendant_count INTEGER NOT NULL DEFAULT 0,
  downstream_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
  depth INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX story_nodes_parent_idx ON public.story_nodes(parent_node_id);
CREATE INDEX story_nodes_author_idx ON public.story_nodes(author_id);
GRANT SELECT ON public.story_nodes TO anon, authenticated;
GRANT ALL ON public.story_nodes TO service_role;
ALTER TABLE public.story_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nodes_public_read" ON public.story_nodes FOR SELECT USING (true);

ALTER TABLE public.stories ADD CONSTRAINT stories_root_fk FOREIGN KEY (root_node_id) REFERENCES public.story_nodes(id) ON DELETE SET NULL;

CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES public.story_nodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (node_id, user_id)
);
GRANT SELECT ON public.votes TO anon;
GRANT SELECT, INSERT, DELETE ON public.votes TO authenticated;
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes_public_read" ON public.votes FOR SELECT USING (true);
CREATE POLICY "votes_insert_own" ON public.votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_delete_own" ON public.votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_vote_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.story_nodes SET upvote_count = upvote_count + 1 WHERE id = NEW.node_id;
    RETURN NEW;
  ELSE
    UPDATE public.story_nodes SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = OLD.node_id;
    RETURN OLD;
  END IF;
END;
$$;
CREATE TRIGGER votes_sync AFTER INSERT OR DELETE ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.sync_vote_count();

CREATE TABLE public.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES public.story_nodes(id) ON DELETE SET NULL,
  parent_node_id UUID REFERENCES public.story_nodes(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  payment_provider_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contributions TO authenticated;
GRANT ALL ON public.contributions TO service_role;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contributions_read_own" ON public.contributions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.royalty_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.story_nodes(id) ON DELETE CASCADE,
  ancestor_node_id UUID NOT NULL REFERENCES public.story_nodes(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  ancestry_distance INTEGER NOT NULL,
  ancestry_weight NUMERIC(14,6) NOT NULL,
  popularity_weight NUMERIC(14,6) NOT NULL,
  economic_weight NUMERIC(14,6) NOT NULL,
  raw_weight NUMERIC(14,6) NOT NULL,
  payout_amount NUMERIC(12,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.royalty_distributions TO authenticated;
GRANT ALL ON public.royalty_distributions TO service_role;
ALTER TABLE public.royalty_distributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "royalties_read_own" ON public.royalty_distributions FOR SELECT TO authenticated USING (auth.uid() = recipient_user_id);

CREATE TABLE public.earnings_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  entry_type TEXT NOT NULL,
  amount NUMERIC(12,4) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  contribution_id UUID REFERENCES public.contributions(id) ON DELETE SET NULL,
  node_id UUID REFERENCES public.story_nodes(id) ON DELETE SET NULL,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.earnings_ledger TO authenticated;
GRANT ALL ON public.earnings_ledger TO service_role;
ALTER TABLE public.earnings_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger_read_own" ON public.earnings_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.config_value(p_key TEXT, p_default NUMERIC)
RETURNS NUMERIC LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT value FROM public.platform_config WHERE key = p_key), p_default);
$$;

CREATE OR REPLACE FUNCTION public.fork_price(p_subtree_size NUMERIC)
RETURNS NUMERIC LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ROUND(
    (public.config_value('base_price', 0.10)
      * POWER(
          1::NUMERIC + (LN(1::NUMERIC + GREATEST(p_subtree_size, 0::NUMERIC)) / LN(2::NUMERIC)),
          public.config_value('price_exponent', 1.5)
        )
    )::NUMERIC,
  2);
$$;

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

REVOKE ALL ON FUNCTION public.publish_contribution(UUID, UUID, TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_contribution(UUID, UUID, TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.publish_contribution(UUID, UUID, TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.publish_contribution(UUID, UUID, TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT) TO service_role;

DO $$
DECLARE
  v_story UUID;
  v_root UUID;
  v_a UUID; v_b UUID; v_c UUID; v_a1 UUID; v_a2 UUID; v_b1 UUID;
BEGIN
  INSERT INTO public.stories (title) VALUES ('Once upon a time…') RETURNING id INTO v_story;

  INSERT INTO public.story_nodes (story_id, content, author_name, depth, current_fork_price)
  VALUES (v_story, 'Once upon a time…', 'The Storykeeper', 0, 0.10) RETURNING id INTO v_root;
  UPDATE public.stories SET root_node_id = v_root WHERE id = v_story;

  INSERT INTO public.story_nodes (story_id, parent_node_id, content, author_name, depth, upvote_count)
  VALUES (v_story, v_root, 'a lamplighter named Wren climbed the last hill of the city and found the lamp already lit.', 'Wren''s Keeper', 1, 12) RETURNING id INTO v_a;
  INSERT INTO public.story_nodes (story_id, parent_node_id, content, author_name, depth, upvote_count)
  VALUES (v_story, v_root, 'the sea forgot how to be salty, and every sailor woke up tasting rain.', 'Marisol', 1, 7) RETURNING id INTO v_b;
  INSERT INTO public.story_nodes (story_id, parent_node_id, content, author_name, depth, upvote_count)
  VALUES (v_story, v_root, 'a library grew out of a crack in the pavement, one shelf at a time.', 'Pen & Thistle', 1, 4) RETURNING id INTO v_c;

  INSERT INTO public.story_nodes (story_id, parent_node_id, content, author_name, depth, upvote_count)
  VALUES (v_story, v_a, 'Someone had beaten her there, and the flame burned a colour she had no name for.', 'Wren''s Keeper', 2, 9) RETURNING id INTO v_a1;
  INSERT INTO public.story_nodes (story_id, parent_node_id, content, author_name, depth, upvote_count)
  VALUES (v_story, v_a, 'She sat down beside it anyway, because the city below had already begun to dim.', 'Ines', 2, 5) RETURNING id INTO v_a2;
  INSERT INTO public.story_nodes (story_id, parent_node_id, content, author_name, depth, upvote_count)
  VALUES (v_story, v_b, 'The harbour bells rang all night, and nobody could agree on who was ringing them.', 'Marisol', 2, 3) RETURNING id INTO v_b1;

  INSERT INTO public.story_nodes (story_id, parent_node_id, content, author_name, depth, upvote_count)
  VALUES (v_story, v_a1, 'In its light she could see, faintly, the shape of a door standing in open air.', 'Ines', 3, 6);

  WITH RECURSIVE tree AS (
    SELECT id AS root_id, id AS node_id FROM public.story_nodes WHERE story_id = v_story
    UNION ALL
    SELECT t.root_id, c.id FROM public.story_nodes c JOIN tree t ON c.parent_node_id = t.node_id
  ), counts AS (
    SELECT root_id, COUNT(*) - 1 AS descendants FROM tree GROUP BY root_id
  )
  UPDATE public.story_nodes n
  SET descendant_count = counts.descendants,
      current_fork_price = public.fork_price(counts.descendants::NUMERIC)
  FROM counts WHERE n.id = counts.root_id;
END $$;
