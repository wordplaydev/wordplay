<script lang="ts">
    import MarkupHtmlView from '#components/concepts/MarkupHTMLView.svelte';
    import type MarkupValue from '#values/MarkupValue.ts';

    interface Props {
        value: MarkupValue;
        inline?: boolean;
    }

    let { value, inline = false }: Props = $props();
</script>

<MarkupHtmlView {inline} markup={value.markup} />
