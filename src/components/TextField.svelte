<script lang="ts">
    export let text: string = '';
    export let placeholder: string;
</script>

<input type="text" {placeholder} bind:value={text} />

<style>
    input {
        width: 100%;
        height: 100%;
        background: none;
        font-size: var(--wordplay-font-size);
        font-family: var(--wordplay-font-face);
        border: none;
        padding: var(--wordplay-spacing);
        border-bottom: var(--wordplay-disabled-color) solid
            var(--wordplay-focus-width);
    }

    input:focus {
        outline: none;
        border-bottom-color: var(--wordplay-highlight);
    }
</style>
