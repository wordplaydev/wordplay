<!-- The tips for an option group, exposed to screen readers but not shown.

     Each option's button points at one of these with aria-describedby, so its
     accessible *name* stays the visible label (WCAG 2.5.3) while the tip is
     announced as its description. The visible tooltip (Hint) can't serve this
     purpose: it's role="presentation" and only exists while hovered or focused. -->
<script lang="ts">
    interface Props {
        /** Prefix of the ids the buttons reference: option i is `{id}-tip-{i}`. */
        id: string;
        /** One tip per option, in option order. */
        tips: readonly string[];
        /** Option indices not rendered, whose tips nothing references. */
        omit?: readonly number[];
    }

    let { id, tips, omit = [] }: Props = $props();
</script>

<div class="tips">
    {#each tips as tip, index}
        {#if !omit.includes(index)}
            <span id="{id}-tip-{index}">{tip}</span>
        {/if}
    {/each}
</div>

<style>
    /* Visually hidden but still in the accessibility tree, matching the
       technique used for ColorChooser's instructions. */
    .tips {
        clip-path: inset(50%);
        height: 1px;
        width: 1px;
        overflow: hidden;
        position: absolute;
        white-space: nowrap;
    }
</style>
