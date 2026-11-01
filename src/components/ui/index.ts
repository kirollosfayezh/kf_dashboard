/**
 * The KF dashboard primitives.
 *
 * Everything here is styled with theme utilities (`bg-panel`, `text-muted`,
 * `rounded-card`, `text-ui`) rather than inline `style` objects. That is only
 * possible because the colour tokens now live in Tailwind's `@theme` block —
 * see the header of `styles.css` for why that one change was the difference
 * between a design system and 248 hand-written style objects.
 *
 * Two rules every component here follows:
 *
 * 1. **`className` and `style` are destructured out of props, the spread comes
 *    first, and both merged attributes come last.** The previous version
 *    spread `{...props}` *before* a hardcoded `style`, so a caller's `style`
 *    was silently discarded — which is why the validation border on the
 *    Marketing screen never appeared.
 * 2. **Sizes come from the scale.** `h-control`, `text-ui`, `rounded-control`.
 *    No arbitrary pixel values; if a new one is needed, it goes in the scale.
 *
 * Import from `@/components/ui`, not from the individual files: this barrel is
 * the public surface. `Overlay` (the portal behind `Modal`/`Drawer`) is
 * deliberately not exported — see `overlay.tsx`.
 */

export { Card, PageHeader, SectionHead, PanelHead } from "./surfaces";
export { Button, GradientButton, AddButton, IconButton, type ButtonProps } from "./buttons";
export { Input, Textarea, Select, Field } from "./fields";
export { type Tone, toneForStatus } from "./tone";
export { Pill, StatTile, Avatar } from "./display";
export { Toggle, SegmentedControl } from "./controls";
export { Spinner, Skeleton, LoadingState, Callout, ErrorBanner, EmptyState } from "./feedback";
export { DataTable, RowActions, type DataColumn } from "./table";
export { useDialogBehavior, Modal, ConfirmDialog, Drawer } from "./dialogs";
export { FormActions } from "./form-actions";
export { BrandMark } from "./brand-mark";
