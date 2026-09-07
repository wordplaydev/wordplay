<script lang="ts">
    import type WebLink from '@nodes/WebLink';
    import { getCaret } from '@components/project/Contexts';
    import linkHref from '@parser/linkHref';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: WebLink;
        format: Format;
    }

    let { node, format }: Props = $props();

    let caret = getCaret();
    /**
     * Show the raw `<…@…>` tokens when the caret is inside — and always in the
     * markup editor, in both of its modes. `format.prose` is absent everywhere
     * else, so code and read-only docs keep rendering the link, which is what
     * they have always done.
     *
     * The markup editor renders the tokens even in prose mode, and hides the
     * ones that aren't the description through its own hidden-token set
     * (`markupHidden.ts`), revealing them at the caret like any other delimiter.
     * An anchor cannot work there: it swallows the pointerdown that places the
     * caret, so a link was a hole in the prose that could never be entered or
     * edited, and it is a Tab stop inside `role="application"`.
     */
    let editing = $derived(
        $caret?.isIn(node, true) === true ||
            (format.prose !== undefined && format.editable),
    );
    // Undefined for a scheme documentation has no business linking to; the
    // description then renders as plain text, the same as in the guide.
    let href = $derived(node.url ? linkHref(node.url.getText()) : undefined);
</script>

{#if editing}
    <!-- In prose the link is not an anchor, so it needs to LOOK like one: without
         this a link read as ordinary text, and the only thing distinguishing it
         was the markup the editor hides. The delimiters are styled too, so a
         revealed link reads as one run rather than as prose with symbols in it. -->
    <span class="weblink" class:prose={format.prose === true}
        ><NodeView node={[node, 'open']} {format} /><NodeView
            node={[node, 'description']}
            {format}
        /><NodeView node={[node, 'at']} {format} /><NodeView
            node={[node, 'url']}
            {format}
        /><NodeView node={[node, 'close']} {format} /></span
    >
{:else}
    <!-- Stop pointerdown so the editor doesn't place the caret and re-render the anchor away before the click navigates. -->
    {#if href !== undefined}
        <a
            {href}
            target="_blank"
            rel="noreferrer"
            onpointerdown={(event) => event.stopPropagation()}
            >{node.description?.getText() ?? ''}</a
        >
    {:else}{node.description?.getText() ?? ''}{/if}
{/if}

<style>
    .weblink.prose :global(.token-view) {
        color: var(--wordplay-link-color);
        text-decoration: underline;
    }
</style>
