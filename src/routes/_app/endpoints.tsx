import { createFileRoute } from "@tanstack/react-router";
import PostmanEndpoints from "@/components/app/postman-endpoints";

export const Route = createFileRoute("/_app/endpoints")({
  head: () => ({ meta: [{ title: "Endpoints — SchemaGuard" }] }),
  component: PostmanEndpoints,
});
