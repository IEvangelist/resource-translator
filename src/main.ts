import { initiate } from './resource-translator';

const main = async (): Promise<void> => {
    try {
        await initiate();
    } catch (error) {
        console.error(error);
    }
};

export default main;