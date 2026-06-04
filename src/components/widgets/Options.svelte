<script module lang="ts">
    export type Option = {
        value: string | undefined;
        label: string | LocaleTextAccessor;
        [key: string]: any;
    };
    export type Group<Type extends Option> = {
        label: string | LocaleTextAccessor;
        options: Type[];
        [key: string]: any;
    };
</script>

<script lang="ts" generics="Item extends Option">
    import { getLocalizing, getTip } from '@components/project/Contexts';

    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';

    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { tick, type Snippet } from 'svelte';

    interface Props {
        value: string | undefined;
        label: string | LocaleTextAccessor;
        options: Group<Item>[] | Item[];
        change: (value: string | undefined) => void;
        width?: string;
        id?: string | undefined;
        editable?: boolean;
        code?: boolean;
        item?: Snippet<
            [
                option: Item,
                localized: Snippet<[label: string | LocaleTextAccessor]>,
            ]
        >;
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

    let title = $derived(
        typeof label === 'string' ? label : $locales.getPlainText(label),
    );

    let view: HTMLSelectElement | undefined = $state(undefined);

    // Tracks the last value commitChange actually fired the change handler
    // for. We can't dedup against `value` itself: a programmatic selectOption
    // (used by tests and accessibility tools) flows through Svelte's bind:value
    // which updates `value` BEFORE the change event reaches us, so a naive
    // `newValue === value` check would suppress every such call.
    let lastCommitted: string | undefined = $state(undefined);

    function commitChange(newValue: string | undefined) {
        // A single user action can trigger multiple handlers (onpointerdown on
        // the option AND onchange on the select in Chrome; onchange alone in
        // Safari; onkeydown for Enter/Space). They all funnel here, so collapse
        // redundant calls to the same value into a single change() invocation.
        if (newValue === lastCommitted) return;
        lastCommitted = newValue;
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
    let localizing = getLocalizing();

    /** Whether the select's picker (dropdown) is open. While it's open we
     *  suppress the tooltip — it overlaps the open list and is distracting. */
    let open = $state(false);

    function showTip() {
        if (view && !open) hint.show(title, view);
    }
    function hideTip() {
        hint.hide();
    }
</script>

{#snippet localized(label: string | LocaleTextAccessor)}
    {#if typeof label === 'string'}
        {label}
    {:else}
        <LocalizedText path={label} />
    {/if}
{/snippet}

<span class="options-group"
    ><select
        {id}
        aria-label={title}
        bind:value
        bind:this={view}
        style:width
        disabled={!editable}
        class:code
        class:placeholder={value === undefined}
        onchange={(e) => commitChange((e.target as HTMLSelectElement).value)}
        ontoggle={(e: ToggleEvent) => {
            open = e.newState === 'open';
            // Hide immediately on open in case a focus/hover already showed it.
            if (open) hideTip();
        }}
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
                <optgroup label={$locales.getPlainText(option.label)}>
                    {#each option.options as groupoption}
                        <option
                            selected={groupoption.value === value}
                            value={groupoption.value}
                            onpointerdown={() =>
                                commitChange(groupoption.value)}
                            onkeydown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    commitChange(groupoption.value);
                                }
                            }}
                            >{#if item}{@render item(
                                    groupoption,
                                    localized,
                                )}{:else}{@render localized(
                                    groupoption.label,
                                )}{/if}</option
                        >{/each}
                </optgroup>
            {:else}
                <option
                    class:placeholder={option.value === undefined}
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
                            localized,
                        )}{:else}{@render localized(option.label)}{/if}</option
                >
            {/if}
        {/each}
    </select>{#if localizing?.on && typeof label !== 'string'}<LocalizedText
            path={label}
            tipIcon
        />{/if}</span
>

<style>
    .options-group {
        display: inline-flex;
        align-items: center;
        gap: var(--wordplay-spacing-half);
        width: fit-content;
    }

    ::picker(select),
    select {
        appearance: base-select;
    }

    select button,
    selectedcontent {
        white-space: nowrap;
    }

    select {
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-small-font-size);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-border-color);
        max-width: 7em;
        transition:
            transform calc(var(--animation-factor) * 100ms),
            box-shadow calc(var(--animation-factor) * 100ms),
            border-radius calc(var(--animation-factor) * 250ms);
    }

    select:hover {
        background: var(--wordplay-hover);
        transform: translate(-1px, -1px);
    }

    select:focus {
        background: var(--wordplay-focus-color);
        color: var(--wordplay-background);
        outline: none;
    }

    select:open {
        border-bottom-right-radius: 0;
        border-bottom-left-radius: 0;
        border-bottom: none;
        box-shadow: inset var(--wordplay-border-width)
            var(--wordplay-border-width) 0 var(--wordplay-foreground);
        transform: translate(
            var(--wordplay-border-width),
            var(--wordplay-border-width)
        );
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
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
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
        content: '●';
        color: var(--wordplay-highlight-color);
    }

    /* The "no selection" option (value === undefined) is styled as a
       placeholder cue, mirroring the convention used for input placeholders.
       select.placeholder italicizes the closed dropdown's display area
       (<selectedcontent> doesn't inherit the option's own CSS), but that
       italic also inherits to every <option> in the open menu, so we reset
       options back to normal and re-italicize only the placeholder. */
    select.placeholder {
        font-style: italic;
    }

    option {
        font-style: normal;
    }

    option.placeholder {
        font-style: italic;
    }

    .code {
        font-family: var(--wordplay-code-font);
    }
</style>
