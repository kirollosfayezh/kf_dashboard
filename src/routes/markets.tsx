import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudScreen } from "@/components/content-crud/ContentCrudScreen";

export const Route = createFileRoute("/markets")({
  component: () => (
    <ContentCrudScreen
      collection="markets"
      label="Markets"
      description="Country pages at /saudi-arabia, /uae and /gulf, in English and Arabic. Copy is kept in kf_backend/src/scripts/markets and written here with update-market-pages."
      layout="table"
      addLabel="Add market page"
      singularLabel="market page"
    />
  ),
});
