import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudScreen } from "@/components/content-crud/ContentCrudScreen";

export const Route = createFileRoute("/faqs")({
  component: () => (
    <ContentCrudScreen
      collection="faqs"
      label="FAQ"
      description="Questions shown in the homepage accordion and FAQ schema."
    />
  ),
});
