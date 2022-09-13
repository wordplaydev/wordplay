import { readable } from "svelte/store";

// A store that updates an idle state based on the last keydown event.
const KeyboardIdle = readable<boolean>(false, set => {

    let attached = false;
    let lastEvent: number | undefined = undefined;

    function handleKeyDown() { lastEvent = Date.now(); }

    const interval = setInterval(() => {
        if(lastEvent !== undefined) {
            const idle = (Date.now() - lastEvent) > 500;
            set(idle);
        }
        // This can run before the page is loaded, so we wait and attach once it is.
        if(typeof document !== "undefined" && !attached) {
            document.addEventListener("keydown", handleKeyDown);
            attached = true;
        }
    }, 500);

    return function stop() {
        clearInterval(interval);
        if(typeof document !== "undefined")
            document.removeEventListener("keydown", handleKeyDown);
    }

});

export default KeyboardIdle;