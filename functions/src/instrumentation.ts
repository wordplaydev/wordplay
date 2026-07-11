import { createFirebaseSpanExporter } from '@agentpond/firebase';
import Anthropic from '@anthropic-ai/sdk';
import { AnthropicInstrumentation } from '@arizeai/openinference-instrumentation-anthropic';
import { NodeSDK } from '@opentelemetry/sdk-node';
import './firebase.js';

const anthropicInstrumentation = new AnthropicInstrumentation();

// The Functions package uses ESM, so Anthropic must be patched explicitly.
anthropicInstrumentation.manuallyInstrument(Anthropic);

const telemetry = new NodeSDK({
    traceExporter: createFirebaseSpanExporter(),
    instrumentations: [anthropicInstrumentation],
});

telemetry.start();
