import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudScreen } from "@/components/content-crud/ContentCrudScreen";

export const Route = createFileRoute("/testimonials")({
  component: () => (
    <ContentCrudScreen
      collection="testimonials"
      label="Testimonials"
      description="Client quotes shown on the homepage, About page and the campaign page. Unpublished ones never render."
      layout="cards"
      addLabel="Add testimonial"
    />
  ),
});
