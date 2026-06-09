import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useRef } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = '/sign-in' } = options ?? {};
  const utils = trpc.useUtils();

  // Einzige Auth-Quelle (Custom-Auth, Session-Cookie angelus_session):
  // auth.me liefert die volle DB-User-Zeile oder null.
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation();

  // Profile check linking
  const linkProfileCheck = trpc.profileCheck.linkToUser.useMutation();
  const hasLinkedProfileCheck = useRef(false);

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      if (typeof window !== "undefined") window.location.href = '/sign-in';
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    // Sync to localStorage (backward compatibility)
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data ?? null)
    );

    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading,
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [meQuery.data, meQuery.error, meQuery.isLoading]);

  // Link profile check to user after login
  useEffect(() => {
    if (!state.user || hasLinkedProfileCheck.current) return;

    const sessionId = localStorage.getItem('angelus_profile_check_session');
    const completed = localStorage.getItem('angelus_profile_check_completed');

    if (sessionId && completed === 'true') {
      hasLinkedProfileCheck.current = true;
      linkProfileCheck.mutate({ sessionId }, {
        onSuccess: () => {
          localStorage.removeItem('angelus_profile_check_session');
          localStorage.removeItem('angelus_profile_check_completed');
        },
      });
    }
  }, [state.user, linkProfileCheck]);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, state.loading, state.user]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
