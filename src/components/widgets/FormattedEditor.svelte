<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { toShortcut } from '@components/editor/util/Commands';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import Button from './Button.svelte';
    import Switch from './Switch.svelte';
    import TextBox from './TextBox.svelte';

    interface Props {
        id: string;
        description: LocaleTextAccessor;
        placeholder: LocaleTextAccessor;
        view?: HTMLTextAreaElement | undefined;
        text: string;
    }

    let {
        id,
        description,
        placeholder,
        view = $bindable(undefined),
        text = $bindable(''),
    }: Props = $props();

    let preview = $state(false);

    function format(format: '*' | '^' | '/' | '_' | '\\' | '@') {
        if (view === undefined) return;
        const start = view.selectionStart;
        const end = view.selectionEnd;

        const before = text.slice(0, start);
        const selected = text.slice(start, end);
        const after = text.slice(end);
        let formatted = '';
        let cursorPos = 0;
        // Special case the link format.
        if (format === '@') {
            formatted = `${before}<${selected}@>${after}`;
            if (view) {
                cursorPos = start + 1 + selected.length + 1;
            }
        } else {
            formatted = `${before}${format}${selected}${format}${after}`;
            if (view) {
                cursorPos =
                    start + 1 + selected.length + (start === end ? 0 : 1);
                start + 1 + selected.length + (start === end ? 0 : 1);
            }
        }
        // Update the text box's text.
        text = formatted;

        // Update the cursor position.
        setTimeout(() => {
            view!.focus();
            view!.setSelectionRange(cursorPos, cursorPos);
        }, 0);
    }

    function handleKey(event: KeyboardEvent) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key.toLowerCase()) {
                case 'b':
                    event.preventDefault();
                    format('*');
                    break;
                case 'i':
                    event.preventDefault();
                    format('/');
                    break;
                case 'u':
                    event.preventDefault();
                    format('_');
                    break;
                case 'e':
                    event.preventDefault();
                    format('^');
                    break;
                case 'k':
                    event.preventDefault();
                    format('@');
                    break;
                case '\\':
                    event.preventDefault();
                    format('\\');
                    break;
            }
        }
    }
</script>

<div class="formatted-editor">
    <div class="toolbar">
        <Switch
            on={preview}
            offLabel="✏️"
            onLabel="👁️"
            offTip={(l) => l.ui.widget.formatted.edit}
            onTip={(l) => l.ui.widget.formatted.preview}
            toggle={(on: boolean) => (preview = on)}
        />
        <Button
            tip={() =>
                $locales.get((l) => l.token.Italic) +
                ` (${toShortcut({ control: true, alt: undefined, shift: undefined, key: 'i' })})`}
            action={() => format('/')}
            ><em style="font-family: 'Noto Sans'">I</em></Button
        >
        <Button
            tip={() =>
                $locales.get((l) => l.token.Bold) +
                ` (${toShortcut({ control: true, alt: undefined, shift: undefined, key: 'b' })})`}
            action={() => format('*')}
            ><strong style="font-family: 'Noto Sans'">B</strong></Button
        >
        <Button
            tip={() =>
                $locales.get((l) => l.token.Extra) +
                ` (${toShortcut({ control: true, alt: undefined, shift: undefined, key: 'e' })})`}
            action={() => format('^')}
            ><strong style="font-family: 'Noto Sans'; font-weight: 900"
                >B</strong
            ></Button
        >
        <Button
            tip={() =>
                $locales.get((l) => l.token.Underline) +
                ` (${toShortcut({ control: true, alt: undefined, shift: undefined, key: 'u' })})`}
            action={() => format('_')}
            ><u style="font-family: 'Noto Sans'">U</u></Button
        >
        <Button
            tip={() =>
                $locales.get((l) => l.token.Code) +
                ` (${toShortcut({ control: true, alt: undefined, shift: undefined, key: '\\' })})`}
            action={() => format('\\')}><code>\\</code></Button
        >
        <Button
            tip={() =>
                $locales.get((l) => l.token.Link) +
                ` (${toShortcut({ control: true, alt: undefined, shift: undefined, key: 'k' })})`}
            action={() => format('@')}><Emoji>🔗</Emoji></Button
        >
    </div>
    {#if preview}
        <div class="preview">
            <MarkupHTMLView markup={text} />
        </div>
    {:else}
        <TextBox
            {id}
            {placeholder}
            {description}
            onkeydown={handleKey}
            bind:view
            bind:text
        />
    {/if}
</div>

<style>
    .formatted-editor {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .toolbar {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        padding-bottom: var(--wordplay-spacing);
        border-bottom: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }

    .preview {
        min-height: 2.25em;
        margin-inline-start: 1em;
    }
</style>
