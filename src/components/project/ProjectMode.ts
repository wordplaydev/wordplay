/** The three project evaluation modes. Order matters: it's the display and
 * URL order, and the Mode widget's choice index, and it must stay in step with the
 * positional `labels`/`tips` tuples in every locale's `ui.output.mode`. Step comes
 * last because edit and play are the two modes creators move between constantly. */
export const ProjectModes = ['edit', 'play', 'step'] as const;

export type ProjectMode = (typeof ProjectModes)[number];
