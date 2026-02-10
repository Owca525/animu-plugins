import { request, t } from "./index.js";
const BACKEND = "https://ani.metsu.site";
const WEBSITE = "https://animetsu.bz/";
const HEADER = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  "Origin": WEBSITE,
  "Referer": WEBSITE
};
async function extractResolutions(episode, type, playerData2, server) {
  try {
    if (!server) return void 0;
    let response = await request(`${BACKEND}/api/anime/oppai/${server}/${episode}?server=default&source_type=${type}`, { headers: HEADER });
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
      url: `${BACKEND}/proxy${element["url"]}`,
      defaultSubtitles: subtitles.length > 0,
      hls: true,
      reqHeader: {
        ...HEADER
      }
    }));
    let chapters = response.json["skips"] ? [
      { start: response.json["skips"]["intro"]["start"], end: response.json["skips"]["intro"]["end"], type: "opening" },
      { start: response.json["skips"]["outro"]["start"], end: response.json["skips"]["outro"]["end"], type: "ending" }
    ] : [];
    return {
      ...playerData2,
      splitHLS: resolutions[0].res != "master",
      resolution: resolutions,
      subtitles,
      listChapters: chapters.filter((chapter) => !(chapter.start === 0 && chapter.end === 0))
    };
  } catch (error) {
    console.error("extractResolutions/Animetsu", error);
    return;
  }
}
class Animetsu {
  metadata = {
    version: "1.0",
    name: "Animetsu.Live",
    icon: "https://animetsu.live/apple-touch-icon.png",
    author: "Owca525",
    supportLang: ["en"],
    urlWebsite: WEBSITE
  };
  extractPlayerData = async (_type, episode, id) => {
    try {
      let response = await request(`${BACKEND}/api/anime/servers/${id}/${episode}`, { headers: HEADER });
      if (!response.success || !response.json) {
        console.warn("extractPlayerData/Animetsu request failed", response);
        return [];
      }
      let data = [];
      for (let index = 0; index < response.json.length; index++) {
        const element = response.json[index];
        data.push({
          hostname: element["id"],
          defaultHost: element["default"],
          resolution: [],
          extractResolution: async (playerData2) => await extractResolutions(episode, "sub", playerData2, id),
          isDubbing: async (playerData2) => (await extractResolutions(episode, "dub", playerData2, id))?.resolution
        });
      }
      return data;
    } catch (error) {
      console.error("exctractPlayerData/Animetsu", error);
      return [];
    }
  };
  extractEpisodeList = async (animeData, anime_id) => {
    try {
      let animeID = anime_id;
      if (animeData) {
        const results = await this.searchAnime(animeData.title.romaji, 0);
        for (let index = 0; index < results.length; index++) {
          const element = results[index];
          if (element.AnimeData.id == animeData.id) animeID = element.AnimeData.player_ID;
        }
      }
      if (!animeID) return;
      let response = await request(`${BACKEND}/api/anime/eps/${animeID}`, { headers: HEADER });
      if (!response.success || !response.json) {
        console.warn("extractEpisodeList/Animetsu request failed", response);
        return;
      }
      let episodes = response.json.map((element) => {
        return {
          ep: element["ep_num"],
          img: `${BACKEND}/proxy${element["img"]}`,
          title: element["name"]
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
      console.error("extractEpisodeList/Animetsu", error);
      return void 0;
    }
  };
  extractOnlyEpisodesList = async (_type, anime_id) => {
    let data = await this.extractEpisodeList(void 0, anime_id);
    if (!data) return [];
    return data.episodesData[0].episodes;
  };
  searchAnime = async (name, _page, _params) => {
    let response = await request(`${BACKEND}/api/anime/search/?query=${name}`, { headers: HEADER });
    if (!response.success || !response.json) return [];
    let data = [];
    for (let index = 0; index < response.json.results.length; index++) {
      const element = response.json.results[index];
      data.push({
        AnimeData: {
          genres: void 0,
          characters: [],
          studios: [],
          title: element["title"],
          id: element["anilist_id"],
          player_ID: element["id"],
          coverImage: element["cover_image"]["extraLarge"] ? element["cover_image"]["extraLarge"] : element["cover_image"]["large"]
        }
      });
    }
    return data;
  };
}
export {
  Animetsu as default
};
