import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudScreen } from "@/components/content-crud/ContentCrudScreen";

export const Route = createFileRoute("/legalPages")({
  component: () => (
    <ContentCrudScreen
      collection="legalPages"
      label="Legal pages"
      description="Privacy policy and terms, shown at /legal/… and linked from the site footer. Edited here in all four languages — have any change reviewed by a lawyer before publishing."
      layout="table"
      addLabel="Add document"
      singularLabel="document"
    />
  ),
});
