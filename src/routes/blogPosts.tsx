import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudScreen } from "@/components/content-crud/ContentCrudScreen";

export const Route = createFileRoute("/blogPosts")({
  component: () => (
    <ContentCrudScreen
      collection="blogPosts"
      label="Articles"
      description="Long-form articles shown on the blog."
    />
  ),
});
