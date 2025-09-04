const DEBUG_FOCUS = false;

/** A helper function that wraps HTMLElement.focus() in order to help with focus debugging. All
 * front end code in the project should use this function to focus elements. This function will
 * log a message to the console if DEBUG_FOCUS is set to true.
 */
export default function setKeyboardFocus(
    element: HTMLElement,
    message: string,
) {
    if (document.activeElement !== element) {
        if (DEBUG_FOCUS) {
            console.log(`New focus: ${message}`);
            console.log('\tFrom', document.activeElement);
            console.log('\tTo: ', element);
        }
        element.focus();
    } else if (DEBUG_FOCUS) {
        console.log(`Already focused: ${message}`);
    }
}
