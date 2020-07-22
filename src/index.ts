import { initiate } from './resource-translator';

const run = async (): Promise<void> => {
    try {
        await initiate();
    } catch (error) {
        console.error(error);
    }
};

run();