<script module lang="ts">
    export type Option = {
        value: string | undefined;
        label: string;
    };
    export type Group<Type extends Option> = {
        label: string;
        options: Type[];
    };
</script>

<script lang="ts" generics="Item extends Option">
    import { getTip } from '@components/project/Contexts';

    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { locales } from '@db/Database';
    import type {
        LocaleTextAccessor,
        LocaleTextsAccessor,
    } from '@locale/Locales';
    import { getFirstText } from '@locale/LocaleText';

    import { tick, type Snippet } from 'svelte';

    interface Props {
        value: string | undefined;
        label: LocaleTextAccessor | LocaleTextsAccessor;
        options: Group<Item>[] | Item[];
        change: (value: string | undefined) => void;
        width?: string;
        id?: string | undefined;
        editable?: boolean;
        code?: boolean;
        item?: Snippet<[option: Item]>;
    }

    let {
        value = $bindable(),
        label,
        options,
        change,
        width = 'auto',
        id = undefined,
        editable = true,
        code = false,
        item,
    }: Props = $props();

    let title = $derived(getFirstText($locales.get(label)));

    let view: HTMLSelectElement | undefined = $state(undefined);

    function commitChange(newValue: string | undefined) {
        value = newValue;
        change(newValue);
        tick().then(() => {
            if (view)
                setKeyboardFocus(
                    view,
                    'Restoring focus after options selection.',
                );
        });
    }

    let hint = getTip();
    function showTip() {
        if (view) hint.show(title, view);
    }
    function hideTip() {
        hint.hide();
    }
</script>

<select
    {id}
    aria-label={title}
    bind:value
    bind:this={view}
    style:width
    disabled={!editable}
    class:code
    onpointerenter={showTip}
    onpointerleave={hideTip}
    ontouchstart={showTip}
    ontouchend={hideTip}
    ontouchcancel={hideTip}
    onfocus={showTip}
    onblur={hideTip}
>
    <button><selectedcontent></selectedcontent></button>
    {#each options as option}
        {#if 'options' in option}
            <optgroup label={option.label}>
                {#each option.options as groupoption}
                    <option
                        selected={groupoption.value === value}
                        value={groupoption.value}
                        onpointerdown={() => commitChange(groupoption.value)}
                        onkeydown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                commitChange(groupoption.value);
                            }
                        }}
                        >{#if item}{@render item(
                                groupoption,
                            )}{:else}{groupoption.label}{/if}</option
                    >{/each}
            </optgroup>
        {:else}
            <option
                selected={option.value === value}
                value={option.value}
                onpointerdown={() => commitChange(option.value)}
                onkeydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        commitChange(option.value);
                    }
                }}
                >{#if item}{@render item(
                        option,
                    )}{:else}{option.label}{/if}</option
            >
        {/if}
    {/each}
</select>

<style>
    ::picker(select),
    select {
        appearance: base-select;
    }

    select {
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-code-font);
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
        gap: var(--wordplay-spacing);
        transition: calc(var(--animation-factor) * 250ms) border-radius;
    }

    select:hover {
        background: var(--wordplay-hover);
    }

    select:open {
        border-bottom-right-radius: 0;
        border-bottom-left-radius: 0;
        border-bottom: none;
    }

    select::picker-icon {
        content: '▾';
        color: var(--wordplay-foreground);
        transition: calc(var(--animation-factor) * 250ms) translate;
    }

    select:open::picker-icon {
        translate: 0 3px;
    }

    ::picker(select) {
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-top-left-radius: 0;
        border-top-right-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
        border-bottom-left-radius: var(--wordplay-border-radius);
    }

    optgroup,
    option {
        padding: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
    }

    option:hover {
        background: var(--wordplay-hover);
    }

    option:focus {
        outline: var(--wordplay-focus-color) solid var(--wordplay-focus-width);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
    }

    option::checkmark {
        content: '⬤';
        color: var(--wordplay-highlight-color);
    }

    .code {
        font-family: var(--wordplay-code-font);
    }
</style>
