import { expect, test } from 'vitest';
import { appendKits, nextCursor } from './kitPaging';

test('a full page continues from its last document', () => {
    expect(
        nextCursor(
            [
                { updated: 3, id: 'a' },
                { updated: 2, id: 'b' },
            ],
            2,
        ),
    ).toEqual({ updated: 2, id: 'b' });
});

test('a short page is the end of the registry', () => {
    expect(nextCursor([{ updated: 3, id: 'a' }], 2)).toBeUndefined();
    expect(nextCursor([], 2)).toBeUndefined();
});

test('a page of unparseable documents still advances', () => {
    // Built from the raw documents, so a page the schema rejects doesn't leave the cursor
    // where it was — which would ask for that same page forever.
    expect(
        nextCursor(
            [
                { updated: 9, id: 'x' },
                { updated: 8, id: 'y' },
            ],
            2,
        ),
    ).toEqual({ updated: 8, id: 'y' });
});

test('a document with no usable time ends the run rather than looping', () => {
    expect(
        nextCursor(
            [
                { updated: 'soon', id: 'a' },
                { updated: null, id: 'b' },
            ],
            2,
        ),
    ).toBeUndefined();
});

test('a kit already shown is not shown twice', () => {
    // `updated` is mutable, so a kit republished mid-scroll can arrive on two pages.
    expect(
        appendKits([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }]),
    ).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
});

test('appending keeps what is already on screen where it is', () => {
    expect(appendKits([{ id: 'a' }], [{ id: 'b' }])).toEqual([
        { id: 'a' },
        { id: 'b' },
    ]);
});
