export interface Data {
    [key: string]: string;
}

export interface ResourceFile {
    root: {
        data: Data[]
    }
}