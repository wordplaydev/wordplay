<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type ExceptionValue from '@values/ExceptionValue';

    interface Props {
        value: ExceptionValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();
</script>

{#if inline || !inline}
    ! <LocalizedText path={value.getDescription()} />
{/if}
