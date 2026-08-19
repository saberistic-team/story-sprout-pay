
ALTER FUNCTION public.config_value(TEXT, NUMERIC) SECURITY INVOKER;
ALTER FUNCTION public.fork_price(NUMERIC) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.sync_vote_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_vote_count() FROM anon;
REVOKE ALL ON FUNCTION public.sync_vote_count() FROM authenticated;
