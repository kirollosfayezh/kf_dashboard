import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudScreen } from "@/components/content-crud/ContentCrudScreen";

export const Route = createFileRoute("/aboutSections")({
  component: () => (
    <ContentCrudScreen
      collection="aboutSections"
      label="About sections"
      description="Sections shown on the about page."
    />
  ),
});
