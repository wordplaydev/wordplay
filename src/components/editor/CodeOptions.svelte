<script context="module">
    const OpenKeys = ['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Home', 'End'];
    const CloseKey = 'Escape';
    const ChooseKeys = ['Enter', ' ', 'Tab'];
</script>

<script lang="ts">
    import RootView from '@components/project/RootView.svelte';

    import Node from '@nodes/Node';
    import type Token from '@nodes/Token';

    export let current: Token;
    export let label: string;
    /** We don't get these until the menu is shown, for performance reasons.*/
    export let options: () => Node[];
    /** How to handle a selection */
    export let change: (node: Node) => void;

    let showing = false;
    let selection: Node | undefined = undefined;
    let optionsCache: Node[] | undefined = undefined;

    function getOptions() {
        if (optionsCache === undefined) optionsCache = options();
        return optionsCache;
    }

    function close() {
        showing = false;
        selection = undefined;
    }

    function choose(choice: Node) {
        change(choice);
        showing = false;
    }

    function handleKey(event: KeyboardEvent) {
        const currentOptions = getOptions();
        if (showing) {
            if (event.key === 'ArrowUp') {
                const index = selection
                    ? currentOptions.findIndex(
                          (option) =>
                              selection !== undefined &&
                              option.toWordplay() === selection.toWordplay(),
                      )
                    : 0;
                if (index > 0) selection = currentOptions[index - 1];
                event.stopPropagation();
                event.preventDefault();
            } else if (event.key === 'ArrowDown') {
                const index = selection
                    ? currentOptions.findIndex(
                          (option) =>
                              selection !== undefined &&
                              option.toWordplay() === selection.toWordplay(),
                      )
                    : 1;
                if (index < currentOptions.length - 1)
                    selection = currentOptions[index + 1];
                event.stopPropagation();
                event.preventDefault();
            } else if (event.key === CloseKey) close();
            else if (event.key === 'Home') selection = currentOptions.at(0);
            else if (event.key === 'End') selection = currentOptions.at(-1);
            else if (ChooseKeys.includes(event.key)) {
                if (selection) choose(selection);
                event.stopPropagation();
                event.preventDefault();
                return;
            }
        } else if (OpenKeys.includes(event.key)) {
            showing = true;
            selection = currentOptions[0];
            event.stopPropagation();
            event.preventDefault();
            return;
        } else if (event.key === CloseKey) showing = false;
    }
</script>

<div class="select">
    <div
        class="selection"
        role="combobox"
        aria-expanded={showing ? 'true' : 'false'}
        aria-controls="options-{current.id}"
        aria-activedescendant="option-{current.id}-{selection?.id}"
        id="selection-{current.id}"
        on:keydown={handleKey}
        on:pointerdown|stopPropagation={() => (showing = true)}
        on:blur={close}
        tabindex="0">{current.getText()}<span class="arrow">▾</span></div
    >
    {#if showing}
        <div
            class="options"
            role="listbox"
            id="options-{current.id}"
            aria-label={label}
            tabindex="-1"
        >
            {#each getOptions() as option}
                <div
                    role="option"
                    class="option"
                    id="option-{current.id}-{selection?.id}"
                    aria-selected={selection !== undefined &&
                        option.toWordplay() === selection.toWordplay()}
                    on:pointerdown={() => choose(option)}
                >
                    <RootView node={option} inert localized="localized" />
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .select {
        position: relative;
    }

    .options {
        position: absolute;
        z-index: 1;
        display: flex;
        flex-direction: column;
        gap: 0;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        background: var(--wordplay-background);
    }

    .selection {
        cursor: pointer;
        position: relative;
    }

    .selection:focus {
        border-radius: var(--wordplay-border-radius);
    }

    .arrow {
        color: var(--wordplay-chrome);
        position: absolute;
        left: 0;
        top: 0.75em;
    }

    .selection:focus .arrow,
    .selection:hover .arrow {
        display: inline-block;
        color: var(--wordplay-foreground);
    }

    .option {
        padding-left: var(--wordplay-spacing);
        padding-right: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
    }

    .option[aria-selected='true'] {
        outline: var(--wordplay-focus-color) solid var(--wordplay-focus-width);
    }

    .option:hover {
        background: var(--wordplay-hover);
    }
</style>
