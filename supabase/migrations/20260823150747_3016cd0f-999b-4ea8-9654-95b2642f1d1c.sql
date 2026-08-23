
-- platform_config: no anon read
DROP POLICY IF EXISTS config_public_read ON public.platform_config;
CREATE POLICY config_authenticated_read ON public.platform_config
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.platform_config FROM anon;

-- profiles: own-only read
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;
CREATE POLICY profiles_read_own ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
REVOKE SELECT ON public.profiles FROM anon;

-- votes: own-only read
DROP POLICY IF EXISTS votes_public_read ON public.votes;
CREATE POLICY votes_read_own ON public.votes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE SELECT ON public.votes FROM anon;
