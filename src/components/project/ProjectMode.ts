/** The three project evaluation modes. Order matters: it's the display and
 * URL order, and the Mode widget's choice index. */
export const ProjectModes = ['edit', 'step', 'play'] as const;

export type ProjectMode = (typeof ProjectModes)[number];
