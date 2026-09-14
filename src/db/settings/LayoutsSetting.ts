import type { SerializedLayout } from '@components/project/Layout';
import { TileKind } from '@components/project/TileKind';
import Setting from '@db/settings/Setting';
import { z } from 'zod';

const BoundsSchema = z.object({
    left: z.number(),
    top: z.number(),
    width: z.number(),
    height: z.number(),
});

const TileKindSchema = z.enum([
    TileKind.Output,
    TileKind.Documentation,
    TileKind.Source,
    TileKind.Palette,
    TileKind.Collaborate,
]);

const AxisSchema = z.object({
    direction: z.enum(['x', 'y']),
    positions: z.array(
        z.object({
            id: z.array(TileKindSchema),
            position: z.number(),
            split: z.boolean().exactOptional(),
        }),
    ),
});

/** The shape of one stored layout, checked because a layout positions tiles
 *  by these numbers and a wrong-typed one would lay out nothing. */
const SerializedLayoutSchema = z.object({
    fullscreen: z.string().nullable(),
    tiles: z.array(
        z.object({
            id: z.string(),
            expanded: z.boolean(),
            bounds: BoundsSchema.nullable(),
            position: BoundsSchema,
            kind: TileKindSchema,
        }),
    ),
    splits: z
        .object({
            horizontal: z.array(AxisSchema).nullable(),
            vertical: z.array(AxisSchema).nullable(),
        })
        .nullable()
        .exactOptional(),
}) satisfies z.ZodType<SerializedLayout>;

const LayoutsSchema = z.record(z.string(), SerializedLayoutSchema);

export const LayoutsSetting = new Setting<Record<string, SerializedLayout>>(
    'layouts',
    true,
    {},
    (value) => {
        const result = LayoutsSchema.safeParse(value);
        return result.success ? result.data : undefined;
    },
    (current, value) => current === value,
);
