import { useUser, useClerk } from "@clerk/clerk-react";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useRef } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = '/sign-in' } = options ?? {};
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const utils = trpc.useUtils();

  // Query backend for full user profile (with KYC, role, etc.)
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: isSignedIn,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Profile check linking
  const linkProfileCheck = trpc.profileCheck.linkToUser.useMutation();
  const hasLinkedProfileCheck = useRef(false);

  const logout = useCallback(async () => {
    try {
      await signOut();
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    }
  }, [signOut, utils]);

  const state = useMemo(() => {
    // Sync to localStorage (backward compatibility)
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );

    return {
      user: meQuery.data ?? null,
      clerkUser,
      loading: !isLoaded || meQuery.isLoading,
      error: meQuery.error ?? null,
      isAuthenticated: isSignedIn && Boolean(meQuery.data),
    };
  }, [meQuery.data, meQuery.error, meQuery.isLoading, clerkUser, isLoaded, isSignedIn]);

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
    if (!isLoaded || state.loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, isLoaded, state.loading, state.user]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
