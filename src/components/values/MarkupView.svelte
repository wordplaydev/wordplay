<script lang="ts">
    import type MarkupValue from '@values/MarkupValue';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';

    interface Props {
        value: MarkupValue;
        inline?: boolean;
    }

    let { value }: Props = $props();
</script>

<MarkupHtmlView {inline} markup={value.markup} />
