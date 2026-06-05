import { createFileRoute } from "@tanstack/react-router";
import PostmanEndpoints from "@/components/app/PostmanEndpoints";

export const Route = createFileRoute("/_app/endpoints")({
  head: () => ({ meta: [{ title: "Endpoints — SchemaGuard" }] }),
  component: PostmanEndpoints,
});
