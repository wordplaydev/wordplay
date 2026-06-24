<div class="separator" role="presentation"></div>

<style>
    .separator {
        margin-inline-start: var(--wordplay-spacing-half);
        margin-inline-end: var(--wordplay-spacing-half);
        width: 0;
        /* Stretch to the surrounding row's height instead of `height: 100%`,
           which can resolve relative to an indefinite container and leak
           extra height into the row. */
        align-self: stretch;
        border-inline-start: var(--wordplay-border-width) solid
            var(--wordplay-inactive-color);
    }
</style>
