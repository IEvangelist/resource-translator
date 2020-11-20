import { setFailed } from '@actions/core';
import { getInputs } from './get-inputs';
import { start } from './resource-translator';

const run = async (): Promise<void> => {
    try {
        await start(getInputs());
    } catch (error) {
        setFailed(error);
    }
};

run();