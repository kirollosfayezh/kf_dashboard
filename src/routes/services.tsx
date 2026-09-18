import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudScreen } from "@/components/content-crud/ContentCrudScreen";

export const Route = createFileRoute("/services")({
  component: () => (
    <ContentCrudScreen
      collection="services"
      label="Services"
      description="Service cards shown on the homepage and the services page."
    />
  ),
});
