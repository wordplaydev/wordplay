/* eslint-disable @typescript-eslint/ban-types */
import BoolValue from '@values/BoolValue';
import ConversionDefinitionValue from '@values/ConversionDefinitionValue';
import ExceptionValue from '@values/ExceptionValue';
import FunctionValue from '@values/FunctionValue';
import ListValue from '@values/ListValue';
import MapValue from '@values/MapValue';
import MarkupValue from '@values/MarkupValue';
import NoneValue from '@values/NoneValue';
import NumberValue from '@values/NumberValue';
import SetValue from '@values/SetValue';
import StreamValue from '@values/StreamValue';
import StructureDefinitionValue from '@values/StructureDefinitionValue';
import StructureValue from '@values/StructureValue';
import TableValue from '@values/TableValue';
import TextValue from '@values/TextValue';
import type { Component } from 'svelte';
import StreamDefinitionValue from '../../values/StreamDefinitionValue';
import BoolView from './BoolView.svelte';
import ConversionView from './ConversionView.svelte';
import ExceptionView from './ExceptionView.svelte';
import FunctionView from './FunctionView.svelte';
import ListView from './ListView.svelte';
import MapView from './MapView.svelte';
import MarkupView from './MarkupView.svelte';
import NoneView from './NoneView.svelte';
import NumberView from './NumberView.svelte';
import SetView from './SetView.svelte';
import StreamDefinitionView from './StreamDefinitionView.svelte';
import StreamView from './StreamView.svelte';
import StructureDefinitionView from './StructureDefinitionView.svelte';
import StructureView from './StructureView.svelte';
import TableView from './TableView.svelte';
import TextView from './TextView.svelte';
import UnknownView from './UnknownView.svelte';

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
