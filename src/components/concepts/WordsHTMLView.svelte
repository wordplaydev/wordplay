<script lang="ts">
    import type Words from '../../nodes/Words';
    import type Spaces from '../../parser/Spaces';
    import SegmentHTMLView from './SegmentHTMLView.svelte';

    interface Props {
        words: Words;
        spaces: Spaces;
    }

    let { words, spaces }: Props = $props();
</script>

<span class={words.getFormat()}
    >{#each words.segments as segment}<SegmentHTMLView
            {segment}
            {spaces}
            alone={false}
        />{/each}</span
>

<style>
    .italic {
        font-style: italic;
    }
    .underline {
        text-decoration: underline;
    }
    .light {
        font-weight: 300;
    }
    .bold {
        font-weight: bold;
    }
    .extra {
        font-weight: 700;
    }
</style>
