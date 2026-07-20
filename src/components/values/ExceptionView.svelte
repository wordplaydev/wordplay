<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import type ExceptionValue from '@values/ExceptionValue';

    interface Props {
        value: ExceptionValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();
</script>

! <MarkupHTMLView
    {inline}
    markup={{ perLocale: (l) => value.getExceptionDescription(l) }}
/>
