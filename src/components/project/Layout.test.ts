import Layout from '@components/project/Layout';
import Tile, { TileMode } from '@components/project/Tile';
import { TileKind } from '@components/project/TileKind';
import Arrangement from '@db/settings/Arrangement';
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
        expect(laidOut(layout.resized(Arrangement.Single, 400, 800))).toEqual(
            layout.getVisibleTiles(Arrangement.Single).map((t) => t.id),
        );
    });

    test('split lays out exactly the tiles getVisibleTiles names', () => {
        const layout = layoutOf(source, output, docs, palette);
        expect(laidOut(layout.resized(Arrangement.Split, 400, 800))).toEqual(
            layout.getVisibleTiles(Arrangement.Split).map((t) => t.id),
        );
    });
});

describe('switching which tile is showing', () => {
    /** Split gives the top/left pane to the earlier of the two tiles, so the order of
     *  `tiles` is what decides pane placement, not just which two are on screen. */
    test('split places the earlier tile in the first pane', () => {
        const laid = layoutOf(source, output, docs, palette).resized(
            Arrangement.Split,
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
            400,
            800,
        );
        const hidden = laid.getTileWithID(Layout.getSourceID(0));
        if (hidden === undefined) throw new Error('Expected a source tile.');

        const switched = laid
            .withTileLast(hidden.withMode(TileMode.Expanded))
            .resized(Arrangement.Single, 400, 800);

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
