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
        /** Minimum width for the open picker, when the closed button is deliberately
         *  narrower than its options (e.g. an icon-only chooser with descriptive rows). */
        pickerWidth?: string;
        id?: string | undefined;
        editable?: boolean;
        code?: boolean;
        item?: Snippet<
            [
                option: Item,
                localized: Snippet<[label: string | LocaleTextAccessor]>,
            ]
        >;
        /** Called when an option receives focus (e.g. during keyboard navigation). */
        focusoption?: (value: string | undefined) => void;
        /** Called when an option loses focus. */
        bluroption?: (value: string | undefined) => void;
        /** Called when the pointer enters an option (covers the whole option, not just its text). */
        enteroption?: (value: string | undefined) => void;
        /** Called when the pointer leaves an option. */
        leaveoption?: (value: string | undefined) => void;
        /** Custom content for the closed button, in place of the cloned `<selectedcontent>`.
         *  Use when the selected display needs live content (e.g. an animation) that a
         *  static clone can't render. */
        selection?: Snippet;
    }

    let {
        value = $bindable(),
        label,
        options,
        change,
        width = 'auto',
        pickerWidth = undefined,
        id = undefined,
        editable = true,
        code = false,
        item,
        focusoption,
        bluroption,
        enteroption,
        leaveoption,
        selection,
    }: Props = $props();

    let title = $derived(
        typeof label === 'string' ? label : $locales.getPlainText(label),
    );

    let view: HTMLSelectElement | undefined = $state(undefined);

    // A single user action can fire multiple handlers for the same value within a few milliseconds
    // (onpointerdown on the option AND onchange on the select in Chrome; onchange alone in Safari;
    // onkeydown for Enter/Space). We collapse that burst into one change() by ignoring a repeat of
    // the same value within a short window. We can't instead dedup against the live `value` prop
    // (which would let us reset on navigation): with the parent passing `value` one-way while the
    // <select> drives it via bind:value, parent-side changes don't reliably reach this component, so
    // a value-based guard would wrongly suppress re-selecting a value chosen earlier. The time
    // window is short enough that a deliberate re-selection (always slower than one click's burst)
    // still goes through.
    const BURST_MS = 500;
    let lastCommitted: string | undefined = undefined;
    let lastCommittedAt = 0;

    function commitChange(newValue: string | undefined) {
        const now = performance.now();
        if (newValue === lastCommitted && now - lastCommittedAt < BURST_MS)
            return;
        lastCommitted = newValue;
        lastCommittedAt = now;
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

    /** Whether the picker is currently open. Prefers the live `:open` DOM state, since
     *  the `toggle` event isn't reliably dispatched for a customizable <select>; falls
     *  back to the tracked `open` flag where `:open` isn't supported. */
    function pickerOpen() {
        try {
            return view !== undefined && view.matches(':open');
        } catch {
            return open;
        }
    }

    function showTip() {
        if (!view || pickerOpen()) return;
        // The hint renders each chosen locale styled; the aria-label (`title`) stays a
        // joined plain string since attributes can't carry per-locale markup.
        if (typeof label === 'string') hint.show(label, view);
        else hint.showMarkup($locales.getMultilingualMarkup(label), view);
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

<span
    class="options-group"
    style:width={width === 'auto' ? undefined : width}
    ><select
        {id}
        aria-label={title}
        bind:value
        bind:this={view}
        style:width
        style:max-width={width === 'auto' ? undefined : width}
        style:--picker-width={pickerWidth}
        disabled={!editable}
        class:code
        class:placeholder={value === undefined}
        onchange={(e) => commitChange((e.target as HTMLSelectElement).value)}
        onpointerdown={hideTip}
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
        <button
            >{#if selection}{@render selection()}{:else}<selectedcontent
                ></selectedcontent>{/if}</button
        >
        {#each options as option}
            {#if 'options' in option}
                <optgroup label={$locales.getPlainText(option.label)}>
                    {#each option.options as groupoption}
                        <option
                            selected={groupoption.value === value}
                            value={groupoption.value}
                            onpointerdown={() =>
                                commitChange(groupoption.value)}
                            onpointerenter={() =>
                                enteroption?.(groupoption.value)}
                            onpointerleave={() =>
                                leaveoption?.(groupoption.value)}
                            onfocus={() => focusoption?.(groupoption.value)}
                            onblur={() => bluroption?.(groupoption.value)}
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
                    onpointerenter={() => enteroption?.(option.value)}
                    onpointerleave={() => leaveoption?.(option.value)}
                    onfocus={() => focusoption?.(option.value)}
                    onblur={() => bluroption?.(option.value)}
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

    /* Let the flex chain (select → button → selectedcontent) shrink below its
       content size so the closed display can clip instead of spilling past the
       control's right border. */
    select,
    select button {
        min-width: 0;
    }

    /* A custom `selection` snippet replaces <selectedcontent>, so it doesn't
       inherit that element's clipping; without this it can spill past the
       control's border and shove the picker icon outside it. */
    select button {
        overflow: hidden;
    }

    selectedcontent {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    select {
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-small-font-size);
        /* Pin the line box so a tall fallback-font glyph in the selected value
           can't inflate the control height or shift its baseline. */
        line-height: 1;
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

    /* Disabled select: flat, muted, no shadow — mirrors the disabled styles of
       Toggle and the other bordered widgets. Placed after :hover/:focus/:open
       so it overrides their background/transform at equal specificity. */
    select:disabled {
        cursor: default;
        color: var(--wordplay-inactive-color);
        background: var(--wordplay-background);
        border-color: var(--wordplay-border-color);
        box-shadow: none;
        opacity: 0.55;
        transform: none;
    }

    ::picker(select) {
        /* Lets a deliberately narrow closed button open into a wider list. The
           custom property inherits from the originating <select>. */
        min-width: var(--picker-width, auto);
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
