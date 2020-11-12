import { create } from '@actions/glob';
import { context, getOctokit } from '@actions/github';
import { isDirectory } from '@actions/io/lib/io-util';
import { debug } from '@actions/core';
import { basename } from 'path';

export async function findAllResourceFiles(baseFileGlob: string): Promise<string[]> {
    const filesToInclude = await getFilesToInclude();
    const globber = await create(baseFileGlob);
    const filesAndDirectories = await globber.glob();

    const includeFile = (filepath: string) => {
        if (filesToInclude && filesToInclude.length) {
            const filename = basename(filepath);
            return filesToInclude.some(f => f.toLowerCase() === filename.toLowerCase());
        }

        return true;
    };

    return filesAndDirectories.filter(async path => {
        const pathIsDirectory = await isDirectory(path);
        return !pathIsDirectory && includeFile(path);
    });
}
async function getFilesToInclude(): Promise<string[]> {
    try {
        // Get all files related to trigger.
        const token = process.env['GITHUB_TOKEN'] || null;
        if (token) {
            const octokit = getOctokit(token);
            const options = {
                ...context.repo,
                ref: context.ref
            };
            debug(JSON.stringify(options));
            const response = await octokit.repos.getCommit(options);

            debug(JSON.stringify(response));

            if (response.data) {
                return response.data.files.map(file => file.filename);
            }
        }
    } catch (error) {
        debug(error);
    }

    return [];
}