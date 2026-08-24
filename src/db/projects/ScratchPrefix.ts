/**
 * Scratch projects are throwaway copies of a guide example, made so someone can
 * tinker with it (#1044). They are kept on the device and hidden from the
 * project list, exactly like tutorial projects.
 *
 * The prefix lives in its own module because `Project` needs it to answer
 * `isScratch()` and `scratch.ts` needs `Project` to make one — importing the
 * whole of scratch.ts into Project.ts just for a string would be a cycle.
 */
export const ScratchPrefix = 'scratch-';
