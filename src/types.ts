export interface FileEntry {
  name: string;
  isDirectory: boolean;
  size: number;
  lastModified: number;
}

export interface Playlist {
  path: string;
  thumbnailUrl: string | null; // can be null per backend notes
}

export type ElementKind = "light" | "door" | "camera" | "thermostat";

export interface HomeElement {
  id: string;
  name: string;
  kind: ElementKind;
  online: boolean;
  detail: string;
}

export interface Resident {
  id: string;
  username: string;
  unit: string;
  hasWorkspace: boolean;
}