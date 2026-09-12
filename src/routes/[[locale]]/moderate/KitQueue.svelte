<!-- Kits asking to be listed in the guide (#8).

     The decision and its chrome are `ModerationQueue`'s; what is here is the kit itself.
     Without this queue nothing could ever reach `moderation: 'approved'`, which is half
     of what the registry query requires. -->
<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import { KitSchema, upgradeKit } from '@db/kits/Kit';
    import { KitsCollection } from '@db/kits/KitDatabase.svelte';
    import KitCode from './KitCode.svelte';
    import ModerationQueue from './ModerationQueue.svelte';
</script>

<ModerationQueue
    kind="kit"
    collectionName={KitsCollection}
    order={{ field: 'updated', descending: true }}
    parse={(data) => {
        const parsed = KitSchema.safeParse(data);
        return parsed.success ? upgradeKit(parsed.data) : undefined;
    }}
    idOf={(kit) => kit.id}
    text={{
        header: (l) => l.moderation.kit.header,
        done: (l) => l.moderation.kit.done,
        explain: (l) => l.moderation.kit.explain,
        approve: {
            tip: (l) => l.moderation.kit.approve.tip,
            label: (l) => l.moderation.kit.approve.label,
        },
        deny: {
            tip: (l) => l.moderation.kit.deny.tip,
            label: (l) => l.moderation.kit.deny.label,
        },
        skip: {
            tip: (l) => l.moderation.kit.skip.tip,
            label: (l) => l.moderation.kit.skip.label,
        },
    }}
>
    {#snippet content(kit)}
        <Subheader wrap>{kit.name}</Subheader>
        <p>{kit.description}</p>
        <KitCode {kit} />
    {/snippet}
</ModerationQueue>
