INSERT INTO public.platform_config (key, value)
VALUES ('ai_assist_price', 0.05)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.charge_ai_assist(p_user_id UUID, p_reference TEXT, p_memo TEXT)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_price NUMERIC;
  v_balance NUMERIC;
BEGIN
  v_price := public.config_value('ai_assist_price', 0.05);

  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_price THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  UPDATE public.wallets SET balance = balance - v_price, updated_at = now() WHERE user_id = p_user_id
  RETURNING balance INTO v_balance;

  INSERT INTO public.wallet_transactions (user_id, amount, kind, reference, memo)
  VALUES (p_user_id, -v_price, 'ai_assist', p_reference, p_memo);

  INSERT INTO public.earnings_ledger (user_id, entry_type, amount, status, memo)
  VALUES (NULL, 'platform', v_price, 'settled', 'AI assist fee');

  RETURN v_balance;
END;
$$;
REVOKE ALL ON FUNCTION public.charge_ai_assist(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.charge_ai_assist(UUID, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.charge_ai_assist(UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.charge_ai_assist(UUID, TEXT, TEXT) TO service_role;