import { getInput } from '@actions/core';
import { Inputs } from './inputs';

export const getInputs = (): Inputs => {
    const sourceLocale = getInput('sourceLocale', { required: true });
    const inputs: Inputs = {
        baseFileGlob: `**/*.${sourceLocale}.resx`,
        subscriptionKey: getInput('subscriptionKey', { required: true }),
        endpoint: getInput('endpoint', { required: true }),
        sourceLocale,
        region: getInput('region'),
        toLocales: getQuestionableArray('toLocales')
    };

    return inputs;
};

const getQuestionableArray = (inputName: string): string[] | undefined => {
    const value = getInput(inputName);
    return !!value ? value.split(',') : undefined;
}