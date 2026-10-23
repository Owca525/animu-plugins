import { request as SheepRequest } from "./index.js";
const WEBSITE = "https://www.animeonsen.xyz";
const SEARCH_API = "https://search.animeonsen.xyz";
const API = "https://api.animeonsen.xyz";
const POST_TOKEN = "0e36d0275d16b40d7cf153634df78bc229320d073f565db2aaf6d027e0c30b13";
const header = {
  "User-Agent": navigator.userAgent,
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Sec-GPC": "1",
  Connection: "keep-alive",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "cross-site",
  "Referer": `${WEBSITE}/`
};
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function generateToken(str) {
  try {
    if (!str) return;
    str = str.split(";")[0].split("=")[1];
    str = decodeURIComponent(str);
    str = str.split("=")[0].trim().replace(/[^+/0-9A-Za-z-_]/g, "");
    if (str.length < 2) return;
    while (str.length % 4 !== 0) {
      str += "=";
    }
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    str = new TextDecoder("utf-8").decode(bytes.subarray(0, bytes.length));
    window["animeonsen_get_token"] = str.split("").reduce((e, t) => e + String.fromCharCode(t.charCodeAt(0) + 1), "");
  } catch (error) {
    console.error("AnimeOnsen/generateToken FAILED GENERATE TOKEN");
  }
}
async function request(url, options = {}) {
  await sleep(Math.floor(Math.random() * (2e3 - 1e3 + 1)) + 1e3);
  if (window["animeonsen_get_token"] == void 0) {
    const resp = await SheepRequest(WEBSITE, { headers: header });
    const finded = resp.responseHeader.entries().find(([k, _]) => k == "set-cookie");
    if (finded) generateToken(finded["1"]);
  }
  const get_token = window["animeonsen_get_token"] ?? "";
  return await SheepRequest(url, {
    ...options,
    headers: {
      ...options["headers"],
      ...header,
      "Authorization": `Bearer ${options["method"] == "POST" ? POST_TOKEN : get_token}`
    }
  });
}
function SearchAnime(anime, target) {
  const list = Object.values(anime["title"]);
  for (let index = 0; index < target.length; index++) {
    const element = target[index];
    const finded = Object.values(element["AnimeData"]["title"]).find((v) => list.includes(v));
    if (finded) return element["AnimeData"]["player_ID"];
  }
  return;
}
class AnimeOnsen {
  metadata = {
    version: "1.3",
    name: "AnimeOnsen",
    author: "Owca525",
    supportLang: ["en"],
    urlWebsite: WEBSITE,
    type: "player",
    icon: `${WEBSITE}/favicon/192x192.png`
  };
  extractPlayerData = async (_type, episode, id) => {
    const tmpEpisode = typeof episode == "object" ? episode["ep"] : episode;
    const response = await request(`${API}/v4/content/${id}/video/${tmpEpisode}`);
    if (!response["success"] || !response["json"] || !response["json"]["uri"]) return [];
    return [{
      hostname: "AnimeOnsen",
      subtitles: response["json"]["uri"]["subtitles"] ? Object.entries(response["json"]["uri"]["subtitles"]).map((v) => ({
        url: v["1"],
        format: "ass",
        label: v["0"],
        lang: v[0].split("-")[0]
      })) : [],
      resolution: [{
        res: "1080",
        url: response["json"]["uri"]["stream"],
        hls: response["json"]["uri"]["stream"].includes(".m3u8"),
        reqHeader: { ...header, "Referer": `${WEBSITE}/` },
        defaultSubtitles: true
      }]
    }];
  };
  extractEpisodeList = async (animeData, anime_id) => {
    let animeID = anime_id;
    if (animeData && !animeID) {
      const searched = await this.searchAnime(animeData["title"]["romaji"], 1);
      if (searched.length <= 0) return;
      animeID = SearchAnime(animeData, searched);
    }
    if (!animeID) return;
    const response = await request(`${API}/v4/content/${animeID}/episodes`);
    if (!response["success"] || !response["json"]) return;
    return {
      player_id: animeID,
      langugeAvaible: ["en", "jpn"],
      episodesData: [{
        episodes: Object.entries(response["json"]).map((v) => ({
          ep: v["0"],
          title: v["1"]["contentTitle_episode_en"]
        })),
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
    const response = await request(`${SEARCH_API}/indexes/content/search`, {
      method: "POST",
      headers: {
        ...header,
        "Content-Type": "application/json",
        "X-Meilisearch-Client": "Meilisearch instant-meilisearch (v0.8.2) ; Meilisearch JavaScript (v0.27.0)"
      },
      body: JSON.stringify({
        "q": name,
        "attributesToHighlight": ["*"],
        "highlightPreTag": "__ais-highlight__",
        "highlightPostTag": "__/ais-highlight__",
        "limit": 5
      })
    });
    if (!response["success"] || !response["json"]) return [];
    try {
      return response["json"]["hits"].map((v) => ({
        AnimeData: {
          title: {
            english: v["content_title_en"],
            native: v["content_title_jp"],
            romaji: v["content_title"]
          },
          coverImage: `${API}/v4/image/210x300/${v["content_id"]}`,
          player_ID: v["content_id"],
          id: ""
        }
      }));
    } catch (error) {
      console.error("AnimeOnsen/searchAnime", error);
      return [];
    }
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
      async () => this.extractPlayerData("sub", { ep: "1" }, "1uQJfaeOMCu8V7YR"),
      async () => this.extractOnlyEpisodesList("sub", "1uQJfaeOMCu8V7YR")
    ];
    for (let index = 0; index < functions.length; index++) {
      const element = functions[index];
      const tmp = await wrapper(element);
      await sleep(Math.floor(Math.random() * (5e3 - 5e3 + 1)) + 5e3);
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
  AnimeOnsen as default
};
