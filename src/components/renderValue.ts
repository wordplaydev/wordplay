import ExceptionView from "./ExceptionView.svelte";
import StreamView from "./StreamView.svelte";
import FunctionView from "./FunctionView.svelte";
import NoneView from "./NoneView.svelte";
import StructureView from "./StructureView.svelte";
import TableView from "./TableView.svelte";
import BoolView from "./BoolView.svelte";
import ListView from "./ListView.svelte";
import TextView from "./TextView.svelte";
import SetView from "./SetView.svelte";
import MapView from "./MapView.svelte";
import MeasurementView from "./MeasurementView.svelte";
import ConversionView from "./ConversionView.svelte";
import UnknownView from "./UnknownView.svelte";
import FunctionValue from "../runtime/FunctionValue";
import None from "../runtime/None";
import Structure from "../runtime/Structure";
import Table from "../runtime/Table";
import Bool from "../runtime/Bool";
import ConversionValue from "../runtime/ConversionValue";
import Exception from "../runtime/Exception";
import List from "../runtime/List";
import Text from "../runtime/Text";
import MapValue from "../runtime/MapValue";
import Measurement from "../runtime/Measurement";
import SetValue from "../runtime/SetValue";
import Stream from "../runtime/Stream";
import StructureDefinitionValue from "../runtime/StructureDefinitionValue";
import StructureDefinitionView from "./StructureDefinitionView.svelte";

const mapping = new Map<Function, ConstructorOfATypedSvelteComponent>();

mapping.set(FunctionValue, FunctionView);
mapping.set(None, NoneView);
mapping.set(Structure, StructureView);
mapping.set(StructureDefinitionValue, StructureDefinitionView);
mapping.set(Table, TableView);
mapping.set(Bool, BoolView);
mapping.set(ConversionValue, ConversionView);
mapping.set(Exception, ExceptionView);
mapping.set(List, ListView);
mapping.set(MapValue, MapView);
mapping.set(Measurement, MeasurementView);
mapping.set(SetValue, SetView);
mapping.set(Stream, StreamView);
mapping.set(Text, TextView);

export default function renderValue(type: Function) {
    let prototype = type;
    do {
        let view = mapping.get(prototype);
        if(view !== undefined) return view;
        prototype = Object.getPrototypeOf(prototype);
    } while(prototype)
    return UnknownView;
}