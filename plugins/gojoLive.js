import { request, t } from "./index.js";
const BACKEND = "https://backend.animetsu.bz";
const WEBSITE = "https://animetsu.bz/";
const HEADER = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  "Origin": WEBSITE,
  "Referer": WEBSITE
};
async function extractResolutions(episode, type, playerData2, server, id) {
  try {
    if (!server) return void 0;
    let response = await request(`${BACKEND}/api/anime/tiddies?server=${server}&id=${id}&num=${episode}&subType=${type}`, { headers: HEADER });
    if (!response.success || !response.json) return void 0;
    let subtitles = [];
    if (response.json["subtitles"]) {
      subtitles = response.json["subtitles"].map((element) => {
        const parts = element["url"].split(".");
        const lastPart = parts.pop();
        return { url: element["url"], lang: "en", label: element["lang"], format: lastPart };
      });
    }
    let resolutions = response.json["sources"].map((element) => ({
      res: element["quality"],
      url: element["url"],
      defaultSubtitles: subtitles.length > 0,
      hls: true,
      reqHeader: {
        ...HEADER
      }
    }));
    let chapters = response.json["skips"] ? [
      { start: response.json["skips"]["op"]["startTime"], end: response.json["skips"]["op"]["endTime"], type: "opening" },
      { start: response.json["skips"]["ed"]["startTime"], end: response.json["skips"]["ed"]["endTime"], type: "ending" }
    ] : [];
    return {
      ...playerData2,
      splitHLS: resolutions[0].res != "master",
      resolution: resolutions,
      subtitles,
      listChapters: chapters.filter((chapter) => !(chapter.start === 0 && chapter.end === 0))
    };
  } catch (error) {
    console.error("extractResolutions/GojoLive", error);
    return;
  }
}
class GojoLive {
  metadata = {
    version: "1.2",
    name: "GojoLive",
    icon: "https://animetsu.bz/android-chrome-512x512.png",
    author: "Owca525",
    supportLang: ["en"],
    urlWebsite: WEBSITE
  };
  extractPlayerData = async (_type, episode, id) => {
    try {
      let response = await request(`${BACKEND}/api/anime/servers?id=${id}&num=${episode}`, { headers: HEADER });
      if (!response.success || !response.json) return [];
      let data = [];
      for (let index = 0; index < response.json.length; index++) {
        const element = response.json[index];
        data.push({
          hostname: element["id"],
          defaultHost: element["default"],
          resolution: [],
          extractResolution: async (playerData2) => await extractResolutions(episode, "sub", playerData2, element["id"], id),
          isDubbing: async (playerData2) => (await extractResolutions(episode, "dub", playerData2, element["id"], id))?.resolution
        });
      }
      return data;
    } catch (error) {
      console.error("exctractPlayerData/GojoLive", error);
      return [];
    }
  };
  extractEpisodeList = async (animeData, anime_id) => {
    try {
      let animeID = anime_id;
      if (animeData) animeID = animeData.id;
      if (!animeID) return;
      let response = await window.api.request.get(`${BACKEND}/api/anime/eps/${animeID}`, HEADER);
      if (!response.success || !response.data) return;
      let episodes = response.data.map((element) => {
        return {
          ep: element["number"],
          img: element["image"],
          title: element["title"]
        };
      });
      return {
        player_id: animeID,
        episodesData: [{
          episodes,
          type: "sub",
          name: `${t("information.types.sub")}/${t("information.types.dub")}`
        }]
      };
    } catch (error) {
      console.error("extractEpisodeList/GojoLive", error);
      return void 0;
    }
  };
  extractOnlyEpisodesList = async (_type, anime_id) => {
    let data = await this.extractEpisodeList(void 0, anime_id);
    if (!data) return [];
    return data.episodesData[0].episodes;
  };
  searchAnime = async (name, page, _params) => {
    let response = await window.api.request.get(`${BACKEND}/api/anime/search?query=${name}&page=${page}&perPage=35&year=any&sort=POPULARITY_DESC&season=any&format=any&status=any`, HEADER);
    if (!response.success || !response.data) return [];
    let data = [];
    for (let index = 0; index < response.data.results.length; index++) {
      const element = response.data.results[index];
      data.push({
        AnimeData: {
          genres: void 0,
          characters: [],
          studios: [],
          title: element["title"],
          id: element["id"],
          player_ID: element["id"],
          coverImage: element["coverImage"]["extraLarge"] ? element["coverImage"]["extraLarge"] : element["coverImage"]["large"]
        }
      });
    }
    return data;
  };
}
export {
  GojoLive as default
};
