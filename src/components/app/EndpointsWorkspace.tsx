import type { ReactNode } from "react";
import { CollectionsSidebar } from "./CollectionsSidebar";

/** Two-panel Postman-style workspace used inside endpoints routes. */
export function EndpointsWorkspace({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-6 -my-8 flex min-h-[calc(100vh-3.5rem)] items-stretch">
      <CollectionsSidebar />
      <div className="min-w-0 flex-1 overflow-x-hidden px-6 py-6">{children}</div>
    </div>
  );
}
