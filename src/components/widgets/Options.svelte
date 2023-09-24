<script context="module" lang="ts">
    export type Option = {
        value: string | undefined;
        label: string;
    };
</script>

<script lang="ts">
    import { tick } from 'svelte';

    export let value: string | undefined;
    export let options: Option[];
    export let change: (value: string | undefined) => void;
    export let width = '10em';
    export let id: string;
    export let editable = true;

    let view: HTMLSelectElement | undefined = undefined;

    function handleKey(event: KeyboardEvent) {
        const index = options.findIndex((option) => option.value === value);
        if (index >= 0) {
            let newValue = null;
            if (event.key === 'ArrowDown')
                newValue =
                    options[index === options.length - 1 ? 0 : index + 1];
            else if (event.key === 'ArrowUp')
                newValue =
                    options[index === 0 ? options.length - 1 : index - 1];
            if (newValue !== null) {
                event.preventDefault();
                commitChange(newValue.value);
            }
        }
    }

    async function commitChange(newValue: string | undefined) {
        change(newValue);
        await tick();
        view?.focus();
    }
</script>

<select
    bind:value
    {id}
    on:change={() => commitChange(value)}
    on:keydown|stopPropagation={handleKey}
    bind:this={view}
    style:width
    disabled={!editable}
>
    {#each options as option}
        <option selected={option.value === value} value={option.value}
            >{option.label}</option
        >
    {/each}
</select>

<style>
    select {
        appearance: none;
        border: none;
        padding-left: var(--wordplay-spacing);
        padding-right: var(--wordplay-spacing);
        font-family: var(--wordplay-app-font);
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
    }
</style>
