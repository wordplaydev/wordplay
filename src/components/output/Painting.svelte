<script lang="ts">
    import Switch from '@components/widgets/Switch.svelte';
    import { config } from '../../db/Creator';

    export let painting: boolean;
</script>

<Switch
    on={painting}
    toggle={(on) => (painting = on)}
    offTip={$config.getLocale().ui.description.place}
    onTip={$config.getLocale().ui.description.paint}
    offLabel="✥"
    onLabel="🖌️"
/>
