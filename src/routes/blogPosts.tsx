import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudScreen } from "@/components/content-crud/ContentCrudScreen";

export const Route = createFileRoute("/blogPosts")({
  component: () => (
    <ContentCrudScreen
      collection="blogPosts"
      label="Articles"
      description="Long-form content is what earns organic Google traffic. Each article gets its own URL, title and meta."
      addLabel="New article"
    />
  ),
});
