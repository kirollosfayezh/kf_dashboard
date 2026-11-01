/** The semantic colour of a chip or message, shared by `Pill` and `Callout`. */
export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

/** Maps the API's lower-case state words onto a tone, for the screens that
 *  display raw status values. Unknown states read as neutral. */
export function toneForStatus(status: string): Tone {
  switch (status.toLowerCase()) {
    case "published":
    case "replied":
    case "won":
      return "success";
    case "scheduled":
    case "contacted":
      return "warning";
    case "new":
      return "danger";
    default:
      return "neutral";
  }
}
