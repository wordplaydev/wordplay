<div class="page">
    <h1><slot /></h1>
</div>

<style>
    .page {
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
    }

    h1 {
        font-size: xx-large;
        font-family: var(--wordplay-app-font);
        font-weight: normal;
        color: var(--wordplay-background);
        background: var(--wordplay-error);
        padding: var(--wordplay-spacing);
        text-align: center;
    }
</style>
