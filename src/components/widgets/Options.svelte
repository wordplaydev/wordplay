<script context="module" lang="ts">
    export type Option = {
        value: string | undefined;
        label: string;
    };
    export type Group = {
        label: string;
        options: Option[];
    };
</script>

<script lang="ts">
    import { tick } from 'svelte';

    export let value: string | undefined;
    export let label: string;
    export let options: Group[] | Option[];
    export let change: (value: string | undefined) => void;
    export let width = '10em';
    export let id: string;
    export let editable = true;

    let view: HTMLSelectElement | undefined = undefined;

    async function commitChange(newValue: string | undefined) {
        change(newValue);
        await tick();
        view?.focus();
    }
</script>

<select
    aria-label={label}
    title={label}
    bind:value
    {id}
    on:change={() => commitChange(value)}
    bind:this={view}
    style:width
    disabled={!editable}
>
    {#each options as option}
        {#if 'options' in option}
            <optgroup label={option.label}>
                {#each option.options as groupoption}
                    <option
                        selected={groupoption.value === value}
                        value={groupoption.value}>{groupoption.label}</option
                    >{/each}
            </optgroup>
        {:else}
            <option selected={option.value === value} value={option.value}
                >{option.label}</option
            >
        {/if}
    {/each}
</select>

<style>
    select {
        appearance: none;
        border: none;
        background: var(--wordplay-background);
        padding-left: var(--wordplay-spacing);
        padding-right: var(--wordplay-spacing);
        font-family: var(--wordplay-app-font);
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
    }
</style>
