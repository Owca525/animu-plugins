import { request, SheepFinderAnime2000 } from "./index.js";
const WEBSITE = "https://reanime.to";
const PluginHeader = {
  "User-Agent": navigator.userAgent,
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Sec-GPC": "1",
  Connection: "keep-alive",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "cross-site",
  "Referer": WEBSITE
};
const PlayerHEADER = {
  "accept": "*/*",
  "accept-encoding": "gzip, deflate, br, zstd",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  "origin": "https://flixcloud.cc",
  "pragma": "no-cache",
  "priority": "u=1, i",
  "referer": "https://flixcloud.cc/",
  "sec-ch-ua": '"Chromium";v="151", "Not=A?Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Linux"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "cross-site",
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
};
const decryptor_content = `(response) => {
    if (response["text"].startsWith("#EXTM3U")) return response["text"]
    const secret = "REPLACE_ME_TO_SECRET_KEY"
    let str = [];

    for (let l = atob(secret), u = atob(response["text"].trim()), h = 0; h < u.length; h++) {
        str.push(u.charCodeAt(h) ^ l.charCodeAt(h % l.length));
    }
    return (new TextDecoder).decode(new Uint8Array(str))
}`;
const hls_converter = `(response) => {
    let buffer = response["buffer"]

        const u = new Uint8Array(buffer);

        let offset = 0;

        if (u.length >= 12 && [u[0], u[1], u[2], u[3], u[8], u[9], u[10], u[11]] == [0x52, 0x49, 0x46, 0x46, 0x57, 0x45, 0x42, 0x50]) {
            offset = 12;
        }

        if (u.length >= 8 && [u[0], u[1], u[2], u[3], u[4], u[5], u[6], u[7]] == [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
            offset = 8;
        }

        if (offset == 0) return buffer

        if (u[offset] !== 0x47) {
            let data = u.subarray(offset);
            const key = [
                157, 42, 241, 71,
                179, 142, 92, 112,
                166, 25, 228, 59,
                216, 98, 15, 197
            ];

            for (let i = offset, j = 0; i < data.length; i++, j++) {
                data[i] ^= key[j & 15];
            }

            buffer = data.buffer.slice(
                data.byteOffset,
                data.byteOffset + data.byteLength
            );
        } else {
            buffer = u.buffer.slice(
                u.byteOffset + offset,
                u.byteOffset + u.byteLength
            );
        }

    return buffer;
}`;
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
class FlixCloud {
  url = "";
  data = {};
  constructor(url) {
    this.url = url;
  }
  Ct = (t) => {
    const e = atob(t);
    const s = new Uint8Array(e.length);
    for (let o = 0; o < e.length; o++) {
      s[o] = e.charCodeAt(o);
    }
    return s;
  };
  Qt = async (t) => {
    const e = new TextEncoder().encode(t);
    const s = await crypto.subtle.digest("SHA-256", e);
    return Array.from(new Uint8Array(s)).map((m) => m.toString(16).padStart(2, "0")).join("");
  };
  hn = async (t) => {
    let e = t;
    for (let o = 0; o < 3; o++) {
      e = await this.Qt(e + o.toString());
    }
    let s = e;
    for (let o = 0; o < 3; o++) {
      s = await this.Qt(s + o.toString());
    }
    return {
      videoField: `vf_${e.substring(0, 8)}`,
      keyField: `kf_${e.substring(8, 16)}`,
      ivField: `ivf_${e.substring(16, 24)}`,
      containerName: `cd_${e.substring(24, 32)}`,
      arrayName: `ad_${e.substring(32, 40)}`,
      objectName: `od_${e.substring(40, 48)}`,
      tokenField: `${e.substring(48, 64)}_${e.substring(56, 64)}`,
      keyFrag2Field: `${s.substring(0, 16)}_${s.substring(16, 24)}`
    };
  };
  gn = async (t, e) => {
    try {
      const container = t[e.containerName];
      if (typeof container !== "object" || container === null) {
        throw new Error("Container Not Found");
      }
      const array = container[e.arrayName];
      if (!Array.isArray(array) || array.length === 0) {
        throw new Error("Array Not Found");
      }
      const firstObject = array[0];
      if (typeof firstObject !== "object" || firstObject === null) {
        throw new Error("Object Not Found");
      }
      const object = firstObject[e.objectName];
      const key = object[e.keyField];
      const iv = object[e.ivField];
      if (typeof key !== "string" || typeof iv !== "string" || !key || !iv) return;
      return {
        frag1_b64: key,
        iv_b64: iv
      };
    } catch (error) {
      console.error("FlixCloud/GN ERROR", error);
      return;
    }
  };
  mn = async (t, e, s, o) => {
    const m = this.data.w_payload;
    const g = this.Ct(m);
    let Zt = (await WebAssembly.instantiate(g, {})).instance;
    const L = Zt.exports;
    const w = L.memory;
    if (w.buffer.byteLength === 0) {
      w.grow(1);
    }
    const S = new Uint8Array(w.buffer);
    const k = t.length;
    const I = 1e3;
    const P = I + k;
    const U = P + k;
    const nt = U + k;
    S.set(t, I);
    S.set(e, P);
    S.set(s, U);
    L._s(o);
    L._r(I, P, U, nt, k);
    const V = new Uint8Array(k);
    V.set(S.subarray(nt, nt + k));
    const b = L._c();
    return { array: V, key: btoa(String.fromCharCode(...new Uint8Array(L.memory.buffer).slice(b, b + 32))) };
  };
  yn = async () => {
    try {
      const t = this.data.obfuscated_crypto_data;
      const e = this.data.obfuscation_seed;
      if (!t || !e) {
        throw new Error("Missing obfuscated decryption data");
      }
      let o = await this.hn(e);
      if (!o) {
        throw new Error("Field mapping resolution failed");
      }
      const m = await this.gn(t, o);
      if (m == void 0) {
        throw new Error("Frag and IV Are undefined");
      }
      const keyComponent = this.data[o.keyFrag2Field];
      if (typeof keyComponent !== "string" || !keyComponent) {
        throw new Error("Missing key component");
      }
      const tokenField = o.tokenField;
      let token = null;
      for (const [key, value] of Object.entries(this.data)) {
        if (key === tokenField && typeof value === "string" && value.length > 0) {
          token = value;
          break;
        }
      }
      if (!token) {
        throw new Error("Missing token reference");
      }
      const url = new URL(this.url);
      let tokenResponse = await request(`${url.origin}/api/m3u8/${token}`, { headers: { ...PluginHeader, "Referer": url.origin } });
      if (!tokenResponse["success"]) {
        throw new Error("Failed Token Request");
      }
      tokenResponse = tokenResponse["json"];
      const k = (await this.Qt(token + "vid")).substring(0, 10);
      const I = (await this.Qt(token + "key")).substring(0, 10);
      const P = tokenResponse[k];
      const U = tokenResponse[I];
      if (!P || !U) {
        throw new Error("Incomplete token response");
      }
      const V = this.Ct(m.frag1_b64);
      const l = this.Ct(keyComponent);
      const f = this.Ct(U);
      const b = parseInt(e.substring(0, 8), 16);
      const O = await this.mn(V, l, f, b);
      const N = await crypto.subtle.importKey(
        "raw",
        O.array,
        {
          name: "PBKDF2"
        },
        false,
        ["deriveBits"]
      );
      const Y = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: new TextEncoder().encode(e),
          iterations: 1e3,
          hash: "SHA-256"
        },
        N,
        256
      );
      const keyMaterial = new Uint8Array(Y);
      for (let i = 0; i < 32; i++) {
        keyMaterial[i] ^= e.charCodeAt(i % e.length);
      }
      const ot = await crypto.subtle.digest(
        "SHA-256",
        keyMaterial
      );
      const fe = new Uint8Array(ot);
      const Nt = this.Ct(m.iv_b64);
      const At = this.Ct(P);
      const r = await crypto.subtle.importKey(
        "raw",
        fe,
        {
          name: "AES-CBC"
        },
        false,
        ["decrypt"]
      );
      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-CBC",
          iv: Nt
        },
        r,
        At
      );
      const M = new TextDecoder().decode(decrypted);
      if (!M || M.trim() === "") {
        throw new Error("Decryption resulted in empty URL");
      }
      return { url: M, decryptor: O.key };
    } catch (error) {
      console.error("FlixCloud Extractor Error", error);
      return;
    }
  };
  Extractor = async (playerdata) => {
    try {
      const response = await request(this.url, { headers: PluginHeader });
      if (!response["success"]) return void 0;
      const match = response.text.match(/data:\s*(\{[\s\S]*?\})\s*,\s*uses:/);
      if (!match || !match["1"]) return;
      this.data = Function(`"use strict"; return (${match["1"]})`)();
      const resp = await this.yn();
      if (!resp) return;
      const head = new URL(this.url);
      let subtitles = [];
      let chapters = [];
      if (this.data["subtitles"]) {
        subtitles = this.data["subtitles"].map((v) => ({
          url: v["url"],
          lang: "en",
          format: v["format"],
          label: v["language"],
          default: v["default"]
        }));
      }
      if (this.data["chapters"]) {
        for (let index = 0; index < this.data["chapters"].length; index++) {
          const element = this.data["chapters"][index];
          let type = "other";
          if (this.data["intro_chapter"] && this.data["intro_chapter"]["title"] == element["title"]) type = "opening";
          if (this.data["outro_chapter"] && this.data["outro_chapter"]["title"] == element["title"]) type = "ending";
          chapters.push({
            start: element["start"],
            end: element["end"],
            type,
            name: element["title"]
          });
        }
      }
      return {
        ...playerdata,
        resolution: [{
          res: "1080",
          url: resp.url,
          hls: true,
          reqHeader: {
            ...PlayerHEADER,
            "Referer": head.origin,
            "Origin": `${head.origin}/`
          },
          defaultSubtitles: subtitles.find((v) => v["default"]) ? true : false
        }],
        subtitles,
        listChapters: chapters,
        scripts: [{
          type: "hls_manifest",
          code: decryptor_content.replace("REPLACE_ME_TO_SECRET_KEY", resp["decryptor"])
        }, {
          type: "hls_arraybuffer",
          code: hls_converter
        }]
      };
    } catch (error) {
      console.error("FlixCloud/Extractor", error);
      return;
    }
  };
}
async function ExtractVideo(playerData2, url) {
  if (url.includes("flixcloud.cc")) return await new FlixCloud(url).Extractor(playerData2);
  console.error("ReAnime/ExtractVideo UNSUPORTED URL", playerData2, url);
  return;
}
class ReAnime {
  metadata = {
    version: "1.0",
    name: "ReAnime",
    author: "Owca525",
    supportLang: ["en"],
    urlWebsite: WEBSITE,
    type: "player"
  };
  extractPlayerData = async (_type, episode, id) => {
    const list_id = JSON.parse(id);
    const response = await request(`${WEBSITE}/api/flix/${list_id[0]}/${episode["ep"]}`, { headers: PluginHeader });
    if (!response["success"] || !response["json"] || !response["json"]["servers"]) return [];
    return response["json"]["servers"].map((v) => ({
      hostname: `${v["serverName"]} ${v["dataType"]}`,
      resolution: [],
      extractResolution: async (playerData2) => await ExtractVideo(playerData2, v["dataLink"])
    }));
  };
  extractEpisodeList = async (animeData, anime_id) => {
    if (animeData && !anime_id) {
      const search = await this.searchAnime(animeData["title"]["romaji"]);
      if (search.length <= 0) return;
      anime_id = SheepFinderAnime2000(search.map((v) => v["AnimeData"]), animeData);
    }
    if (!anime_id) return;
    const list_id = JSON.parse(anime_id);
    if (list_id[0] == 0 && animeData) {
      anime_id = JSON.stringify([animeData["id"], list_id[1]]);
    }
    const response = await request(`${WEBSITE}/api/v1/anime/${list_id[1]}/episodes?limit=2000`, { headers: PluginHeader });
    if (!response["success"] || !response["json"] || !response["json"]["data"]) return;
    return {
      player_id: anime_id,
      episodesData: [{
        episodes: response["json"]["data"].map((v) => ({
          ep: v["episode_number"],
          img: v["thumbnail"],
          title: v["title"],
          durration: v["duration"],
          episodeID: v["episodeId"]
        })),
        type: "both"
      }]
    };
  };
  extractOnlyEpisodesList = async (_type, anime_id) => {
    const episodes = await this.extractEpisodeList(void 0, anime_id);
    if (!episodes) return [];
    return episodes["episodesData"][0]["episodes"];
  };
  searchAnime = async (name, _page = 1, _params) => {
    const response = await request(`${WEBSITE}/api/v1/search?limit=5&q=${encodeURI(name)}`, { headers: PluginHeader });
    if (!response["success"] || !response["json"] || !response["json"]["results"]) return [];
    return response["json"]["results"].map((v) => ({
      AnimeData: {
        id: v["anilist_id"],
        player_ID: JSON.stringify([v["anilist_id"], v["anime_id"]]),
        title: v["title"],
        format: v["format"],
        status: v["status"],
        genres: v["genres"],
        season: v["season"],
        seasonYear: v["season_year"],
        episodes: v["episodes"],
        averageScore: v["average_score"],
        coverImage: v["cover_image"]["extra_large"] ? v["cover_image"]["extra_large"] : v["cover_image"]["large"]
      }
    }));
  };
  raportStatus = async () => {
    let results = [];
    async function wrapper(func) {
      try {
        const start = performance.now();
        const response = await func();
        const end = performance.now();
        return {
          time: end - start,
          work: response.length > 0
        };
      } catch (error) {
        return void 0;
      }
    }
    const functions = [
      async () => this.searchAnime("Oshi No Ko", 1),
      async () => this.extractPlayerData("sub", { ep: "1" }, '[150672,"oshi-no-ko-knjx62"]'),
      async () => this.extractOnlyEpisodesList("sub", '[150672,"oshi-no-ko-knjx62"]')
    ];
    for (let index = 0; index < functions.length; index++) {
      const element = functions[index];
      const tmp = await wrapper(element);
      await sleep(5e3);
      if (!tmp) {
        results.push({
          time: 0,
          work: false
        });
      } else {
        results.push(tmp);
      }
    }
    return {
      search: results[0],
      player: results[1],
      episodes: results[2]
    };
  };
}
export {
  ReAnime as default
};
