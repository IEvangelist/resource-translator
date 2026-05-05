export interface ResourceFile {
  root: Root;
}

export interface Root {
  data: Data[];
}

export interface Data {
  $: NameAttribute;
  value: string[];
}

export interface NameAttribute {
  name: string;
  /**
   * Optional `.NET resx` `type` attribute. Present when the entry is a typed
   * file reference (e.g. `System.Resources.ResXFileRef`) — those values are
   * a `path;type[;encoding]` triple that must NOT be sent through machine
   * translation. The parser skips any data entry where this is set.
   */
  type?: string;
  /**
   * Optional `.NET resx` `mimetype` attribute. Present when the entry holds
   * a base64-encoded binary blob — also a non-translatable payload.
   */
  mimetype?: string;
}

/**
 * Returns true when the data entry holds a translatable string. False for
 * file references (`type` set) and binary blobs (`mimetype` set).
 */
export const isTranslatable = (data: Data): boolean => {
  return !data.$.type && !data.$.mimetype;
};

export const traverseResx = (
  instance: ResourceFile,
  name: string,
  dataAction: (data: Data) => void,
) => {
  if (instance && instance.root && instance.root.data) {
    const data = instance.root.data.find(
      (d) => d.$.name === name && isTranslatable(d),
    );
    if (data) {
      dataAction(data);
    }
  }
};
