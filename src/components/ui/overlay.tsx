import * as React from "react";
import { createPortal } from "react-dom";

/**
 * Renders overlays into `document.body`.
 *
 * Every screen is wrapped in `.kf-scr`, which runs `animation: kfIn … both`.
 * The fill mode leaves that animation's transform applied forever, and *any*
 * transform makes an element the containing block for `position: fixed`
 * descendants — so an overlay rendered in place anchors to the screen wrapper
 * instead of the viewport, landing inset and mis-sized. Portalling out of the
 * wrapper is the fix that survives whatever a route does to its own container.
 */
export function Overlay({ children }: React.PropsWithChildren) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
