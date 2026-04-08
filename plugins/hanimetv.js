import { request } from "./index.js";
const WEBSITE = "https://hanime.tv/";
const API = "https://cached.freeanimehentai.net/";
const payload = `
delete globalThis.WorkerGlobalScope;
var window = new Proxy({
    top: { location: { origin: "https://hanime.tv" } },
    addEventListener: (e, cb) => {}
}, {
    set(o, k, v) {
        if (k == "ssignature" || k == "stime") self.postMessage(v)

        o[k] = v;
        return true;
    }
});
globalThis.window = window;
`;
const Header = {
  "Referer": "https://hanime.tv",
  "Origin": "https://hanime.tv",
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:147.0) Gecko/20100101 Firefox/147.0"
};
function convertToCardData(data) {
  return {
    AnimeData: {
      title: {
        native: data["name"],
        romaji: data["name"]
      },
      id: "",
      coverImage: data["cover_url"],
      player_ID: `${data["id"]}?/${data["slug"]}`,
      description: data["description"],
      genres: data["tags"]
    }
  };
}
function convertFranchiseToEpisodes(data) {
  return [
    {
      episodes: data.map((v) => {
        return {
          ep: v["slug"].split("-").at(-1),
          img: v["poster_url"]
        };
      }),
      type: "sub"
    }
  ];
}
class HanimeTv {
  metadata = {
    version: "1.0",
    name: "Hanime.tv",
    author: "Owca525",
    supportLang: ["en"],
    urlWebsite: WEBSITE,
    icon: "https://hanime.tv/apple-touch-icon-precomposed.png"
  };
  cache = {
    vendor: void 0,
    hentaiListCache: [],
    fetchedAnimeInfoCache: []
  };
  getVendorTokens = async () => {
    if (this.cache.vendor == void 0) {
      const websiteResp = await request(WEBSITE, {
        headers: Header
      });
      const regex = /https:\/\/hanime-cdn\.com\/js\/vendor\.[a-f0-9]+\.min\.js/g;
      const matches = websiteResp.text.match(regex);
      if (!matches) return void 0;
      const resp = await request(matches[0], {
        headers: Header
      });
      if (!resp.text || !resp.success) return void 0;
      this.cache = {
        ...this.cache,
        vendor: resp.text
      };
    }
    const blob = new Blob([payload + this.cache.vendor], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    let token = "";
    let time = "";
    return new Promise((resolve, reject) => {
      const worker = new Worker(url);
      worker.onmessage = (event) => {
        if (typeof event.data == "object") return console.log(event.data);
        if (typeof event.data == "string") token = event.data;
        else time = event.data;
        console.log(event.data);
        console.log(token, time);
        if (token != "" && time != "") {
          resolve({
            time,
            token
          });
          worker.terminate();
        }
        worker.onerror = (err) => {
          reject(err);
          console.error("Failed Find Token plugin/hanimetv", err);
          worker.terminate();
        };
      };
    });
  };
  extractPlayerData = async (_type, episode, id) => {
    const splitedID = id.split("?/");
    console.log(this.cache.fetchedAnimeInfoCache);
    if (!this.cache.fetchedAnimeInfoCache[splitedID[0]]) return [];
    const data = this.cache.fetchedAnimeInfoCache[splitedID[0]]["hentai_franchise_hentai_videos"];
    const tmp = data.find((v) => v["slug"].split("-").includes(episode));
    console.log(tmp, data);
    if (!tmp) return [];
    const tokens = await this.getVendorTokens();
    console.log(tokens);
    if (!tokens) return [];
    const response = await request(`${API}api/v8/guest/videos/${tmp["id"]}/manifest`, {
      headers: {
        "Accept": "application/json",
        ...Header,
        "x-signature": tokens.token,
        "x-signature-version": "web2",
        "x-time": tokens.token
      }
    });
    if (!response.json || !response.success) {
      console.error("Failed Request extractPlayerData/hanime", response);
      return [];
    }
    return [{
      hostname: "hanime.tv",
      splitHLS: true,
      resolution: response.json["videos_manifest"]["servers"][0]["streams"].map((v) => {
        return {
          res: v["height"],
          hls: v["kind"] == "hls",
          url: v["url"],
          reqHeader: Header
        };
      })
    }];
  };
  extractEpisodeList = async (animeData, anime_id) => {
    let mainAnimeID = anime_id;
    if (animeData && !anime_id) {
      const search = await this.searchAnime(animeData.title.romaji, 1);
      if (search.length <= 0) return;
      mainAnimeID = search[0].AnimeData.player_ID;
    }
    if (!mainAnimeID) return;
    const tokens = await this.getVendorTokens();
    if (!tokens) return;
    const splitedID = mainAnimeID.split("?/");
    if (this.cache.fetchedAnimeInfoCache[splitedID[0]]) {
      return {
        player_id: mainAnimeID,
        episodesData: convertFranchiseToEpisodes(this.cache.fetchedAnimeInfoCache[splitedID[0]]["hentai_franchise_hentai_videos"])
      };
    }
    const response = await request(`${API}api/v8/video?id=${splitedID[1]}&=`, {
      headers: {
        "Accept": "application/json",
        ...Header,
        "x-signature": tokens.token,
        "x-signature-version": "web2",
        "x-time": tokens.token
      }
    });
    if (!response.json || !response.success) {
      console.error("Failed Request extractEpisodeList/Hanime.tv", response);
      return;
    }
    this.cache = {
      ...this.cache,
      fetchedAnimeInfoCache: {
        ...this.cache.fetchedAnimeInfoCache,
        [splitedID[0]]: response.json
      }
    };
    return {
      player_id: mainAnimeID,
      episodesData: convertFranchiseToEpisodes(response.json["hentai_franchise_hentai_videos"])
    };
  };
  extractOnlyEpisodesList = async (_type, anime_id) => {
    const response = await this.extractEpisodeList(void 0, anime_id);
    if (!response) return [];
    if (response.episodesData.length <= 0) return [];
    return response.episodesData[0].episodes;
  };
  searchAnime = async (name, _page, _params) => {
    const tokens = await this.getVendorTokens();
    if (!tokens) return [];
    if (this.cache.hentaiListCache.length <= 0) {
      const resp = await request(`${API}api/v10/search_hvs`, {
        headers: {
          "Accept": "application/json",
          ...Header,
          "x-signature": tokens.token,
          "x-signature-version": "web2",
          "x-time": tokens.token
        }
      });
      if (!resp.json || !resp.success) {
        console.error("Failed Request searchAnime/Hanime.tv", resp);
        return [];
      }
      this.cache = {
        ...this.cache,
        hentaiListCache: resp.json
      };
    }
    return this.cache.hentaiListCache.filter((v) => v["search_titles"].toString().includes(name)).map((v) => convertToCardData(v));
  };
}
export {
  HanimeTv as default
};
