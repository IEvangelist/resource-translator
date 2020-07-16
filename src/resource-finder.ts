import { create } from '@actions/glob';
import { isDirectory } from '@actions/io/lib/io-util';

export async function findAllResourceFiles(baseFileGlob: string): Promise<string[]> {
    const globber = await create(baseFileGlob);
    const filesAndDirectories = await globber.glob();

    return filesAndDirectories.filter(async path => {
        const pathIsDirectory = await isDirectory(path);
        return !pathIsDirectory;
    });
}