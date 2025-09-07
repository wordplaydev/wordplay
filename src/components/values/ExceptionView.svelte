<script lang="ts">
    import concretize from '@locale/concretize';
    import type ExceptionValue from '@values/ExceptionValue';
    import { locales } from '../../db/Database';

    interface Props {
        value: ExceptionValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();
</script>

{#if inline || !inline}
    ! {concretize($locales, $locales.get(value.getDescription())).toText()}
{/if}
