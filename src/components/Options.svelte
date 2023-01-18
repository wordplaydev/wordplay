<script lang="ts">
    export let value: string | undefined;
    export let options: string[];
    export let change: (value: string | undefined) => void;

    function handleKey(event: KeyboardEvent) {
        const index = options.indexOf(value as string);
        if (index >= 0) {
            let newValue = undefined;
            if (event.key === 'ArrowDown')
                newValue =
                    options[index === options.length - 1 ? 0 : index + 1];
            else if (event.key === 'ArrowUp')
                newValue =
                    options[index === 0 ? options.length - 1 : index - 1];
            if (newValue !== undefined) {
                event.preventDefault();
                change(newValue);
            }
        }
    }
</script>

<select
    bind:value
    on:change={() => change(value)}
    on:keydown|stopPropagation={handleKey}
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
