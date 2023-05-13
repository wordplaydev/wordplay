<script lang="ts">
    import Switch from '@components/widgets/Switch.svelte';
    import { creator } from '../../db/Creator';

    export let painting: boolean;
</script>

<Switch
    on={painting}
    toggle={(on) => (painting = on)}
    offTip={$creator.getLocale().ui.tooltip.place}
    onTip={$creator.getLocale().ui.tooltip.paint}
    offLabel="✥"
    onLabel="🖌️"
/>
