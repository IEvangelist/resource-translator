import { getInput } from '@actions/core';
import { Inputs } from './inputs';

export const getInputs = (): Inputs => {
    const sourceLocale = getInput('sourceLocale', { required: true });
    const inputs = {
        baseFileGlob: `**/*.${sourceLocale}.resx`,
        subscriptionKey: getInput('subscriptionKey', { required: true }),
        endpoint: getInput('endpoint', { required: true }),
        sourceLocale,
        region: getInput('region')
    };

    return inputs;
};