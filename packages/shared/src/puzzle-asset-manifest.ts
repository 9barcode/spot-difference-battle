export const GAME_PUZZLE_IDS = [
  "cozy-cafe",
  "enchanted-forest",
  "underwater-treasure",
  "cyber-city",
  "winter-cabin",
  "home-office",
  "farmers-market",
  "bathroom-vanity",
  "lakeside-picnic",
  "laundry-room",
] as const;

export type GamePuzzleId = (typeof GAME_PUZZLE_IDS)[number];
export type PuzzleDifficulty = "UNRATED" | "EASY" | "MEDIUM" | "HARD";
export type PuzzleRightsStatus = "USER_SUPPLIED" | "VERIFIED" | "RESTRICTED";

export interface PuzzleAssetFileMetadata {
  fileName: string;
  sha256: string;
  mimeType: "image/webp";
  width: number;
  height: number;
}

export interface PuzzleAssetMetadata {
  version: string;
  difficulty: PuzzleDifficulty;
  rightsStatus: PuzzleRightsStatus;
  original: PuzzleAssetFileMetadata;
  modified: PuzzleAssetFileMetadata;
}

const webp = (fileName: string, sha256: string, width = 1024, height = 1024): PuzzleAssetFileMetadata => ({
  fileName,
  sha256,
  mimeType: "image/webp",
  width,
  height,
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
  "home-office": {
    version: "2026-08-28.1",
    difficulty: "UNRATED",
    rightsStatus: "USER_SUPPLIED",
    original: webp("home-office-original.webp", "15DEB19FEAF209D183F8DB2E391B05941F8781CBBC5C1D5B0C8459F7ECBF8B78", 512, 512),
    modified: webp("home-office-modified.webp", "E8ED1A35F3CCC1506019587F4539BF4997CB4FD8E6A877AA08F1F941DDBD9CF1", 512, 512),
  },
  "farmers-market": {
    version: "2026-08-28.1",
    difficulty: "UNRATED",
    rightsStatus: "USER_SUPPLIED",
    original: webp("farmers-market-original.webp", "293F8B7EA516650A230706C9E000C99AA4D699E3CCD60999514F044CE0F6633D", 384, 384),
    modified: webp("farmers-market-modified.webp", "8C265D71DE400179718471A0A05944FBB6A79A6063221628B495FE743E1893A6", 384, 384),
  },
  "bathroom-vanity": {
    version: "2026-08-28.1",
    difficulty: "UNRATED",
    rightsStatus: "USER_SUPPLIED",
    original: webp("bathroom-vanity-original.webp", "E1CBBD4E7620BF3D06516DA9B89FA7CA75C91EE1CEFF688D6A204535589B05DB", 512, 512),
    modified: webp("bathroom-vanity-modified.webp", "A504F20CBDE9F638D1AFD5B39FA271207D073D5A523093B066EE3B8B58E08438", 512, 512),
  },
  "lakeside-picnic": {
    version: "2026-08-28.1",
    difficulty: "UNRATED",
    rightsStatus: "USER_SUPPLIED",
    original: webp("lakeside-picnic-original.webp", "E4240170D7B53B1BE73781858DA17AAB04B1C78687062C2A00A90955F7B211DC", 384, 384),
    modified: webp("lakeside-picnic-modified.webp", "37651D4077213B0C87BE7C1F120035703F14096CC348FDCFA3B9C19332575138", 384, 384),
  },
  "laundry-room": {
    version: "2026-08-28.1",
    difficulty: "UNRATED",
    rightsStatus: "USER_SUPPLIED",
    original: webp("laundry-room-original.webp", "B85F1C8A23AE5C25CE9E997C5E6437C9F9E836EB4382C84BEBEC8BB65CBA8C2C", 384, 384),
    modified: webp("laundry-room-modified.webp", "D34945FF648E56B8B601EC0F9906553319FFACBE94997D2C32CFBC6C199E1E9E", 384, 384),
  },
} as const satisfies Record<GamePuzzleId, PuzzleAssetMetadata>;
