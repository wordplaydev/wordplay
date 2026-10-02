/* eslint-disable @typescript-eslint/ban-types */
import BoolValue from '#values/BoolValue.ts';
import ConversionDefinitionValue from '#values/ConversionDefinitionValue.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import FunctionValue from '#values/FunctionValue.ts';
import ListValue from '#values/ListValue.ts';
import MapValue from '#values/MapValue.ts';
import MarkupValue from '#values/MarkupValue.ts';
import NoneValue from '#values/NoneValue.ts';
import NumberValue from '#values/NumberValue.ts';
import SetValue from '#values/SetValue.ts';
import StreamValue from '#values/StreamValue.ts';
import StructureDefinitionValue from '#values/StructureDefinitionValue.ts';
import StructureValue from '#values/StructureValue.ts';
import TableValue from '#values/TableValue.ts';
import TextValue from '#values/TextValue.ts';
import type { Component } from 'svelte';
import StreamDefinitionValue from '#values/StreamDefinitionValue.ts';
import BoolView from '#components/values/BoolView.svelte';
import ConversionView from '#components/values/ConversionView.svelte';
import ExceptionView from '#components/values/ExceptionView.svelte';
import FunctionView from '#components/values/FunctionView.svelte';
import ListView from '#components/values/ListView.svelte';
import MapView from '#components/values/MapView.svelte';
import MarkupView from '#components/values/MarkupView.svelte';
import NoneView from '#components/values/NoneView.svelte';
import NumberView from '#components/values/NumberView.svelte';
import SetView from '#components/values/SetView.svelte';
import StreamDefinitionView from '#components/values/StreamDefinitionView.svelte';
import StreamView from '#components/values/StreamView.svelte';
import StructureDefinitionView from '#components/values/StructureDefinitionView.svelte';
import StructureView from '#components/values/StructureView.svelte';
import TableView from '#components/values/TableView.svelte';
import TextView from '#components/values/TextView.svelte';
import UnknownView from '#components/values/UnknownView.svelte';
import MatchValue from '#values/MatchValue.ts';
import PatternMatchView from '#components/values/PatternMatchView.svelte';
import PatternValue from '#values/PatternValue.ts';
import PatternValueView from '#components/values/PatternValueView.svelte';

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
// The pattern matcher's scoped state renders as a position-in-text match
// visualization while stepping (LANGUAGE.md). Other Internal values (e.g.
// iteration state) have no creator-facing view and fall through to UnknownView.
mapping.set(MatchValue, PatternMatchView);
// A compiled pattern renders as its source (e.g. `⣿>0 #⣿`) in the code font.
mapping.set(PatternValue, PatternValueView);

export default function valueToView(type: Function): Component {
    let prototype = type;
    do {
        const view = mapping.get(prototype);
        if (view !== undefined) return asView(view);
        prototype = Object.getPrototypeOf(prototype);
    } while (prototype);
    return asView(UnknownView);
}

/**
 * A registered view as the component a caller renders. Each view declares the
 * value class it draws, and Svelte compares a component's props strictly, so a
 * registry of views for different value classes cannot be typed without this.
 * What makes the lookup right is that the map is keyed by the very class each
 * view declares.
 */
function asView(view: unknown): Component {
    // sound: the registry is keyed by the value class each view declares.
    return view as Component;
}
