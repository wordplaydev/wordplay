<!--
  The code a message is about, shown in the message (#820).

  Written as the line numbers the reader can see — "line 4", "lines 3–5" —
  rather than as anything about the syntax tree, because line numbers are what a
  beginner can find. Those numbers are worked out from where the code is *now*,
  so a reference stays true after the lines above it change, and reads as stale
  exactly when the code it named has really gone.

  The resolution itself is handed in rather than done here: the project view has
  to resolve every reference anyway, to know which lines carry a gutter marker,
  and resolving is not free enough to do twice on every keystroke.
-->
<script lang="ts">
    import { getEditors } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type { SerializedCodeReference } from '@db/chats/ChatDatabase.svelte';
    import {
        referenceLabel,
        type ResolvedReference,
    } from '@db/chats/codeReference';
    import { locales } from '@db/Database';
    import Layout from '@components/project/Layout';

    interface Props {
        /** What the message stored, for the file the reveal has to open. */
        reference: SerializedCodeReference;
        /** Where it points now, resolved once by the project view. Undefined
         *  before the first resolution has arrived, which reads the same as
         *  gone — both say the chip leads nowhere yet. */
        resolved: ResolvedReference | undefined;
    }

    let { reference, resolved }: Props = $props();

    let label = $derived(
        resolved?.state === 'valid'
            ? referenceLabel($locales, resolved.firstLine, resolved.lastLine)
            : undefined,
    );

    /** The code as it reads now, short enough to sit in a tooltip. The name
     *  alone says where; this says what, without making the reader go and
     *  look. */
    let code = $derived.by(() => {
        if (resolved?.state !== 'valid') return '';
        const text = resolved.node.toWordplay();
        return text.length > 40 ? `${text.slice(0, 40)}…` : text;
    });

    /** Take the reader to the code. Selecting it is what opens the message
     *  beside it in the editor, so following a reference and clicking the
     *  highlighted code arrive at the same place. */
    function reveal() {
        if (resolved?.state !== 'valid' || editors === undefined) return;
        const editor = $editors?.get(Layout.getSourceID(reference.source));
        if (editor === undefined) return;
        editor.revealNode(resolved.node);
        editor.setCaretPosition(resolved.node);
    }

    const editors = getEditors();
</script>

{#if resolved?.state === 'valid' && label !== undefined}
    <Button
        tip={() =>
            $locales
                .concretize((l) => l.ui.collaborate.reference.label, {
                    location: label,
                    code,
                })
                .toText()}
        action={reveal}><span class="valid">{label}</span></Button
    >
{:else}
    <span class="gone"
        ><LocalizedText
            path={(l) => l.ui.collaborate.reference.invalid}
        /></span
    >
{/if}

<style>
    .valid {
        color: var(--color-gold-text);
        font-weight: bold;
        white-space: nowrap;
    }

    /* A reference nobody can follow any more. Struck through rather than
       hidden: the message still says something, and the strike is what tells
       the reader why it no longer points anywhere. */
    .gone {
        color: var(--wordplay-inactive-color);
        text-decoration: line-through;
        font-size: var(--wordplay-small-font-size);
    }
</style>
