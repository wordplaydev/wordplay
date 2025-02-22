<script module lang="ts">
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
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { locales } from '@db/Database';
    import type {
        LocaleTextAccessor,
        LocaleTextsAccessor,
    } from '@locale/Locales';
    import { getFirstText } from '@locale/LocaleText';

    import { tick } from 'svelte';

    interface Props {
        value: string | undefined;
        label: LocaleTextAccessor | LocaleTextsAccessor;
        options: Group[] | Option[];
        change: (value: string | undefined) => void;
        width?: string;
        id?: string | undefined;
        editable?: boolean;
        code?: boolean;
    }

    let {
        value = $bindable(),
        label,
        options,
        change,
        width = '10em',
        id = undefined,
        editable = true,
        code = false,
    }: Props = $props();

    let title = $derived(getFirstText($locales.get(label)));

    let view: HTMLSelectElement | undefined = $state(undefined);

    async function commitChange(newValue: string | undefined) {
        change(newValue);
        await tick();
        if (view)
            setKeyboardFocus(view, 'Restoring focus after options selection.');
    }
</script>

getFirstText
<select
    aria-label={title}
    {title}
    bind:value
    {id}
    onchange={() => commitChange(value)}
    bind:this={view}
    style:width
    disabled={!editable}
    class:code
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
        color: var(--wordplay-foreground);
        padding-left: var(--wordplay-spacing);
        padding-right: var(--wordplay-spacing);
        font-family: var(--wordplay-app-font);
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
    }

    .code {
        font-family: var;
    }
</style>
