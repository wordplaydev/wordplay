<script lang="ts">
    export let value: string | undefined;
    export let options: string[];
    export let change: (value: string | undefined) => void;

    function handleKey(event: KeyboardEvent) {
        const index = options.indexOf(value as string);
        if (index >= 0) {
            if (event.key === 'ArrowDown') {
                value = options[index === options.length - 1 ? 0 : index + 1];
                change(value);
            } else if (event.key === 'ArrowUp') {
                value = options[index === 0 ? options.length - 1 : index - 1];
                change(value);
            }
        }
    }
</script>

<select
    bind:value
    on:change={() => change(value)}
    on:keydown|preventDefault={handleKey}
>
    {#each options as option}
        <option value={option}>{option}</option>
    {/each}
</select>

<style>
    select {
        appearance: none;
        border: none;
        font-family: var(--wordplay-app-font);
        width: 100%;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
    }
</style>
