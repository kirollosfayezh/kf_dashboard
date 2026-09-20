import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudScreen } from "@/components/content-crud/ContentCrudScreen";

export const Route = createFileRoute("/solutions")({
  component: () => (
    <ContentCrudScreen
      collection="solutions"
      label="Solutions"
      description="Each industry gets its own card and anchor on the solutions page."
      addLabel="Add industry"
    />
  ),
});
