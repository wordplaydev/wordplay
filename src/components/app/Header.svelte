<h1><slot /></h1>

<style>
    h1 {
        font-size: min(10vw, 80pt);
        font-family: var(--wordplay-app-font);
        color: var(--wordplay-header);
        font-weight: bold;
        margin-inline-start: -0.25em;
        margin-block-end: calc(var(--wordplay-spacing) / 3);
        text-align: start;
        transform: rotate(-1deg);
    }
</style>
