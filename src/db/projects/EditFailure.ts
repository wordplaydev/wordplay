/** Types of edit failure */

export const EditFailure = {
    Infinite: 0,
    ReadOnly: 1,
    TooLarge: 2,
} as const;
export type EditFailure = (typeof EditFailure)[keyof typeof EditFailure];
