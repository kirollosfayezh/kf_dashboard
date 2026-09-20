import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudScreen } from "@/components/content-crud/ContentCrudScreen";

export const Route = createFileRoute("/aboutSections")({
  component: () => (
    <ContentCrudScreen
      collection="aboutSections"
      label="About / founder"
      description="The bio blocks used on the about page and the homepage about block."
      addLabel="Add section"
      singularLabel="Section"
    />
  ),
});
