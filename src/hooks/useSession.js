"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useSession() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");
      return response.json();
    },
  });

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    queryClient.setQueryData(["session"], { user: null });
  };

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["session"] });

  const user = query.data?.user ?? null;

  return {
    user,
    isAdmin: Boolean(user?.isAdmin),
    credits: user?.credits ?? 0,
    isLoading: query.isLoading,
    logout,
    refresh,
  };
}
