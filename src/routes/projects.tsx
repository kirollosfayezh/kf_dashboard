import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudScreen } from "@/components/content-crud/ContentCrudScreen";

export const Route = createFileRoute("/projects")({
  component: () => (
    <ContentCrudScreen
      collection="projects"
      label="Projects"
      description="Portfolio items shown on the homepage and the projects page."
    />
  ),
});
