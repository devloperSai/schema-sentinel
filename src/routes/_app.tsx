import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { auth } from "@/lib/mock";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    // SSR-safe: only enforce on the client. Mock auth lives in localStorage.
    if (typeof window === "undefined") return;
    if (!auth.getToken()) {
      throw redirect({ to: "/login" });
    }
  },
  component: () => <Outlet />,
});
