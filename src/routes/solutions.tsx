import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudScreen } from "@/components/content-crud/ContentCrudScreen";

export const Route = createFileRoute("/solutions")({
  component: () => (
    <ContentCrudScreen
      collection="solutions"
      label="Solutions"
      description="Industry solution cards on the solutions page."
    />
  ),
});
