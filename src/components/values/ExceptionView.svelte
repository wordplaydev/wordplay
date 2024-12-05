<script lang="ts">
    import type ExceptionValue from '@values/ExceptionValue';
    import { locales } from '../../db/Database';

    interface Props {
        value: ExceptionValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();
</script>

{#if inline || !inline}
    ! {value.getDescription($locales).toText()}
{/if}
