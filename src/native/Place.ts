import Bind from "../nodes/Bind";
import Dimension from "../nodes/Dimension";
import MeasurementType from "../nodes/MeasurementType";
import StructureDefinition from "../nodes/StructureDefinition";
import { TRANSLATE, WRITE_DOCS } from "../nodes/Translations";
import Unit from "../nodes/Unit";

const Place = new StructureDefinition(
    WRITE_DOCS,
    {
        eng: "Place",
        "😀": TRANSLATE
    },
    [],
    [],
    [
        new Bind(
            WRITE_DOCS,
            {
                eng: "x",
                "😀": TRANSLATE
            },
            new MeasurementType(undefined, new Unit(undefined, [ new Dimension("px") ]))
        ),
        new Bind(
            WRITE_DOCS,
            {
                eng: "y",
                "😀": TRANSLATE
            },
            new MeasurementType(undefined, new Unit(undefined, [ new Dimension("px") ]))
        )
    ]
);

export default Place;