import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { EndpointBuilder } from "@/components/app/EndpointBuilder";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_app/endpoints/$id/edit")({
  head: ({ params }) => ({ meta: [{ title: `Edit ${params.id} — SchemaGuard` }] }),
  component: EditEndpoint,
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
      Endpoint not found. <Link to="/endpoints" className="ml-2 underline">Back</Link>
    </div>
  ),
});

function EditEndpoint() {
  const { id } = Route.useParams();
  const ep = useStore((s) => s.endpoints.find((e) => e.id === id));
  if (!ep) throw notFound();
  return <EndpointBuilder initial={ep} />;
}
