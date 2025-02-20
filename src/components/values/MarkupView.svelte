<script lang="ts">
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import type MarkupValue from '@values/MarkupValue';

    interface Props {
        value: MarkupValue;
        inline?: boolean;
    }

    let { value, inline }: Props = $props();
</script>

<MarkupHtmlView {inline} markup={value.markup} />
