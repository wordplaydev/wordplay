<script lang="ts">
    import Switch from '@components/widgets/Switch.svelte';
    import { creator } from '../../db/Creator';

    export let painting: boolean;
</script>

<Switch
    on={painting}
    toggle={(on) => (painting = on)}
    offTip={$creator.getLocale().ui.description.place}
    onTip={$creator.getLocale().ui.description.paint}
    offLabel="✥"
    onLabel="🖌️"
/>
