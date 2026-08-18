export const GAME_PUZZLE_IDS = [
  "cozy-cafe",
  "enchanted-forest",
  "underwater-treasure",
  "cyber-city",
  "winter-cabin",
] as const;

export type GamePuzzleId = (typeof GAME_PUZZLE_IDS)[number];
export type PuzzleDifficulty = "UNRATED" | "EASY" | "MEDIUM" | "HARD";
export type PuzzleRightsStatus = "USER_SUPPLIED" | "VERIFIED" | "RESTRICTED";

export interface PuzzleAssetFileMetadata {
  fileName: string;
  sha256: string;
  mimeType: "image/webp";
  width: 1024;
  height: 1024;
}

export interface PuzzleAssetMetadata {
  version: string;
  difficulty: PuzzleDifficulty;
  rightsStatus: PuzzleRightsStatus;
  original: PuzzleAssetFileMetadata;
  modified: PuzzleAssetFileMetadata;
}

const webp = (fileName: string, sha256: string): PuzzleAssetFileMetadata => ({
  fileName,
  sha256,
  mimeType: "image/webp",
  width: 1024,
  height: 1024,
});

export const GAME_PUZZLE_ASSET_MANIFEST = {
  "cozy-cafe": {
    version: "2026-08-09.1",
    difficulty: "UNRATED",
    rightsStatus: "USER_SUPPLIED",
    original: webp("cozy-cafe-original-v2.webp", "FECEF9A7A516820856184FC91D2F08B360AD82097BF09C7BFD3797A8E298C8CD"),
    modified: webp("cozy-cafe-modified-v2.webp", "326A2EFE6464A43F964A6BCB246147E55117F64A64FE73A3E1D2DF1D45E16979"),
  },
  "enchanted-forest": {
    version: "2026-08-09.1",
    difficulty: "UNRATED",
    rightsStatus: "USER_SUPPLIED",
    original: webp("enchanted-forest-original-v2.webp", "9F6FF96BBF4F4B4C4522E406D51323B6BA4AD3885FD578DDFE3D8CDCB00D56EC"),
    modified: webp("enchanted-forest-modified-v2.webp", "F80A8E32AD962A0780574ABD9C96D41387BCF5B5E16BA54A041C218FD6B7E6B8"),
  },
  "underwater-treasure": {
    version: "2026-08-09.1",
    difficulty: "UNRATED",
    rightsStatus: "USER_SUPPLIED",
    original: webp("underwater-treasure-original-v2.webp", "3AABDCC6112C2C99C2CA0E83976379380BA5165C4DE950ABC1734DE730C479FC"),
    modified: webp("underwater-treasure-modified-v2.webp", "6BA53C42A84DEB3416BF8430EE51D3B0EEEEBEA3F409855F4DB12B3759813D7F"),
  },
  "cyber-city": {
    version: "2026-08-09.1",
    difficulty: "UNRATED",
    rightsStatus: "USER_SUPPLIED",
    original: webp("cyber-city-original-v2.webp", "867E6D835332D52F9EC0B73BCA124C1BA3D97316B3A4191CB4CCCA881738E51D"),
    modified: webp("cyber-city-modified-v2.webp", "66E9B06BE686C4364356B81D87322A078673577D4CBFFB080357E00CB8661ADF"),
  },
  "winter-cabin": {
    version: "2026-08-09.1",
    difficulty: "UNRATED",
    rightsStatus: "USER_SUPPLIED",
    original: webp("winter-cabin-original.webp", "215134746A7E741F063ED87A4008DF65B5BC1866F55E142C75175A403C9B6C6E"),
    modified: webp("winter-cabin-modified.webp", "55B52B074833BD66432FD6149FD090728D1411E9A4CB8620EECBC559D7C3C18C"),
  },
} as const satisfies Record<GamePuzzleId, PuzzleAssetMetadata>;
