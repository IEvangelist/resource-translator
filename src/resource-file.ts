export interface ResourceFile {
    root: Root;
  }
  export interface Root {
    data?: (DataEntity)[] | null;
  }
  export interface DataEntity {
    $: $;
    value?: (string)[] | null;
  }
  export interface $ {
    name: string;
  }  