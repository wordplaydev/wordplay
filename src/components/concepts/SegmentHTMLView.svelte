<script lang="ts">
    import ConceptLink from '../../nodes/ConceptLink';
    import Token from '../../nodes/Token';
    import WebLink from '../../nodes/WebLink';
    import Words from '../../nodes/Words';
    import type Spaces from '../../parser/Spaces';
    import WebLinkHTMLView from './WebLinkHTMLView.svelte';
    import ConceptLinkUI from './ConceptLinkUI.svelte';
    import Example from '../../nodes/Example';
    import ExampleUI from './ExampleUI.svelte';
    import NodeRef from '../../locale/NodeRef';
    import NodeView from '../editor/NodeView.svelte';
    import ValueRef from '../../locale/ValueRef';
    import ValueView from '../values/ValueView.svelte';
    import ConceptRef from '../../locale/ConceptRef';
    import type { Segment } from '../../nodes/Paragraph';
    import WordsHTMLView from './WordsHTMLView.svelte';

    export let segment: Segment;
    export let spaces: Spaces;
</script>

{#if segment instanceof WebLink}<WebLinkHTMLView
        link={segment}
        {spaces}
    />{:else if segment instanceof Example}<ExampleUI
        example={segment}
        {spaces}
        evaluated={false}
        inline={true}
    />{:else if segment instanceof ConceptLink}<ConceptLinkUI
        link={segment}
    />{:else if segment instanceof Words}<WordsHTMLView
        words={segment}
        {spaces}
    />{:else if segment instanceof NodeRef}<NodeView
        node={segment.node}
    />{:else if segment instanceof ValueRef}<strong
        ><ValueView value={segment.value} /></strong
    >{:else if segment instanceof ConceptRef}<ConceptLinkUI
        link={segment}
    />{:else if segment instanceof Token}{#if spaces.getSpace(segment).length > 0}&nbsp;{/if}{segment
        .getText()
        .replaceAll('--', '—')}{/if}
