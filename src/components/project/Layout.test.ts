import Layout, { mirrorAxes, type Axis } from '@components/project/Layout';
import Tile, { TileMode } from '@components/project/Tile';
import { TileKind } from '@components/project/TileKind';
import Arrangement from '@db/settings/Arrangement';
import StagePlacement, {
    StagePlacementOrder,
} from '@db/settings/StagePlacement';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import DefaultLocale from '@locale/DefaultLocale';
import { describe, expect, test } from 'vitest';

const Position = { left: 0, top: 0, width: 100, height: 100 };

function tile(id: string, kind: TileKind, mode: TileMode = TileMode.Expanded) {
    return new Tile(id, kind, mode, undefined, Position);
}

/** Source, output, docs, palette — in the order a layout holds them, which is what
 *  decides visibility in the one- and two-tile arrangements. */
function layoutOf(...tiles: Tile[]) {
    return new Layout('test', tiles, undefined, null);
}

const source = tile(Layout.getSourceID(0), TileKind.Source);
const output = tile(TileKind.Output, TileKind.Output);
const docs = tile(TileKind.Documentation, TileKind.Documentation);
const palette = tile(TileKind.Palette, TileKind.Palette);

describe('getVisibleTiles', () => {
    test('single shows only the last expanded tile', () => {
        expect(
            layoutOf(source, output, docs)
                .getVisibleTiles(Arrangement.Single)
                .map((t) => t.id),
        ).toEqual([TileKind.Documentation]);
    });

    test('split shows the last two expanded tiles', () => {
        expect(
            layoutOf(source, output, docs)
                .getVisibleTiles(Arrangement.Split)
                .map((t) => t.id),
        ).toEqual([TileKind.Output, TileKind.Documentation]);
    });

    test('other arrangements show every expanded tile', () => {
        expect(
            layoutOf(source, output, docs)
                .getVisibleTiles(Arrangement.Vertical)
                .map((t) => t.id),
        ).toEqual([
            Layout.getSourceID(0),
            TileKind.Output,
            TileKind.Documentation,
        ]);
    });

    test('collapsed tiles are never visible', () => {
        expect(
            layoutOf(
                source,
                output,
                tile(
                    TileKind.Documentation,
                    TileKind.Documentation,
                    TileMode.Collapsed,
                ),
            )
                .getVisibleTiles(Arrangement.Single)
                .map((t) => t.id),
        ).toEqual([TileKind.Output]);
    });

    test('nothing expanded means nothing visible', () => {
        expect(
            layoutOf(
                tile(TileKind.Output, TileKind.Output, TileMode.Collapsed),
            ).getVisibleTiles(Arrangement.Single),
        ).toEqual([]);
    });
});

describe('agreement with the arrangements themselves', () => {
    /** The tiles an arrangement actually gave space to, which is what the tile row's
     *  "is this tile on screen" question ultimately means. */
    function laidOut(layout: Layout) {
        return layout.tiles
            .filter(
                (t) => t.bounds && t.bounds.width > 0 && t.bounds.height > 0,
            )
            .map((t) => t.id);
    }

    test('single lays out exactly the tile getVisibleTiles names', () => {
        const layout = layoutOf(source, output, docs, palette);
        expect(
            laidOut(
                layout.resized(
                    Arrangement.Single,
                    StagePlacement.TopRight,
                    400,
                    800,
                ),
            ),
        ).toEqual(layout.getVisibleTiles(Arrangement.Single).map((t) => t.id));
    });

    test('split lays out exactly the tiles getVisibleTiles names', () => {
        const layout = layoutOf(source, output, docs, palette);
        expect(
            laidOut(
                layout.resized(
                    Arrangement.Split,
                    StagePlacement.TopRight,
                    400,
                    800,
                ),
            ),
        ).toEqual(layout.getVisibleTiles(Arrangement.Split).map((t) => t.id));
    });
});

describe('switching which tile is showing', () => {
    /** Split gives the top/left pane to the earlier of the two tiles, so the order of
     *  `tiles` is what decides pane placement, not just which two are on screen. */
    test('split places the earlier tile in the first pane', () => {
        const laid = layoutOf(source, output, docs, palette).resized(
            Arrangement.Split,
            StagePlacement.TopRight,
            400,
            800,
        );
        const [first, second] = laid.getVisibleTiles(Arrangement.Split);
        expect(laid.getTileWithID(first.id)?.bounds?.top).toBe(0);
        expect(laid.getTileWithID(second.id)?.bounds?.top).toBe(400);
    });

    test('a hidden tile becomes the only one shown in single', () => {
        const laid = layoutOf(source, output, docs, palette).resized(
            Arrangement.Single,
            StagePlacement.TopRight,
            400,
            800,
        );
        const hidden = laid.getTileWithID(Layout.getSourceID(0));
        if (hidden === undefined) throw new Error('Expected a source tile.');

        const switched = laid
            .withTileLast(hidden.withMode(TileMode.Expanded))
            .resized(Arrangement.Single, StagePlacement.TopRight, 400, 800);

        expect(
            switched.getVisibleTiles(Arrangement.Single).map((t) => t.id),
        ).toEqual([hidden.id]);
        expect(switched.getTileWithID(hidden.id)?.bounds).toEqual({
            left: 0,
            top: 0,
            width: 400,
            height: 800,
        });
    });
});

describe('stage placement', () => {
    const collaborate = tile(TileKind.Collaborate, TileKind.Collaborate);
    const Width = 1000;
    const Height = 800;

    /** Every tile, so both columns and both rows are occupied. */
    function full() {
        return layoutOf(source, output, docs, palette, collaborate);
    }

    function boundsOf(layout: Layout, id: string) {
        const bounds = layout.getTileWithID(id)?.bounds;
        if (bounds === undefined) throw new Error(`No bounds for ${id}.`);
        return bounds;
    }

    /** Which half of the canvas a tile's center falls in, on each axis. */
    function corner(layout: Layout, kind: TileKind) {
        const bounds = boundsOf(layout, kind);
        return {
            top: bounds.top + bounds.height / 2 < Height / 2,
            left: bounds.left + bounds.width / 2 < Width / 2,
        };
    }

    const Corners = {
        [StagePlacement.TopLeft]: { top: true, left: true },
        [StagePlacement.TopRight]: { top: true, left: false },
        [StagePlacement.BottomLeft]: { top: false, left: true },
        [StagePlacement.BottomRight]: { top: false, left: false },
    };

    /** Where each other tile sits relative to the stage, per arrangement. In
     *  both, collaborate is diagonally opposite the stage, and the guide and
     *  the palette each share one of its edges — which one is what differs. */
    const Neighbors = {
        [Arrangement.Horizontal]: {
            [TileKind.Palette]: { top: false, left: true },
            [TileKind.Documentation]: { top: true, left: false },
            [TileKind.Collaborate]: { top: false, left: false },
        },
        [Arrangement.Vertical]: {
            [TileKind.Palette]: { top: true, left: false },
            [TileKind.Documentation]: { top: false, left: true },
            [TileKind.Collaborate]: { top: false, left: false },
        },
    };

    for (const arrangement of [
        Arrangement.Horizontal,
        Arrangement.Vertical,
    ] as const) {
        for (const placement of StagePlacementOrder) {
            test(`${arrangement} puts the stage ${placement}`, () => {
                const laid = full().resized(
                    arrangement,
                    placement,
                    Width,
                    Height,
                );
                const stage = Corners[placement];
                expect(corner(laid, TileKind.Output)).toEqual(stage);

                // Every other tile keeps its relationship to the stage, since
                // they are all mirrored together.
                for (const [kind, shares] of Object.entries(
                    Neighbors[arrangement],
                )) {
                    expect(corner(laid, kind as TileKind)).toEqual({
                        top: shares.top === stage.top,
                        left: shares.left === stage.left,
                    });
                }

                // The source tile is always in the middle of the arrangement's
                // long axis, whatever the placement.
                const code = boundsOf(laid, Layout.getSourceID(0));
                const start =
                    arrangement === Arrangement.Horizontal
                        ? code.left
                        : code.top;
                const end =
                    arrangement === Arrangement.Horizontal
                        ? code.left + code.width
                        : code.top + code.height;
                expect(start).toBeGreaterThan(0);
                expect(end).toBeLessThan(
                    arrangement === Arrangement.Horizontal ? Width : Height,
                );
            });
        }
    }

    test('the default placement leaves the row arrangement as it has always been', () => {
        const laid = full().resized(
            Arrangement.Horizontal,
            StagePlacement.TopRight,
            Width,
            Height,
        );
        expect(boundsOf(laid, TileKind.Documentation)).toEqual({
            left: 0,
            top: 0,
            width: 0.25 * Width,
            height: 0.5 * Height,
        });
        const stage = boundsOf(laid, TileKind.Output);
        expect(stage.left).toBe(0.7 * Width);
        expect(stage.top).toBe(0);
        // The remainder of the axis, which onAxes has always computed with the
        // floating point dust that leaves.
        expect(stage.width).toBeCloseTo(0.3 * Width);
        expect(stage.height).toBe(0.5 * Height);
    });

    test('the stack arrangement mirrors horizontally by default', () => {
        // Its canonical splits put the stage top left, so the default
        // placement (top right) is a mirrored one.
        const laid = full().resized(
            Arrangement.Vertical,
            StagePlacement.TopRight,
            Width,
            Height,
        );
        expect(boundsOf(laid, TileKind.Output).left).toBe(0.5 * Width);
        expect(boundsOf(laid, TileKind.Palette).left).toBe(0);
        expect(boundsOf(laid, TileKind.Documentation).left).toBe(0.5 * Width);
        expect(boundsOf(laid, TileKind.Collaborate).left).toBe(0);
    });

    test('mirroring an axis twice returns it to where it was', () => {
        const axes: Axis[] = [
            {
                direction: 'x',
                positions: [
                    { id: [TileKind.Documentation], position: 0 },
                    { id: [TileKind.Source], position: 0.25, split: true },
                    { id: [TileKind.Output], position: 0.7 },
                ],
            },
        ];
        expect(mirrorAxes(mirrorAxes(axes, true, false), true, false)).toEqual(
            axes,
        );
    });

    test('mirroring reverses the groups and complements their positions', () => {
        const axes: Axis[] = [
            {
                direction: 'x',
                positions: [
                    { id: [TileKind.Documentation], position: 0 },
                    { id: [TileKind.Source], position: 0.25, split: true },
                    { id: [TileKind.Output], position: 0.7 },
                ],
            },
        ];
        expect(mirrorAxes(axes, true, false)).toEqual([
            {
                direction: 'x',
                positions: [
                    { id: [TileKind.Output], position: 0 },
                    { id: [TileKind.Source], position: 0.3, split: true },
                    { id: [TileKind.Documentation], position: 0.75 },
                ],
            },
        ]);
        // A y axis is untouched by a horizontal mirror.
        expect(
            mirrorAxes([{ ...axes[0], direction: 'y' }], true, false),
        ).toEqual([{ ...axes[0], direction: 'y' }]);
    });

    test('a split dragged under a mirrored placement lands where it was dragged', () => {
        const laid = full();
        // The x axis of the row arrangement, whose second group is the source.
        const axisIndex = 1;
        const groupIndex = 1;
        const split = 0.4;
        const adjusted = laid.withSplit(
            Arrangement.Horizontal,
            StagePlacement.TopLeft,
            axisIndex,
            groupIndex,
            split,
            Width,
            Height,
        );
        // What's shown is what was dragged...
        expect(
            adjusted.getSplits(
                Arrangement.Horizontal,
                StagePlacement.TopLeft,
                Width,
                Height,
            )?.[axisIndex].positions[groupIndex].position,
        ).toBe(split);
        // ...while what's stored is its mirror, at the reflected index, so the
        // same project read at the default placement is unmirrored.
        expect(
            adjusted.splits?.horizontal?.[axisIndex].positions[2].position,
        ).toBeCloseTo(1 - split);
    });

    test('a collapsed group gives its space to the group after it, mirrored', () => {
        const laid = layoutOf(
            source,
            output,
            palette,
            tile(
                TileKind.Documentation,
                TileKind.Documentation,
                TileMode.Collapsed,
            ),
            tile(
                TileKind.Collaborate,
                TileKind.Collaborate,
                TileMode.Collapsed,
            ),
        ).resized(
            Arrangement.Horizontal,
            StagePlacement.TopLeft,
            Width,
            Height,
        );
        // With the guide column hidden and the stage column mirrored to the
        // left, the source starts where the stage column ends and runs to the
        // end of the canvas.
        expect(boundsOf(laid, TileKind.Output).left).toBe(0);
        expect(boundsOf(laid, Layout.getSourceID(0))).toEqual({
            left: 0.3 * Width,
            top: 0,
            width: 0.7 * Width,
            height: Height,
        });
    });
});

describe('source views', () => {
    const Width = 1000;
    const Height = 800;
    const collaborate = tile(TileKind.Collaborate, TileKind.Collaborate);
    const viewID = Layout.getSourceViewID(0, 1);
    const view = tile(viewID, TileKind.Source);

    function boundsOf(layout: Layout, id: string) {
        const bounds = layout.getTileWithID(id)?.bounds;
        if (bounds === undefined) throw new Error(`No bounds for ${id}.`);
        return bounds;
    }

    describe('ids', () => {
        test('view 0 is the source tile itself', () => {
            expect(Layout.getSourceViewID(0, 0)).toBe(Layout.getSourceID(0));
            expect(Layout.getSourceViewID(3, 0)).toBe(Layout.getSourceID(3));
        });

        test('a view id names its view', () => {
            expect(Layout.getSourceViewID(0, 1)).toBe('source0.1');
            expect(Layout.getSourceViewID(10, 2)).toBe('source10.2');
        });

        test('only a view id is a view id', () => {
            expect(Layout.isSourceViewID('source0.1')).toBe(true);
            expect(Layout.isSourceViewID('source0')).toBe(false);
            expect(Layout.isSourceViewID(TileKind.Output)).toBe(false);
            expect(Layout.isSourceViewID('source0.1.2')).toBe(false);
        });

        test('the source index parses out of both forms', () => {
            expect(Layout.getSourceIndexFromID('source0')).toBe(0);
            expect(Layout.getSourceIndexFromID('source10')).toBe(10);
            expect(Layout.getSourceIndexFromID('source10.1')).toBe(10);
        });

        test('a non-source id has no source index', () => {
            expect(
                Layout.getSourceIndexFromID(TileKind.Output),
            ).toBeUndefined();
            expect(
                Layout.getSourceIndexFromID(TileKind.Documentation),
            ).toBeUndefined();
            expect(Layout.getSourceIndexFromID('source')).toBeUndefined();
            expect(Layout.getSourceIndexFromID('source0.1.2')).toBeUndefined();
        });
    });

    /* The claim the whole approach rests on: a layout group is addressed by tile
       KIND and a `split: true` group divides its own band among its tiles, so a
       second source tile takes half the source band and moves nothing else. If
       this regresses, an extra view tile is no longer a free way to split. */
    describe('a view only subdivides the source band', () => {
        for (const arrangement of [
            Arrangement.Horizontal,
            Arrangement.Vertical,
        ] as const) {
            test(`${arrangement} leaves every other tile where it was`, () => {
                const without = layoutOf(
                    source,
                    output,
                    docs,
                    palette,
                    collaborate,
                ).resized(arrangement, StagePlacement.TopRight, Width, Height);
                const with_ = layoutOf(
                    source,
                    view,
                    output,
                    docs,
                    palette,
                    collaborate,
                ).resized(arrangement, StagePlacement.TopRight, Width, Height);

                for (const kind of [
                    TileKind.Output,
                    TileKind.Documentation,
                    TileKind.Palette,
                    TileKind.Collaborate,
                ]) {
                    expect(boundsOf(with_, kind)).toEqual(
                        boundsOf(without, kind),
                    );
                }
            });

            test(`${arrangement} halves the source band between the two views`, () => {
                const band = boundsOf(
                    layoutOf(
                        source,
                        output,
                        docs,
                        palette,
                        collaborate,
                    ).resized(
                        arrangement,
                        StagePlacement.TopRight,
                        Width,
                        Height,
                    ),
                    Layout.getSourceID(0),
                );
                const laid = layoutOf(
                    source,
                    view,
                    output,
                    docs,
                    palette,
                    collaborate,
                ).resized(arrangement, StagePlacement.TopRight, Width, Height);
                const first = boundsOf(laid, Layout.getSourceID(0));
                const second = boundsOf(laid, viewID);

                // The two views together cover exactly the band one view had,
                // split on the axis the source group splits on.
                if (arrangement === Arrangement.Horizontal) {
                    expect(first.width).toBe(band.width / 2);
                    expect(second.width).toBe(band.width / 2);
                    expect(first.left).toBe(band.left);
                    expect(second.left).toBe(band.left + band.width / 2);
                    expect(first.height).toBe(band.height);
                } else {
                    expect(first.height).toBe(band.height / 2);
                    expect(second.height).toBe(band.height / 2);
                    expect(first.top).toBe(band.top);
                    expect(second.top).toBe(band.top + band.height / 2);
                    expect(first.width).toBe(band.width);
                }
            });
        }
    });

    describe('withTileAfter', () => {
        test('places the view directly after its source', () => {
            expect(
                layoutOf(source, output, docs)
                    .withTileAfter(Layout.getSourceID(0), view)
                    .tiles.map((t) => t.id),
            ).toEqual([
                Layout.getSourceID(0),
                viewID,
                TileKind.Output,
                TileKind.Documentation,
            ]);
        });

        test('appends when there is no such tile', () => {
            expect(
                layoutOf(output, docs)
                    .withTileAfter(Layout.getSourceID(0), view)
                    .tiles.map((t) => t.id),
            ).toEqual([TileKind.Output, TileKind.Documentation, viewID]);
        });
    });

    describe('withoutSourceViews', () => {
        test('drops view tiles and keeps the rest', () => {
            expect(
                layoutOf(source, view, output)
                    .withoutSourceViews()
                    .tiles.map((t) => t.id),
            ).toEqual([Layout.getSourceID(0), TileKind.Output]);
        });

        test('is the same layout when there are no views', () => {
            const layout = layoutOf(source, output);
            expect(layout.withoutSourceViews()).toBe(layout);
        });

        test('clears a fullscreen naming a view, and keeps one that does not', () => {
            expect(
                layoutOf(source, view, output)
                    .withFullscreen(viewID)
                    .withoutSourceViews().fullscreenID,
            ).toBeUndefined();
            expect(
                layoutOf(source, view, output)
                    .withFullscreen(TileKind.Output)
                    .withoutSourceViews().fullscreenID,
            ).toBe(TileKind.Output);
        });
    });

    /* The two-tile arrangement picks by recency, so a view merely inserted after
       its source displaces the source itself — you would split a file and stop
       seeing the thing you split. */
    test('an unraised view displaces its own source in the two-tile arrangement', () => {
        expect(
            layoutOf(source, view, output)
                .getVisibleTiles(Arrangement.Split)
                .map((t) => t.id),
        ).toEqual([viewID, TileKind.Output]);
    });

    /* Which is why splitting raises both, source first, making them exactly the
       pair that arrangement shows and in the order the other arrangements use.
       This is the claim offering the split on a small window rests on. */
    test('both views raised last are the two the arrangement shows', () => {
        expect(
            layoutOf(output, source, view)
                .getVisibleTiles(Arrangement.Split)
                .map((t) => t.id),
        ).toEqual([Layout.getSourceID(0), viewID]);
    });

    /* One tile can never show two views, which is the one arrangement the
       control stays hidden in. */
    test('the one-tile arrangement shows only one of them', () => {
        expect(
            layoutOf(output, source, view)
                .getVisibleTiles(Arrangement.Single)
                .map((t) => t.id),
        ).toEqual([viewID]);
    });
});

describe('Tile.getSource', () => {
    const main = new Source('main', '1');
    const other = new Source('other', '2');
    const project = Project.make(null, 'test', main, [other], DefaultLocale);

    test('a source tile resolves its own source', () => {
        expect(
            tile(Layout.getSourceID(0), TileKind.Source).getSource(project),
        ).toBe(main);
        expect(
            tile(Layout.getSourceID(1), TileKind.Source).getSource(project),
        ).toBe(other);
    });

    /* A view that resolved to nothing would be silently deleted on every
       syncTiles pass, since it drops any source tile with no source. */
    test('a view tile resolves the same source as its primary', () => {
        expect(
            tile(Layout.getSourceViewID(0, 1), TileKind.Source).getSource(
                project,
            ),
        ).toBe(main);
        expect(
            tile(Layout.getSourceViewID(1, 1), TileKind.Source).getSource(
                project,
            ),
        ).toBe(other);
    });

    test('a tile naming no source resolves nothing', () => {
        expect(
            tile(TileKind.Output, TileKind.Output).getSource(project),
        ).toBeUndefined();
        expect(
            tile(Layout.getSourceID(9), TileKind.Source).getSource(project),
        ).toBeUndefined();
    });
});
