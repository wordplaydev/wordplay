/* eslint-disable @typescript-eslint/ban-types */
import StreamView from './StreamView.svelte';
import FunctionView from './FunctionView.svelte';
import NoneView from './NoneView.svelte';
import StructureView from './StructureView.svelte';
import TableView from './TableView.svelte';
import BoolView from './BoolView.svelte';
import ListView from './ListView.svelte';
import TextView from './TextView.svelte';
import SetView from './SetView.svelte';
import MapView from './MapView.svelte';
import NumberView from './NumberView.svelte';
import ConversionView from './ConversionView.svelte';
import UnknownView from './UnknownView.svelte';
import FunctionValue from '@values/FunctionValue';
import NoneValue from '@values/NoneValue';
import StructureValue from '@values/StructureValue';
import TableValue from '@values/TableValue';
import BoolValue from '@values/BoolValue';
import ConversionDefinitionValue from '@values/ConversionDefinitionValue';
import ListValue from '@values/ListValue';
import TextValue from '@values/TextValue';
import MapValue from '@values/MapValue';
import NumberValue from '@values/NumberValue';
import SetValue from '@values/SetValue';
import StreamValue from '@values/StreamValue';
import StructureDefinitionValue from '@values/StructureDefinitionValue';
import StructureDefinitionView from './StructureDefinitionView.svelte';
import StreamDefinitionValue from '../../values/StreamDefinitionValue';
import StreamDefinitionView from './StreamDefinitionView.svelte';
import ExceptionView from './ExceptionView.svelte';
import ExceptionValue from '@values/ExceptionValue';
import MarkupView from './MarkupView.svelte';
import MarkupValue from '@values/MarkupValue';
import type { Component } from 'svelte';

const mapping = new Map<Function, unknown>();

mapping.set(FunctionValue, FunctionView);
mapping.set(NoneValue, NoneView);
mapping.set(StructureValue, StructureView);
mapping.set(StructureDefinitionValue, StructureDefinitionView);
mapping.set(StreamDefinitionValue, StreamDefinitionView);
mapping.set(TableValue, TableView);
mapping.set(BoolValue, BoolView);
mapping.set(ConversionDefinitionValue, ConversionView);
mapping.set(ListValue, ListView);
mapping.set(MapValue, MapView);
mapping.set(NumberValue, NumberView);
mapping.set(SetValue, SetView);
mapping.set(StreamValue, StreamView);
mapping.set(TextValue, TextView);
mapping.set(ExceptionValue, ExceptionView);
mapping.set(MarkupValue, MarkupView);

export default function valueToView(type: Function): Component {
    let prototype = type;
    do {
        const view = mapping.get(prototype);
        if (view !== undefined) return view as Component;
        prototype = Object.getPrototypeOf(prototype);
    } while (prototype);
    return UnknownView as Component;
}
