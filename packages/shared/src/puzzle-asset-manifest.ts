export const GAME_PUZZLE_IDS = [
  "cozy-cafe",
  "enchanted-forest",
  "underwater-treasure",
  "cyber-city",
  "winter-cabin",
  "space-station",
  "hawaiian-beach",
  "alchemist-workshop",
  "dinosaur-valley",
  "pirate-ship",
  "japanese-shrine",
  "korean-palace",
  "medieval-castle",
  "japanese-ninja",
  "korean-goblin",
  "medieval-dragon",
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
    version: "2026-08-27.2",
    difficulty: "EASY",
    rightsStatus: "USER_SUPPLIED",
    original: webp("cozy-cafe-original-v3.webp", "50F48792AECD12A60FCF5BAEFD23DE011B926046B0CC56BE4DEC00BFC688E104"),
    modified: webp("cozy-cafe-modified-v3.webp", "12488DD96C5FE24B8CD92D31387969DDAF64BCBD2CD42D8C8A6BF6931C66F0D6"),
  },
  "enchanted-forest": {
    version: "2026-08-27.2",
    difficulty: "MEDIUM",
    rightsStatus: "USER_SUPPLIED",
    original: webp("enchanted-forest-original-v3.webp", "3A1925BDFBC0CA4AA94C7AF3CF270E2DD0585110B8E1C60AAF467DA2EA1A26CE"),
    modified: webp("enchanted-forest-modified-v3.webp", "6DD30310DFAFB05EB6EEBABC3771BE2CF1A7D0F8DA7C9EDD39F1422C01407540"),
  },
  "underwater-treasure": {
    version: "2026-08-09.1",
    difficulty: "UNRATED",
    rightsStatus: "USER_SUPPLIED",
    original: webp("underwater-treasure-original-v2.webp", "3AABDCC6112C2C99C2CA0E83976379380BA5165C4DE950ABC1734DE730C479FC"),
    modified: webp("underwater-treasure-modified-v2.webp", "6BA53C42A84DEB3416BF8430EE51D3B0EEEEBEA3F409855F4DB12B3759813D7F"),
  },
  "cyber-city": {
    version: "2026-08-27.2",
    difficulty: "HARD",
    rightsStatus: "USER_SUPPLIED",
    original: webp("cyber-city-original-v3.webp", "16A8021081F4D5684A3B2FE3B86066D42747CCC37F2E9478B84EE84F300693DB"),
    modified: webp("cyber-city-modified-v3.webp", "C8C95015B03A71C67F4B6EB9858CD98662CFB68534F28280D5AA00CC99639F45"),
  },
  "winter-cabin": {
    version: "2026-08-09.1",
    difficulty: "UNRATED",
    rightsStatus: "USER_SUPPLIED",
    original: webp("winter-cabin-original.webp", "215134746A7E741F063ED87A4008DF65B5BC1866F55E142C75175A403C9B6C6E"),
    modified: webp("winter-cabin-modified.webp", "55B52B074833BD66432FD6149FD090728D1411E9A4CB8620EECBC559D7C3C18C"),
  },
  "space-station": {
    version: "2026-08-27.1",
    difficulty: "EASY",
    rightsStatus: "USER_SUPPLIED",
    original: webp("space-station-original.webp", "44F541916564AC23421EFF7C1FC491532395D0BF06846565AB7B647E9042DA67"),
    modified: webp("space-station-modified.webp", "E9215A4EC4CDD69A1B6483FEAAA97554EDD7BD70DB7019A367ECDAF89EFC7253"),
  },
  "hawaiian-beach": {
    version: "2026-08-27.1",
    difficulty: "EASY",
    rightsStatus: "USER_SUPPLIED",
    original: webp("hawaiian-beach-original.webp", "4A88FE4B047D4D5443E57C146EE90A54B51C7A5FF2A9428E3F99FC43A76D5C21"),
    modified: webp("hawaiian-beach-modified.webp", "48AF788CC6C0B6D7E4A82EBFCE63CDDD3F4BE1DECDDA3F7DC5A6A79E94A84C43"),
  },
  "alchemist-workshop": {
    version: "2026-08-27.1",
    difficulty: "EASY",
    rightsStatus: "USER_SUPPLIED",
    original: webp("alchemist-workshop-original.webp", "0CFBE0A5C07146AAC752F22BAEF0BAECD1E3B790A987E9ECEC4990364A396474"),
    modified: webp("alchemist-workshop-modified.webp", "0222A830026904714A7391B260539C1EE8ED9D3D2BB637D1CFB4CED747806D60"),
  },
  "dinosaur-valley": {
    version: "2026-08-27.1",
    difficulty: "EASY",
    rightsStatus: "USER_SUPPLIED",
    original: webp("dinosaur-valley-original.webp", "3585CEB914D19FD4F14F28AE6F7B6C473F6C5817F6063B52DC89E24AE2EBB5B3"),
    modified: webp("dinosaur-valley-modified.webp", "A93A96496ACABF11AF443496C2304579819F5B14CE523527BC7B82FB2565F832"),
  },
  "pirate-ship": {
    version: "2026-08-27.1",
    difficulty: "EASY",
    rightsStatus: "USER_SUPPLIED",
    original: webp("pirate-ship-original.webp", "A7BDF4EAD9AB1C7FB9EEE7A770E95F4B9AD3AC98A5A742B29A0B442D160A0766"),
    modified: webp("pirate-ship-modified.webp", "4A0230F10428B84AE173932CE588B6D19B4BAF7F2D03569B2F7372DD4034F7EC"),
  },
  "japanese-shrine": {
    version: "2026-08-27.1",
    difficulty: "EASY",
    rightsStatus: "USER_SUPPLIED",
    original: webp("japanese-shrine-original.webp", "D6DDAA26C20E9465825AF0D2645B3B364C59845382FDE975F7041B73409A37D7"),
    modified: webp("japanese-shrine-modified.webp", "FC9053AB7607ED40833A91B68C777F6589D72706D969E419BA3342F8FEA227E8"),
  },
  "korean-palace": {
    version: "2026-08-27.1",
    difficulty: "EASY",
    rightsStatus: "USER_SUPPLIED",
    original: webp("korean-palace-original.webp", "08731E87D0BAFBCD46348C7EF873026740549D85940E5125DA46CF9472268F38"),
    modified: webp("korean-palace-modified.webp", "879C55A9C24ED0CD8A37EF8AADE931A003369A4B13AF602028F12ED0B457632F"),
  },
  "medieval-castle": {
    version: "2026-08-27.1",
    difficulty: "EASY",
    rightsStatus: "USER_SUPPLIED",
    original: webp("medieval-castle-original.webp", "227123908D21DAC00001FB256755A088C408F809E8588AF4DE73A91A11EB863F"),
    modified: webp("medieval-castle-modified.webp", "1529A0AABFF641A95EA8263FBD5876514B8E17AF42F0209B8EBE5A06CBCF7D28"),
  },
  "japanese-ninja": {
    version: "2026-08-27.1",
    difficulty: "MEDIUM",
    rightsStatus: "USER_SUPPLIED",
    original: webp("japanese-ninja-original.webp", "51CCF3D9A58ABAA2D3020AA4D81A17994C366FC2115C8DC0FFC894A184CD7256"),
    modified: webp("japanese-ninja-modified.webp", "ACD6D250DD110E09D473EFE8B95ACA74E5636D73F4EE71A3E09F2644F043314C"),
  },
  "korean-goblin": {
    version: "2026-08-27.1",
    difficulty: "MEDIUM",
    rightsStatus: "USER_SUPPLIED",
    original: webp("korean-goblin-original.webp", "AAB7C56EE1326562F8933EFC413FD6E7D9F8665A45FE508BBCB3286801B692EE"),
    modified: webp("korean-goblin-modified.webp", "0CF29D2D11B4C74339C7DBC874FAD3656F1A232F61B11AE0BFAFB21A93C00AF8"),
  },
  "medieval-dragon": {
    version: "2026-08-27.1",
    difficulty: "MEDIUM",
    rightsStatus: "USER_SUPPLIED",
    original: webp("medieval-dragon-original.webp", "B5E77386882B3AA58D0D83A20C6F9AA6E161A7DA452F47D1ADEC9A931D6BD6C1"),
    modified: webp("medieval-dragon-modified.webp", "428D9BD97748CFA3F30A083EA8D698E87F0692858414D8AC9BE5725EF35E5C76"),
  },
} as const satisfies Record<GamePuzzleId, PuzzleAssetMetadata>;
