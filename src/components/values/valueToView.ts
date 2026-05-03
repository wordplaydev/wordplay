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
import StreamDefinitionValue from '@values/StreamDefinitionValue';
import BoolView from '@components/values/BoolView.svelte';
import ConversionView from '@components/values/ConversionView.svelte';
import ExceptionView from '@components/values/ExceptionView.svelte';
import FunctionView from '@components/values/FunctionView.svelte';
import ListView from '@components/values/ListView.svelte';
import MapView from '@components/values/MapView.svelte';
import MarkupView from '@components/values/MarkupView.svelte';
import NoneView from '@components/values/NoneView.svelte';
import NumberView from '@components/values/NumberView.svelte';
import SetView from '@components/values/SetView.svelte';
import StreamDefinitionView from '@components/values/StreamDefinitionView.svelte';
import StreamView from '@components/values/StreamView.svelte';
import StructureDefinitionView from '@components/values/StructureDefinitionView.svelte';
import StructureView from '@components/values/StructureView.svelte';
import TableView from '@components/values/TableView.svelte';
import TextView from '@components/values/TextView.svelte';
import UnknownView from '@components/values/UnknownView.svelte';

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
