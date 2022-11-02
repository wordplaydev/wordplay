import { readable } from "svelte/store";

// A store that updates an idle state based on the last keydown event.
const KeyboardIdle = readable<boolean>(true, set => {

    let checker: NodeJS.Timer | undefined = undefined;

    // Poll until document is available to attach listener.
    const attacher = setInterval(() => {
        // This can run before the page is loaded, so we wait and attach once it is.
        if(typeof document !== "undefined") {
            document.addEventListener("keydown", handleKeyDown);
            clearInterval(attacher);
        }
    }, 500);
    
    function handleKeyDown() { 

        // Clear any previous timer.
        if(checker) clearTimeout(checker);
        // Set idle to false.
        set(false);
        // Set idel to true in a bit.
        checker = setTimeout(() => set(true), 500);
    
    }

    return () => { 
        if(checker) clearTimeout(checker);
        if(typeof document !== "undefined")
            document.removeEventListener("keydown", handleKeyDown);
    };

});

export default KeyboardIdle;