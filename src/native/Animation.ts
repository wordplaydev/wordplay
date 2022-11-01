import Bind from "../nodes/Bind";
import Dimension from "../nodes/Dimension";
import MeasurementLiteral from "../nodes/MeasurementLiteral";
import MeasurementType from "../nodes/MeasurementType";
import NameType from "../nodes/NameType";
import StructureDefinition from "../nodes/StructureDefinition";
import { TRANSLATE, WRITE_DOCS } from "../nodes/Translations";
import TypeInput from "../nodes/TypeInput";
import Unit from "../nodes/Unit";

export const Animation = new StructureDefinition(
    WRITE_DOCS,
    {
        eng: "Animation",
        "😀": TRANSLATE
    },
    [],
    [],
    []
);
export default Animation;

export const Wobble = new StructureDefinition(
    WRITE_DOCS,
    {
        eng: "Wobble",
        "😀": "😵‍💫"
    },
    [ new TypeInput(new NameType("Animation")) ],
    [],
    [
        new Bind(WRITE_DOCS, { eng: "angle", "😀": TRANSLATE }, new MeasurementType(undefined, new Unit(undefined, [ new Dimension("°") ])), new MeasurementLiteral(10, new Unit(undefined, [ new Dimension("°") ]))),
        new Bind(WRITE_DOCS, { eng: "duration", "😀": TRANSLATE }, new MeasurementType(undefined, new Unit(undefined, [ new Dimension("ms") ])), new MeasurementLiteral(400, new Unit(undefined, [ new Dimension("ms") ]))),
        new Bind(WRITE_DOCS, { eng: "count", "😀": TRANSLATE }, new MeasurementType(), new MeasurementLiteral(Infinity)),
    ]
)

export const Throb = new StructureDefinition(
    WRITE_DOCS,
    {
        eng: "Throb",
        "😀": TRANSLATE
    },
    [ new TypeInput(new NameType("Animation")) ],
    [],
    [
        new Bind(WRITE_DOCS, { eng: "scale", "😀": TRANSLATE }, new MeasurementType(), new MeasurementLiteral(1.2)),
        new Bind(WRITE_DOCS, { eng: "duration", "😀": TRANSLATE }, new MeasurementType(undefined, new Unit(undefined, [ new Dimension("ms") ])), new MeasurementLiteral(400, new Unit(undefined, [ new Dimension("ms") ]))),
        new Bind(WRITE_DOCS, { eng: "count", "😀": TRANSLATE }, new MeasurementType(), new MeasurementLiteral(Infinity)),
    ]
)

export const Bounce = new StructureDefinition(
    WRITE_DOCS,
    {
        eng: "Bounce",
        "😀": TRANSLATE
    },
    [ new TypeInput(new NameType("Animation")) ],
    [],
    [
        new Bind(WRITE_DOCS, { eng: "height", "😀": TRANSLATE }, new MeasurementType(undefined, new Unit(undefined, [ new Dimension("m")])), new MeasurementLiteral(1.2)),
        new Bind(WRITE_DOCS, { eng: "duration", "😀": TRANSLATE }, new MeasurementType(undefined, new Unit(undefined, [ new Dimension("ms") ])), new MeasurementLiteral(400, new Unit(undefined, [ new Dimension("ms") ]))),
        new Bind(WRITE_DOCS, { eng: "count", "😀": TRANSLATE }, new MeasurementType(), new MeasurementLiteral(Infinity)),
    ]
)