import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { EndpointBuilder } from "@/components/app/EndpointBuilder";
import { store } from "@/lib/store";
import { useState } from "react";

const searchSchema = z.object({ collection: z.string().optional() });

export const Route = createFileRoute("/_app/endpoints/new")({
  head: () => ({ meta: [{ title: "New endpoint — SchemaGuard" }] }),
  validateSearch: searchSchema,
  component: NewEndpoint,
});

function NewEndpoint() {
  const { collection } = Route.useSearch();
  const [initial] = useState(() => store.newEndpointTemplate(collection ?? null));
  return <EndpointBuilder initial={initial} />;
}
