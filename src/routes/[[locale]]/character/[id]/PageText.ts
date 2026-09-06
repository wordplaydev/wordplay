import type { FormattedText, Template } from '@locale/LocaleText';
import type {
    ButtonText,
    FieldText,
    HeaderAndExplanationText,
    ModeText,
} from '@locale/UITexts';

type PageText = {
    /** [plain] The character editor page header */
    header: string;
    /** [formatted] Guidance shown in the character editor for each tool and
     *  selection state. These are rendered as markup (they use *emphasis* for
     *  key names), so they must not be written as plain text: a `/` in one
     *  opens an italic run that swallows the rest of the paragraph, which is
     *  what "ctrl/cmd-a" used to do here. Name a modifier key with the
     *  $control input instead, which concretize substitutes after parsing. */
    instructions: {
        empty: FormattedText;
        unselected: Template<['control']>;
        selected: Template<['control']>;
        eraser: FormattedText;
        pixel: FormattedText;
        rect: FormattedText;
        ellipse: FormattedText;
        path: FormattedText;
        symbol: FormattedText;
        image: FormattedText;
        points: FormattedText;
    };
    /** [plain] Names of the character editor shape tools */
    shape: {
        shape: string;
        eraser: string;
        pixel: string;
        rect: string;
        ellipse: string;
        path: string;
        emoji: string;
        glyph: string;
        symbol: string;
        image: string;
    };
    share: {
        dialog: HeaderAndExplanationText;
        button: ButtonText;
        delete: ButtonText;
        public: ModeText<string[]>;
        /** [plain] Label for the character's collaborators list */
        collaborators: string;
        /** [formatted] What adding collaborators to a character does */
        collaboratorsexplanation: FormattedText;
        /** [plain] Label for the chooser that puts this character in a gallery */
        gallery: string;
        /** [formatted] What putting a character in a gallery means */
        galleryexplanation: FormattedText;
        /** [formatted] What making a character public or private does */
        publicexplanation: FormattedText;
        /** The tabs the sharing settings are grouped into */
        tab: ModeText<[string, string, string]>;
    };
    field: {
        name: FieldText;
        description: FieldText;
        mode: ModeText<
            [string, string, string, string, string, string, string, string]
        >;
        fill: ModeText<string[]>;
        stroke: ModeText<string[]>;
        /** [plain] What to call no color */
        none: string;
        /** [plain] What to call inherited color */
        inherit: string;
        /** [plain] Labels for the stroke width slider*/
        strokeWidth: { label: string; tip: string };
        /** [plain] Labels for the pixel brush and eraser size slider */
        brushSize: { label: string; tip: string };
        /** [plain] How a chosen symbol is added: as pixels, or as an outline */
        insertion: ModeText<[string, string]>;
        /** [plain] Labels for the glyph font chooser */
        face: { label: string; tip: string };
        /** [plain] Labels for the glyph weight chooser */
        weight: { label: string; tip: string };
        /** [plain] Label for the glyph italic checkbox */
        italic: string;
        /** [plain] Labels for the glyph size slider */
        glyphSize: { label: string; tip: string };
        /** [plain] Labels for the border radius slider */
        radius: { label: string; tip: string };
        /** [plain] Labels for the rotation slider */
        angle: { label: string; tip: string };
        /** [plain] Width slider */
        width: { label: string; tip: string };
        /** [plain] Height slider */
        height: { label: string; tip: string };
        /** [plain] Closed path label */
        closed: string;
    };
    button: {
        /** The move selection back button */
        back: ButtonText;
        /** The move to back button */
        toBack: ButtonText;
        /** The move selection forward button */
        forward: ButtonText;
        /** The move to front button */
        toFront: ButtonText;
        /** Copy button text */
        copy: ButtonText;
        /** Paste button text */
        paste: ButtonText;
        /** The clear pixels button */
        clearPixels: ButtonText;
        /** The clear all button */
        clear: ButtonText;
        /** The undo tooltip */
        undo: ButtonText;
        /** The redo tooltip */
        redo: ButtonText;
        /** The select all button */
        all: ButtonText;
        /** The select all of color button */
        allColor: ButtonText;
        /** The saturation up button */
        saturationUp: ButtonText;
        /** The saturation down button */
        saturationDown: ButtonText;
        /** End path button */
        end: ButtonText;
        /** Flip path horizontal */
        horizontal: ButtonText;
        /** Flip path vertical */
        vertical: ButtonText;
        /** Fit shapes to grid */
        fit: ButtonText;
        /** Dismiss the error message */
        dismissError: ButtonText;
        /** Start editing the selected path's points */
        editPoints: ButtonText;
        /** Stop editing points */
        donePoints: ButtonText;
        /** Add a point to the selected path */
        addPoint: ButtonText;
        /** Remove the selected point */
        deletePoint: ButtonText;
        /** Bend the segment arriving at the selected point */
        curve: ButtonText;
        /** Straighten the segment arriving at the selected point */
        straighten: ButtonText;
    };
    /** Importing an image and reducing it to pixels */
    image: {
        /** [formatted] How to move and size the crop box */
        instructions: FormattedText;
        button: ButtonText;
        /** The button that confirms the crop and adds the pixels */
        add: ButtonText;
        /** [plain] Name of the crop region */
        crop: { label: string; tip: string };
        /** [plain] Name of the preview showing what will be added */
        preview: string;
        /** [plain] Labels for the crop size slider */
        size: { label: string; tip: string };
    };
    feedback: {
        /** [plain] While a font is being fetched to trace a symbol's outline */
        glyphLoading: string;
        /** [plain] When the chosen font has no outline for the chosen symbol */
        glyphMissing: string;
        /** [plain] When the symbol has no ink to trace, like a space */
        glyphEmpty: string;
        /** [plain] When a font file couldn't be reached, found, or read */
        glyphUnreadable: string;
        /** [formatted] When a chosen image is larger than we'll read. $size and $limit are both in megabytes. */
        imageTooBig: Template<['size', 'limit']>;
        /** [plain] When the browser can't decode the chosen file as an image */
        imageUnreadable: string;
        /** [plain] Error shown when the character's name isn't a valid Wordplay name */
        name: string;
        /** [plain] When the description is empty */
        description: string;
        /** [plain] When completing a path, instructions on how to end it. */
        end: string;
        /** [plain] Couldn't load the character */
        loadfail: string;
        /** [plain] The character doesn't exist */
        notfound: string;
        /** [plain] Not logged in */
        unauthenticated: string;
        /** [plain] Not saving because name is taken */
        taken: string;
        /** [plain] When an edit failure occurs when updating projects after a character name change. */
        projecteditfail: string;
        /** [plain] Placeholder name for a project that has no name. */
        untitledproject: string;
    };
    /**
     * A live region only speaks when its text changes, so each of these has to say
     * something different every time it fires or it is heard once and then sounds
     * broken. That is why they carry positions, counts, and history steps rather
     * than reading like tidy summaries: those are the parts that vary.
     */
    announce: {
        /** [formatted] Where the crop box is now. The position rides along because it is what differs between two consecutive moves. */
        cropped: Template<['x', 'y']>;
        /** [plain] When the crop box enters move mode */
        cropMoving: string;
        /** [plain] When the crop box leaves move mode */
        cropDone: string;
        /** [formatted] When an image is added as pixels. The crop origin rides along because the count alone repeats when the same image is imported twice. */
        imported: Template<['#count', 'x', 'y']>;
        /** [formatted] When cursor position changes $1 x, $2: y. */
        position: Template<['x', 'y']>;
        /** [formatted] When selection changes. $1 is list of shape types. */
        selection: Template<['shapes']>;
        /** [formatted] When point editing begins, with how many points the path has. */
        editing: Template<['#count']>;
        /** [plain] When point editing ends. */
        editingDone: string;
        /** [formatted] When a path point is selected or moved. $index is 1-based. */
        point: Template<['index', 'x', 'y']>;
        /** [formatted] When a curve's control point is selected or moved. */
        control: Template<['index', 'x', 'y']>;
        /** [formatted] When a point is added to a path. */
        pointAdded: Template<['index', 'x', 'y']>;
        /** [formatted] When a point is removed, with how many are left. */
        pointRemoved: Template<['index', '#count']>;
        /** [formatted] When a segment is bent into a curve. */
        curved: Template<['index']>;
        /** [formatted] When a curved segment is straightened. */
        straightened: Template<['index']>;
        /** [formatted] When the selection is moved, naming where it landed. */
        moved: Template<['x', 'y']>;
        /** [formatted] When a pixel is drawn. */
        drew: Template<['x', 'y']>;
        /** [formatted] When a pixel is erased. */
        erased: Template<['x', 'y']>;
        /** [formatted] When a shape is finished. $shape is its kind. */
        finished: Template<['shape', 'x', 'y']>;
        /** [formatted] When shapes are deleted, with how many are left. */
        deleted: Template<['#count']>;
        /** [formatted] When an edit is undone. The step is what varies as undo repeats. */
        undone: Template<['step', 'total']>;
        /** [formatted] When an edit is redone. */
        redone: Template<['step', 'total']>;
        /** [formatted] When shapes are copied. $shapes is their kinds. */
        copied: Template<['shapes', '#count']>;
        /** [formatted] When shapes are pasted, naming where they landed. */
        pasted: Template<['x', 'y']>;
        /** [formatted] When a shape changes layer. */
        arranged: Template<['index', 'total']>;
        /** [formatted] When the selection is flipped, naming its new top left corner. */
        flipped: Template<['x', 'y']>;
        /** [plain] When shapes are grown to fill the canvas. Repeating it does nothing, so it needs nothing that varies. */
        fitted: string;
    };
};

export type { PageText as default };
