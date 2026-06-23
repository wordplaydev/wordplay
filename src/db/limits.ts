/** Front-end caps on the length of user-entered names and descriptions
 *  (projects, characters, galleries), in UTF-16 code units. These are enforced
 *  in the UI via the `maxlength` prop on TextField/TextBox; they are not
 *  enforced server-side. */
export const MAX_NAME_LENGTH = 64;
export const MAX_DESCRIPTION_LENGTH = 256;
