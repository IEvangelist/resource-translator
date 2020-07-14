import * as io from '@actions/io-util';
import * as glob from '@actions/glob';
import { isDirectory } from '@actions/io/lib/io-util';

export async function findAllResourceFiles(baseFileGlob: string): Promise<string[]> {
    const globber = await glob.create(baseFileGlob);
    const filesAndDirectories = await globber.glob();

    return filesAndDirectories.filter(async path => {
        const directory = await isDirectory(path);
        return !directory;
    });
}