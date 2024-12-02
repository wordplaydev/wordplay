<script lang="ts">
    import type MarkupValue from '@values/MarkupValue';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';

    interface Props {
        value: MarkupValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();
</script>

<MarkupHTMLView markup={value.markup} {inline} />
