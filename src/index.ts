import { setFailed } from '@actions/core';
import { initiate } from './resource-translator';

const run = async (): Promise<void> => {
    try {
        await initiate();
    } catch (error) {
        setFailed(error);
    }
};

run();