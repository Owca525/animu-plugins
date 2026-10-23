import { getAnimeSeasonFromDate, request, SheepFinderAnime2000, sleep } from "./index.js";
const WEBSITE = "https://hianime.at";
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
  "Referer": WEBSITE,
  "Origin": WEBSITE
};
const SUPPORTED_PLAYERS = {
  zokoanime: "https://zokoanime.video/",
  megaplay: "https://megaplay.buzz/"
};
class ExtractorPlayer {
  hostname = "";
  constructor(hostname) {
    this.hostname = hostname;
  }
  extract = async (url) => {
    try {
      const finded = Object.values(SUPPORTED_PLAYERS).find((v) => url.startsWith(v));
      switch (finded) {
        case SUPPORTED_PLAYERS.zokoanime:
          return await this.zokoanime(url);
        case SUPPORTED_PLAYERS.megaplay:
          return await this.megaplay(url);
      }
      console.error("ExtractorPlayer/hianime unsuported player", url);
      return;
    } catch (error) {
      console.error("ExtractorPlayer/hianime Failed Extract", error);
      return;
    }
  };
  zokoanime = async (url) => {
    const req = await request(url, { headers: PluginHeader });
    if (!req["success"]) return;
    const regex = String(req["text"]).match(/window\.(?<name>__[A-Za-z0-9_$]+)\s*=\s*"(?<value>[^"]+)"/);
    if (!regex || !regex["groups"]) return;
    const str = atob(regex["groups"]["value"]);
    const OBF_KEY = "otaku-embed-v1";
    let out = "";
    for (let i = 0; i < str.length; i++) {
      out += String.fromCharCode(str.charCodeAt(i) ^ OBF_KEY.charCodeAt(i % OBF_KEY.length));
    }
    const content = JSON.parse(decodeURIComponent(escape(out)));
    let subs = [];
    let chapters = [];
    if (content["subtitles"]) {
      subs = content["subtitles"].map((v) => ({
        url: v["src"],
        lang: v["lang"],
        label: v["label"],
        default: v["default"],
        format: `${v["src"]}`.split(".").at(-1)
      }));
    }
    if (content["skip"]) {
      if (content["skip"]["intro"]) {
        chapters.push({
          start: content["skip"]["intro"]["start"],
          end: content["skip"]["intro"]["end"],
          type: "opening"
        });
      }
      if (content["skip"]["outro"]) {
        chapters.push({
          start: content["skip"]["outro"]["start"],
          end: content["skip"]["outro"]["end"],
          type: "ending"
        });
      }
    }
    const tmp_url = new URL(url);
    return {
      hostname: this.hostname,
      resolution: [{
        res: "1080",
        url: content["src"],
        defaultSubtitles: subs.length > 0,
        hls: true,
        reqHeader: {
          ...PluginHeader,
          "Referer": tmp_url["origin"],
          "Origin": tmp_url["origin"]
        }
      }],
      subtitles: subs,
      listChapters: chapters
    };
  };
  megaplay = async (url) => {
    const url_object = new URL(url);
    const website_response = await request(url, { headers: PluginHeader });
    if (!website_response["success"]) return;
    const match = website_response["text"].match(/data-id="(\d+)"/);
    if (!match) return;
    const website_api_response = await request(`${url_object.origin}/stream/getSources?id=${match[1]}&platform=OTHER&s=tcdn`, {
      headers: {
        ...PluginHeader,
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Alt-Used": url_object.hostname,
        "Referer": url,
        "Origin": url
      }
    });
    if (!website_api_response["success"] || !website_api_response["json"]) return;
    const str_encrypted = website_api_response["json"]["enc"];
    function sourceEncPadKeyBytes(e, t) {
      const a2 = new TextEncoder().encode(String(e)), r2 = new Uint8Array(t);
      return r2.set(a2.subarray(0, Math.min(t, a2.length))), r2;
    }
    function sourceEncB64UrlDecode(e) {
      let t = String(e).replace(/-/g, "+").replace(/_/g, "/");
      const a2 = t.length % 4;
      a2 && (t += "====".slice(a2));
      const r2 = atob(t), n = new Uint8Array(r2.length);
      for (let e2 = 0; e2 < r2.length; e2++)
        n[e2] = r2.charCodeAt(e2);
      return n;
    }
    function decryptSourcesEnc(e) {
      const t = sourceEncPadKeyBytes("i?LMTAx0Q6,:}50U", 32), a2 = sourceEncPadKeyBytes("W0;27ToaUpl_P%'c", 16);
      return crypto.subtle.importKey("raw", t, {
        name: "AES-CBC"
      }, false, ["decrypt"]).then((t2) => crypto.subtle.decrypt({
        name: "AES-CBC",
        iv: a2
      }, t2, sourceEncB64UrlDecode(e))).then(
        (e2) => {
          const t2 = new TextDecoder().decode(e2), a3 = JSON.parse(t2);
          if (!a3 || "string" != typeof a3.file)
            throw new Error("Invalid enc payload");
          return a3["file"];
        }
      );
    }
    function sourceEncB64UrlEncode(e) {
      let t = "";
      const a2 = e instanceof ArrayBuffer ? new Uint8Array(e) : e;
      for (let e2 = 0; e2 < a2.length; e2++)
        t += String.fromCharCode(a2[e2]);
      return btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }
    let master_url = await decryptSourcesEnc(str_encrypted);
    function createCdnToken(e) {
      const t = Math.floor(Date.now() / 1e3) + 90, a2 = String(t) + "|" + e, r2 = new TextEncoder();
      return crypto.subtle.importKey("raw", r2.encode("MpCdnT0k3n!9f2K#xQ7vL5mR8wN1pY4s"), {
        name: "HMAC",
        hash: "SHA-256"
      }, false, ["sign"]).then((e2) => crypto.subtle.sign("HMAC", e2, r2.encode(a2))).then((e2) => sourceEncB64UrlEncode(r2.encode(a2)) + "." + sourceEncB64UrlEncode(e2));
    }
    function extractCdnPathKey(e) {
      const t = String(e).match(/\/([a-f0-9]{32})\/([a-f0-9]{32})\//i);
      return t ? t[1].toLowerCase() + "/" + t[2].toLowerCase() : null;
    }
    const a = await createCdnToken(extractCdnPathKey(master_url));
    const r = master_url.indexOf("?") >= 0 ? "&" : "?";
    const new_url = master_url + r + "token=" + encodeURIComponent(a);
    let subs = [];
    let chapters = [];
    if (website_api_response["json"]["tracks"]) {
      website_api_response["json"]["tracks"].forEach((element) => {
        subs.push({
          url: element["file"],
          lang: element["label"],
          label: element["label"],
          format: `${element["file"]}`.split(".").at(-1) ?? "vtt",
          default: element["default"]
        });
      });
    }
    if (website_api_response["json"]["intro"]) {
      chapters.push({
        start: website_api_response["json"]["intro"]["start"],
        end: website_api_response["json"]["intro"]["end"],
        type: "opening"
      });
    }
    if (website_api_response["json"]["outro"]) {
      chapters.push({
        start: website_api_response["json"]["outro"]["start"],
        end: website_api_response["json"]["outro"]["end"],
        type: "opening"
      });
    }
    return {
      hostname: this.hostname,
      resolution: [{
        res: "1080",
        url: new_url,
        hls: true,
        reqHeader: {
          "accept": "*/*",
          "accept-encoding": "gzip, deflate, br, zstd",
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "no-cache",
          "origin": `${url_object.origin}`,
          "pragma": "no-cache",
          "priority": "u=1, i",
          "referer": `${url_object.origin}/`,
          // "sec-ch-ua": '"Chromium";v="153", "Not_A Brand";v="8"',
          "sec-ch-ua-mobile": "?0",
          // "sec-ch-ua-platform": '"Linux"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": navigator.userAgent
        },
        defaultSubtitles: subs.length > 0
      }],
      subtitles: subs,
      listChapters: chapters
    };
  };
}
class HIanime {
  metadata = {
    version: "1.1",
    name: "HIanime",
    author: "Owca525",
    supportLang: ["en"],
    urlWebsite: WEBSITE,
    type: "player",
    icon: `${WEBSITE}/theme/images/logo.png`
  };
  extractPlayerData = async (_type, episode, _id) => {
    const playerResponse = await request(`${WEBSITE}/api/theme/episode/servers?episodeId=${episode["episodeID"]}`, { headers: PluginHeader });
    if (!playerResponse["success"] || !playerResponse["json"]) return [];
    const regex = /<div\b[^>]*\bclass="[^"]*\bserver-item\b[^"]*"[^>]*\bdata-type="(?<type>[^"]+)"[^>]*\bdata-server-name="(?<serverName>[^"]+)"[^>]*\bdata-hash="(?<hash>[^"]+)"[^>]*>/g;
    const data = [...String(playerResponse["json"]["html"]).matchAll(regex)].map((value, i) => {
      if (!value["groups"]) return;
      const url = String(atob(value["groups"]["hash"]));
      const finded = Object.values(SUPPORTED_PLAYERS).find((v) => url.startsWith(v));
      if (!finded) return;
      return {
        hostname: `${value["groups"]["serverName"]} ${value["groups"]["type"]}`,
        defaultHost: i == 0,
        url
      };
    }).filter((v) => v != void 0);
    if (data.length <= 0) return [];
    return data.map((v) => ({
      hostname: v["hostname"],
      defaultHost: v["defaultHost"],
      resolution: [],
      extractResolution: async () => await new ExtractorPlayer(v["hostname"]).extract(v["url"])
    }));
  };
  extractEpisodeList = async (animeData, anime_id) => {
    if (animeData && !anime_id) {
      const searchResponse = await this.searchAnime(animeData["title"]["english"] ?? animeData["title"]["romaji"], 1);
      if (searchResponse.length <= 0) return;
      anime_id = SheepFinderAnime2000(searchResponse.map((v) => v.AnimeData), animeData);
    }
    if (!anime_id) return;
    const episodeResponse = await request(`${WEBSITE}/api/theme/episode/list/${anime_id.split("-").at(-1)}`, { headers: PluginHeader });
    if (!episodeResponse["success"] || !episodeResponse["json"]) return;
    const regex = /<a\b[^>]*\btitle="(?<title>[^"]+)"[^>]*\bdata-number="(?<number>\d+)"[^>]*\bdata-id="(?<id>\d+)"[^>]*>/g;
    return {
      player_id: anime_id,
      episodesData: [{
        episodes: [...String(episodeResponse["json"]["html"]).matchAll(regex)].map((element) => {
          if (!element["groups"]) return;
          return {
            ep: element["groups"]["number"],
            episodeID: element["groups"]["id"],
            title: element["groups"]["title"]
          };
        }).filter((v) => v != void 0),
        type: "sub"
      }]
    };
  };
  extractOnlyEpisodesList = async (_type, anime_id) => {
    const response = await this.extractEpisodeList(void 0, anime_id);
    if (!response) return [];
    return response["episodesData"][0]["episodes"];
  };
  searchAnime = async (name, _page, _params) => {
    const response = await request(`${WEBSITE}/api/theme/search/suggestions?keyword=${encodeURIComponent(name)}`, { headers: PluginHeader });
    if (!response["success"] || !response["json"]) return [];
    const regex = /<a\b[^>]*\bhref="(?<href>[^"]+)"[^>]*\btitle="(?<title>[^"]+)"[^>]*>[\s\S]*?<img\b[^>]*\bsrc="(?<imgSrc>[^"]+)"[^>]*>[\s\S]*?<div\b[^>]*\bclass="[^"]*\bfilm-infor\b[^"]*"[^>]*>[\s\S]*?<span\b[^>]*>\s*(?<date>[^<]+?)\s*<\/span>[\s\S]*?<i\b[^>]*>\s*<\/i>\s*(?<format>[^<]+?)\s*<i\b[^>]*>\s*<\/i>[\s\S]*?<span\b[^>]*>\s*(?<time>[^<]+?)\s*<\/span>/g;
    const match = [...String(response["json"]["html"]).matchAll(regex)];
    return match.map((element) => {
      if (!element["groups"]) return;
      const id = element["groups"]["href"].split("/").at(-1);
      const date = getAnimeSeasonFromDate(element["groups"]["date"]);
      return {
        AnimeData: {
          title: {
            english: element["groups"]["title"],
            native: element["groups"]["title"],
            romaji: element["groups"]["title"]
          },
          id: "",
          season: date["season"],
          seasonYear: date["seasonYear"],
          coverImage: element["groups"]["imgSrc"],
          player_ID: id,
          format: element["groups"]["format"]
        }
      };
    }).filter((v) => v != void 0);
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
      async () => this.searchAnime("My Star", 1),
      async () => this.extractPlayerData("sub", { ep: "1", episodeID: "12117" }, "oshi-no-ko-675"),
      async () => this.extractOnlyEpisodesList("sub", "oshi-no-ko-675")
    ];
    for (let index = 0; index < functions.length; index++) {
      const element = functions[index];
      const tmp = await wrapper(element);
      await sleep(Math.floor(Math.random() * (5e3 - 2e3 + 1)) + 2e3);
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
  HIanime as default
};
