import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Feather } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/story-data";
import { Button } from "@/components/ui/button";

export function StoryHeader() {
  const { user, signOut } = useAuth();

  const { data: balance } = useQuery({
    queryKey: ["wallet", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user!.id)
        .maybeSingle();
      return Number(data?.balance ?? 0);
    },
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <Feather className="h-4 w-4 text-gilt" aria-hidden />
          <span className="font-display text-lg leading-none font-semibold tracking-tight">
            Once upon a time
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to="/story">
              <BookOpen className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Read</span>
            </Link>
          </Button>

          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/profile">
                  <span className="hidden sm:inline">My writing</span>
                  <span className="text-xs text-muted-foreground sm:ml-1">
                    {formatPrice(balance ?? 0)}
                  </span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
