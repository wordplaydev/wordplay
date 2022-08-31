import { readable } from "svelte/store";

// A store that updates an idle state based on the last keydown event.
const KeyboardIdle = readable<boolean>(false, 
    function start(set) {

        let lastEvent: number | undefined = undefined;

        function handleKeyDown() { lastEvent = Date.now(); }

        document.addEventListener("keydown", handleKeyDown);

        const interval = setInterval(() => {
            if(lastEvent !== undefined)
                set(Date.now() - lastEvent > 500);
        }, 500);

        return function stop() {
            clearInterval(interval);
            document.removeEventListener("keydown", handleKeyDown);
        }
    }
);

export default KeyboardIdle;