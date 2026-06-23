<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import { ToggleSearch } from '@components/editor/commands/Commands';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import Button from '@components/widgets/Button.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import { CONFIRM_SYMBOL } from '@parser/Symbols';
    import { tick } from 'svelte';

    interface Props {
        /** Whether search mode is active (the field is shown). */
        active: boolean;
        /** The current search query. */
        query: string;
        /** The number of current matches; the replace row shows when > 0. */
        matchCount: number;
        /** Move to the next match (the caret cycles through matches). */
        next: () => void;
        /** Replace every match with the given text. */
        replace: (replacement: string) => void;
    }

    let {
        active = $bindable(false),
        query = $bindable(''),
        matchCount,
        next,
        replace,
    }: Props = $props();

    /** The replacement text for the replace field. */
    let replacement = $state('');

    /** The query field's input element, so we can focus it when search opens. */
    let field = $state<HTMLInputElement | undefined>(undefined);
    /** The replace field's input element, so Enter there can submit replace. */
    let replaceField = $state<HTMLInputElement | undefined>(undefined);

    function doReplace() {
        replace(replacement);
        replacement = '';
    }

    // React to search mode toggling — whether from the button or the Cmd/Ctrl+F
    // command, which both just flip `active`. Opening focuses the field once it
    // has rendered; closing erases the query (and therefore the results).
    $effect(() => {
        if (active)
            tick().then(() => {
                if (field)
                    setKeyboardFocus(field, 'Focusing editor search field.');
            });
        else query = '';
    });
</script>

<!-- A magnifying-glass toggle pinned to the top-right of the editor that
     reveals a query field on its left. We stop pointer and keyboard events
     from reaching the editor so interacting with the toggle/field doesn't
     move the caret or type into the source — the Toggle widget, unlike
     Button/TextField, doesn't stop these itself, and the editor's own
     mousedown preventDefault would otherwise block the field from focusing
     on click.

     Cmd/Ctrl+F (toggle) and Cmd/Ctrl+G (next match) are handled here in the
     capture phase so they work even when the field has focus: the editor's
     commands never see them in that case, because TextField stops propagation
     of single-character keydowns ('f'/'g') before they bubble out. Capturing on
     the container intercepts them before TextField can, overriding the
     browser's find / find-next shortcuts. Enter in the field also goes to the
     next match. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="search-container"
    onpointerdown={(event) => event.stopPropagation()}
    onmousedown={(event) => event.stopPropagation()}
    onkeydown={(event) => event.stopPropagation()}
    onkeydowncapture={(event) => {
        const control = event.metaKey || event.ctrlKey;
        if (control && event.code === 'KeyF') {
            event.preventDefault();
            event.stopPropagation();
            active = !active;
        } else if (control && event.code === 'KeyG') {
            event.preventDefault();
            event.stopPropagation();
            next();
        } else if (event.key === 'Enter' && event.target === field) {
            // Enter in the query field cycles to the next match (don't hijack
            // Enter on the toggle button, which must still activate it).
            event.preventDefault();
            event.stopPropagation();
            next();
        } else if (event.key === 'Enter' && event.target === replaceField) {
            // Enter in the replace field submits the replace action.
            event.preventDefault();
            event.stopPropagation();
            doReplace();
        }
    }}
>
    <!-- Two-column grid: the two fields share the left column (right-aligned
         with each other), the toggle and button share the right column
         (right-aligned with each other). When active, the grid reads as a
         floating form (background, border, padding); inactive, it's just the
         bare magnifier toggle. -->
    <div class="search-form" class:active>
        {#if active}
            <div class="field">
                <TextField
                    id="editor-search"
                    max="12em"
                    placeholder={(l) => l.ui.source.field.search}
                    description={(l) => l.ui.source.field.search}
                    bind:view={field}
                    bind:text={query}
                />
            </div>
        {/if}
        <div class="control">
            <Toggle
                tips={(l) => l.ui.source.toggle.search}
                on={active}
                toggle={() => (active = !active)}
                command={ToggleSearch}><Emoji text="🔍" /></Toggle
            >
        </div>
        <!-- The replace row only appears when there are matches to replace.
             Replacing typically removes all matches, so it disappears again. -->
        {#if active && matchCount > 0}
            <div class="field">
                <TextField
                    id="editor-replace"
                    max="12em"
                    placeholder={(l) => l.ui.source.field.replace}
                    description={(l) => l.ui.source.field.replace}
                    bind:view={replaceField}
                    bind:text={replacement}
                />
            </div>
            <div class="control">
                <Button
                    tip={(l) => l.ui.source.button.replace}
                    background
                    action={doReplace}>{CONFIRM_SYMBOL}</Button
                >
            </div>
        {/if}
    </div>
</div>

<style>
    /* .search-container only carries the pointer/keyboard handlers that isolate
       search interaction from the editor caret. Positioning and the visible
       bordered card are owned by the parent .editor-controls panel (in
       Editor.svelte), so this wrapper needs no styles of its own. */

    /* Two columns: fields | controls. Each row is field + control; the replace
       row's cells land in the same columns as the search row's, so the two
       fields right-align and the toggle/button right-align. The form grows down
       and to the left as the fields appear; the surrounding card grows with it. */
    .search-form {
        display: grid;
        grid-template-columns: auto auto;
        justify-content: end;
        align-items: center;
        gap: 0;
    }

    .search-form.active {
        gap: var(--wordplay-spacing);
    }

    /* Fields fill the left column; controls the right. justify-self: end
       right-aligns each cell within its column. */
    .field {
        grid-column: 1;
        justify-self: end;
    }

    .control {
        grid-column: 2;
        justify-self: end;
    }
</style>
