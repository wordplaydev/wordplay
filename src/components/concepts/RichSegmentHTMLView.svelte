<script lang="ts">
    /**
     * The markup segments that render code: examples, node references, and
     * values. They need the editor, the evaluator, and the output layer, which
     * together are most of the language runtime — so they live here, behind the
     * dynamic import in richSegment.ts, rather than in SegmentHTMLView. Every
     * page shows localized markup; only some of them show code.
     */
    import NodeRef from '@locale/NodeRef';
    import ValueRef from '@locale/ValueRef';
    import Example from '@nodes/Example';
    import type { Segment } from '@nodes/Paragraph';
    import UnknownType from '@nodes/UnknownType';
    import type Spaces from '@parser/Spaces';
    import RootView from '@components/project/RootView.svelte';
    import ValueView from '@components/values/ValueView.svelte';
    import ConceptPreview from '@components/concepts/ConceptPreview.svelte';
    import elideNode from '@components/concepts/elideNode';
    import ExampleUI from '@components/concepts/ExampleUI.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';

    interface Props {
        segment: Segment;
        spaces: Spaces;
        /** True if this is the only segment in a paragraph */
        alone: boolean;
    }

    let { segment, spaces, alone }: Props = $props();
</script>

{#if segment instanceof Example}{#if alone}<ExampleUI
            example={segment}
            {spaces}
            evaluated={alone}
        />
    {:else}<!-- An example inside a sentence is a quotation of code, not a
             program to edit, so it stays text however the viewer has set blocks
             mode — the same choice the NodeRef branch below already makes. A
             block's box chrome (border, padding, opaque background) cannot sit
             on a line of prose: a multi-line one is an atomic inline box that
             hangs below the baseline and blows the line open. An example that
             is alone in its paragraph still gets the full ExampleUI above, with
             its own blocks toggle. -->
        <ConceptPreview
            node={segment.program}
            inline={true}
            blocks={false}
            {spaces}
            outline={false}
            describe={false}
        />{/if}
{:else if segment instanceof NodeRef}{#if segment.node instanceof UnknownType}
        <MarkupHTMLView
            markup={segment.node.getDescription(
                segment.locales,
                segment.context,
            )}
            inline
        />
    {:else}
        {@const elision = elideNode(segment.node, segment.locales)}
        {#if elision}
            <!-- Render the elided preview (still as code, via RootView) and
                 append the localized "or N other options" suffix as markup. -->
            <RootView
                node={elision.preview}
                inline
                locale="symbolic"
                blocks={false}
            /><MarkupHTMLView markup={elision.suffix} inline />
        {:else}<RootView
                node={segment.node}
                inline
                locale="symbolic"
                blocks={false}
            />{/if}
    {/if}
{:else if segment instanceof ValueRef}<strong
        ><ValueView value={segment.value} /></strong
    >{/if}
