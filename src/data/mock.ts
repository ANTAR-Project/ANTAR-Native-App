import type { FileEntry, HomeElement, Playlist,Resident } from "../types";

const DAY = 86_400_000;
const ago = (days: number) => Date.now() - days * DAY;

// Keyed by folder path ("" = root)
export const MOCK_TREE: Record<string, FileEntry[]> = {
  "": [
    { name: "Documents", isDirectory: true, size: 0, lastModified: ago(2) },
    { name: "Videos", isDirectory: true, size: 0, lastModified: ago(5) },
    { name: "Photos", isDirectory: true, size: 0, lastModified: ago(9) },
    { name: "notes.txt", isDirectory: false, size: 2_300, lastModified: ago(1) },
  ],
  Documents: [
    { name: "lease-agreement.pdf", isDirectory: false, size: 1_450_000, lastModified: ago(12) },
    { name: "society-rules.pdf", isDirectory: false, size: 820_000, lastModified: ago(30) },
  ],
  Videos: [
    { name: "sample.mp4", isDirectory: false, size: 48_200_000, lastModified: ago(5) },
    { name: "gate-clip.mp4", isDirectory: false, size: 12_900_000, lastModified: ago(6) },
  ],
  Photos: [
    { name: "balcony.jpg", isDirectory: false, size: 3_400_000, lastModified: ago(9) },
  ],
};

export const MOCK_PLAYLISTS: Playlist[] = [
  { path: "sample.mp4", thumbnailUrl: null },
  { path: "gate-clip.mp4", thumbnailUrl: null },
  { path: "lobby-recording.mp4", thumbnailUrl: null },
  { path: "festival-2026.mp4", thumbnailUrl: null },
];

export const MOCK_ELEMENTS: HomeElement[] = [
  { id: "cam-1", name: "Main Gate Camera", kind: "camera", online: true, detail: "Streaming · 1080p" },
  { id: "door-1", name: "Front Door Lock", kind: "door", online: true, detail: "Locked" },
  { id: "light-1", name: "Living Room Light", kind: "light", online: true, detail: "On · 80%" },
  { id: "light-2", name: "Balcony Light", kind: "light", online: false, detail: "Offline" },
  { id: "therm-1", name: "Thermostat", kind: "thermostat", online: true, detail: "24 °C" },
];

export const MOCK_RESIDENTS: Resident[] = [
  { id: "r1", username: "aarav.sharma", unit: "A-101", hasWorkspace: true },
  { id: "r2", username: "meera.iyer", unit: "A-204", hasWorkspace: true },
  { id: "r3", username: "rohan.das", unit: "B-310", hasWorkspace: false },
  { id: "r4", username: "sana.khan", unit: "C-402", hasWorkspace: true },
];