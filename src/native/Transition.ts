import Bind from "../nodes/Bind";
import Dimension from "../nodes/Dimension";
import MeasurementLiteral from "../nodes/MeasurementLiteral";
import MeasurementType from "../nodes/MeasurementType";
import NameType from "../nodes/NameType";
import StructureDefinition from "../nodes/StructureDefinition";
import { TRANSLATE, WRITE_DOCS } from "../nodes/Translations";
import TypeInput from "../nodes/TypeInput";
import Unit from "../nodes/Unit";

export const Transition = new StructureDefinition(
    WRITE_DOCS,
    {
        eng: "Transition",
        "😀": TRANSLATE
    },
    [],
    [],
    []
);
export default Transition;

export const Fade = new StructureDefinition(
    WRITE_DOCS,
    {
        eng: "Fade",
        "😀": "🫥"
    },
    [ new TypeInput(new NameType("Transition")) ],
    [],
    [
        new Bind(WRITE_DOCS, { eng: "duration", "😀": TRANSLATE }, new MeasurementType(undefined, new Unit(undefined, [ new Dimension("ms") ])), new MeasurementLiteral(400, new Unit(undefined, [ new Dimension("ms") ]))),
        new Bind(WRITE_DOCS, { eng: "delay", "😀": TRANSLATE }, new MeasurementType(undefined, new Unit(undefined, [ new Dimension("ms") ])), new MeasurementLiteral(0, new Unit(undefined, [ new Dimension("ms") ])))
    ]
)

export const Scale = new StructureDefinition(
    WRITE_DOCS,
    {
        eng: "Scale",
        "😀": TRANSLATE
    },
    [ new TypeInput(new NameType("Transition")) ],
    [],
    [
        new Bind(WRITE_DOCS, { eng: "scale", "😀": TRANSLATE }, new MeasurementType(), new MeasurementLiteral(2)),
        new Bind(WRITE_DOCS, { eng: "duration", "😀": TRANSLATE }, new MeasurementType(undefined, new Unit(undefined, [ new Dimension("ms") ])), new MeasurementLiteral(400, new Unit(undefined, [ new Dimension("ms") ]))),
        new Bind(WRITE_DOCS, { eng: "delay", "😀": TRANSLATE }, new MeasurementType(undefined, new Unit(undefined, [ new Dimension("ms") ])), new MeasurementLiteral(0, new Unit(undefined, [ new Dimension("ms") ])))
    ]
)