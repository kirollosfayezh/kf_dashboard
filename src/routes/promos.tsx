import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudScreen } from "@/components/content-crud/ContentCrudScreen";

export const Route = createFileRoute("/promos")({
  component: () => (
    <ContentCrudScreen
      collection="promos"
      label="Offers & announcements"
      description="The popup your visitors see. The first published offer inside its date window is shown, once per visitor, four seconds after they arrive. Unpublish or set an end date to stop it."
      layout="cards"
      addLabel="Add offer"
      singularLabel="offer"
    />
  ),
});
