import { request, SheepFinderAnime2000 } from "./index.js";
const WEB = "https://www.lycoris.cafe";
const HEADER = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:149.0) Gecko/20100101 Firefox/149.0",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Sec-GPC": "1",
  Connection: "keep-alive",
  Referer: WEB,
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "cross-site"
};
function timeToSeconds(time) {
  const [hms] = time.split(".");
  const parts = hms.split(":").map(Number);
  const [hours, minutes, seconds] = parts;
  return hours * 3600 + minutes * 60 + seconds;
}
function detectResoltion(text) {
  switch (text) {
    case "SD":
      return "480";
    case "HD":
      return "720";
    case "FHD":
      return "1080";
  }
  return "Unknown";
}
function DetectURL(str) {
  const splited = str.split(" ");
  for (let index = 0; index < splited.length; index++) {
    try {
      const url = new URL(splited[index]);
      if (url.protocol === "http:" || url.protocol === "https:") return splited[index];
    } catch (error) {
    }
  }
  return "";
}
function convertToAnimeData(data) {
  try {
    return {
      characters: [],
      studios: [data["studio"]],
      genres: data["genres"],
      title: {
        english: data["englishTitle"],
        native: "",
        romaji: data["title"]
      },
      id: data["id"],
      player_ID: data["id"],
      format: data["format"],
      season: data["season"],
      seasonYear: data["seasonYear"],
      source: data["source"],
      status: data["status"],
      averageScore: data["rating"] ? data["rating"] * 10 : void 0,
      coverImage: data["poster"],
      nextAiringEpisode: data["nextAiringEpisode"],
      bannerImage: data["background"]
    };
  } catch (error) {
    return void 0;
  }
}
function dateToUnix(dateStr) {
  if (!dateStr) return void 0;
  const date = new Date(dateStr);
  return Math.floor(date.getTime() / 1e3);
}
async function requestToApi(anime_id) {
  let url = `${WEB}/api/anime/${anime_id}`;
  let req = await request(url, { headers: HEADER });
  if (!req.success) {
    console.error("Failed Request requestToApi/lycorisCafe", anime_id, req);
    return void 0;
  }
  return { data: req.json };
}
async function otherExtractor(id) {
  try {
    let reqID = await request(`${WEB}/api/watch/getRumbleVideoLink?id=${id}`, { headers: HEADER });
    if (!reqID["success"] || !reqID["json"]) return [];
    return [{
      hostname: "lycoris.cafe",
      splitHLS: true,
      resolution: Object.entries(reqID["json"]["allQualities"]).map(([res, data]) => ({
        res,
        url: data["url"],
        reqHeader: HEADER,
        hls: true
      })).reverse()
    }];
  } catch (error) {
    console.error("Error otherExtractor Lycoris Cafe", error);
    return [];
  }
}
class LycorisCafe {
  metadata = {
    version: "1.8",
    name: "Lycoris.cafe",
    author: "Owca525",
    icon: `${WEB}/favicon.ico`,
    urlWebsite: WEB,
    supportLang: ["pl"],
    type: "player"
  };
  extractPlayerData = async (_type, episode, id) => {
    let mainEpisode = typeof episode == "object" ? episode.ep : episode;
    let req = await requestToApi(id);
    if (!req) return [];
    let episodes = req.data.anime["episodes"];
    let currentEpisode = [];
    let subtitles = [];
    let chapters = [];
    let tmp = episodes.find((element) => parseInt(element.number) == parseInt(mainEpisode));
    if (!tmp) return [];
    let reqID = await request(`${WEB}/api/watch/getVideoLink?id=${tmp.id}`, { headers: HEADER });
    if (!reqID.success) return await otherExtractor(tmp.id);
    let decodeData = reqID.text.slice(0, -2);
    decodeData = decodeData.split("").reverse().map((el) => String.fromCharCode(el.charCodeAt(0) - 7)).join("");
    try {
      let animeEpisodes = JSON.parse(atob(decodeData));
      for (const key in animeEpisodes) {
        let res = detectResoltion(key);
        if (animeEpisodes[key].length <= 0) continue;
        if (res == "Unknown") continue;
        currentEpisode.push({
          res,
          url: DetectURL(animeEpisodes[key]),
          defaultSubtitles: res == "Source"
        });
      }
    } catch (error) {
      console.error(error, atob(decodeData), decodeData, reqID);
    }
    if (tmp["subtitles"]["EN"]) subtitles.push({
      url: tmp["subtitles"]["EN"],
      lang: "en",
      label: "English",
      format: "ass"
    });
    if (tmp["subtitles"]["PL"]) subtitles.push({
      url: tmp["subtitles"]["PL"],
      lang: "pl",
      label: "Polish",
      format: "ass"
    });
    let extractedChapters = JSON.parse(tmp["markerPeriods"]);
    if (extractedChapters[0] && timeToSeconds(extractedChapters[0]["endTime"]) >= 0) chapters.push({ start: timeToSeconds(extractedChapters[0]["startTime"]), end: timeToSeconds(extractedChapters[0]["endTime"]), type: "opening", name: "Opening" });
    if (extractedChapters[1] && timeToSeconds(extractedChapters[1]["endTime"]) >= 0) chapters.push({ start: timeToSeconds(extractedChapters[1]["startTime"]), end: timeToSeconds(extractedChapters[1]["endTime"]), type: "ending", name: "Ending" });
    return [{
      hostname: "lycoris.cafe",
      resolution: currentEpisode.sort((a, b) => Number(a.res) - Number(b.res)).reverse(),
      listChapters: chapters,
      subtitles
    }];
  };
  extractEpisodeList = async (animeData, anime_id) => {
    let animeID = anime_id;
    if (!animeID && animeData) {
      let animeList = await this.searchAnime(animeData.title.romaji, 1);
      if (animeList.length <= 0) return;
      animeID = SheepFinderAnime2000(animeList.map((v) => v.AnimeData), animeData);
    }
    if (!animeID) return;
    let req = await requestToApi(animeID);
    if (!req) return;
    let tmpEpisodes = req.data.anime["episodes"];
    let episodes = tmpEpisodes.map((ep) => {
      return {
        ep: ep["number"],
        img: ep["thumbnail"],
        title: ep["title"],
        uploadedUnix: dateToUnix(ep["airDate"])
      };
    });
    return {
      player_id: animeID,
      episodesData: [{ episodes, type: "sub", name: "Subtitles" }]
    };
  };
  extractOnlyEpisodesList = async (_type, anime_id) => {
    let req = await requestToApi(anime_id);
    if (!req) return [];
    let tmpEpisodes = req.data.anime["episodes"];
    let episodes = tmpEpisodes.map((ep) => {
      return {
        ep: ep["number"],
        img: ep["thumbnail"],
        title: ep["title"],
        uploadedUnix: dateToUnix(ep["airDate"])
      };
    });
    return episodes;
  };
  searchAnime = async (name, page, _params) => {
    let url = `${WEB}/api/search?page=${page}&pageSize=12&search=${name}&genres=&status=&format=&year=&season=&source=&sortField=popularity&sortDirection=desc&preferRomaji=true`;
    const req = await request(url, { headers: HEADER });
    if (!req.success || !req.json) {
      console.warn("Failed Request searchAnime/LycorisCafe", req);
      return [];
    }
    let data = req.json.data.map((element) => {
      return { AnimeData: convertToAnimeData(element) };
    });
    if (!data) return [];
    return data;
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
      async () => this.searchAnime("Tokidoki Bosotto Russiago de Dereru Tonari no Alya-san", 1),
      async () => this.extractPlayerData("sub", { ep: "4" }, "189046"),
      async () => this.extractOnlyEpisodesList("sub", "189046")
    ];
    for (let index = 0; index < functions.length; index++) {
      const element = functions[index];
      const tmp = await wrapper(element);
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
  dateToUnix,
  LycorisCafe as default
};
