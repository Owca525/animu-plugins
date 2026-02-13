import { request, runYT_DLP, makeSmallText, convertMsToMinutes } from "./index.js";
const HASH_SEARCH = "a24c500a1b765c68ae1d8dd85174931f661c71369c89b92b88b75a725afc471c";
const HASH_INFO = "043448386c7a686bc2aabfbb6b80f6074e795d350df48015023b079527b0848a";
const HASH_PLAYER = "d405d0edd690624b66baba3068e0edc3ac90f1597d898a1ec8db4e5c43c00fec";
const HASH_DATA = "c8f3ac51f598e630a1d09d7f7fb6924cff23277f354a23e473b962a367880f7d";
const API_WEB = "https://api.allanime.day";
const header = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
  "Referer": "https://allmanga.to/"
  // "Host": "api.allanime.day"
};
const source_names = ["Yt-mp4", "Sak", "S-mp4", "Luf-mp4", "Kir", "Default", "Uv-mp4", "Mp4", "Ok"];
const normalUrls = ["Ok"];
const mapping = {
  "79": "A",
  "7a": "B",
  "7b": "C",
  "7c": "D",
  "7d": "E",
  "7e": "F",
  "7f": "G",
  "70": "H",
  "71": "I",
  "72": "J",
  "73": "K",
  "74": "L",
  "75": "M",
  "76": "N",
  "77": "O",
  "68": "P",
  "69": "Q",
  "6a": "R",
  "6b": "S",
  "6c": "T",
  "6d": "U",
  "6e": "V",
  "6f": "W",
  "60": "X",
  "61": "Y",
  "62": "Z",
  "59": "a",
  "5a": "b",
  "5b": "c",
  "5c": "d",
  "5d": "e",
  "5e": "f",
  "5f": "g",
  "50": "h",
  "51": "i",
  "52": "j",
  "53": "k",
  "54": "l",
  "55": "m",
  "56": "n",
  "57": "o",
  "48": "p",
  "49": "q",
  "4a": "r",
  "4b": "s",
  "4c": "t",
  "4d": "u",
  "4e": "v",
  "4f": "w",
  "40": "x",
  "41": "y",
  "42": "z",
  "08": "0",
  "09": "1",
  "0a": "2",
  "0b": "3",
  "0c": "4",
  "0d": "5",
  "0e": "6",
  "0f": "7",
  "00": "8",
  "01": "9",
  "15": "-",
  "16": ".",
  "67": "_",
  "46": "~",
  "02": ":",
  "17": "/",
  "07": "?",
  "1b": "#",
  "63": "[",
  "65": "]",
  "78": "@",
  "19": "!",
  "1c": "$",
  "1e": "&",
  "10": "(",
  "11": ")",
  "12": "*",
  "13": "+",
  "14": ",",
  "03": ";",
  "05": "=",
  "1d": "%"
};
function findUrl(url, sourceName) {
  for (let index = 0; index < source_names.length; index++) {
    const element = source_names[index];
    if (element.toLowerCase() == sourceName.toLowerCase() && normalUrls.includes(element)) return { url, decode: false };
    if (element.toLowerCase() == sourceName.toLowerCase()) return { url: decodeText(url), decode: true };
  }
  return;
}
function decodeText(textString) {
  const field = textString.trim();
  const hexPairs = [];
  for (let i = 0; i < field.length; i += 2) {
    hexPairs.push(field.slice(i, i + 2));
  }
  return hexPairs.map((hp) => mapping[hp] ?? "").join("");
}
function converterData(data) {
  if (!data) return;
  let characters = [];
  try {
    if (data.characters) {
      for (let index = 0; index < data.characters.length; index++) {
        const element = data.characters[index];
        characters.push({ role: element.role, character: { id: element.aniListId, name: element.name.full, image: element.image.large } });
        if (index == 10) break;
      }
    }
  } catch (error) {
    console.error(error);
  }
  return {
    averageScore: data.averageScore,
    bannerImage: data.banner,
    coverImage: data.thumbnail,
    description: data.description,
    duration: data.episodeDuration ? convertMsToMinutes(parseInt(data.episodeDuration)) : void 0,
    endDate: data.airedEnd ? { year: data.airedEnd.year, day: data.airedEnd.date, month: data.airedEnd.month } : void 0,
    startDate: data.airedStart ? { year: data.airedStart.year, day: data.airedStart.date, month: data.airedStart.month } : void 0,
    episodes: data.episodeCount ? parseInt(data.episodeCount) : void 0,
    genres: data.genres,
    nextAiringEpisode: void 0,
    popularity: 0,
    season: data.season ? data.season.quarter : void 0,
    seasonYear: data.season ? data.season.year : void 0,
    status: data.status,
    studios: data.studios,
    title: { romaji: data.name, native: data.nativeName, english: data.englishName },
    type: data.type,
    id: "",
    format: data.type,
    player_ID: data._id,
    characters,
    source: void 0,
    trailer: void 0
  };
}
async function requestToApi(variables, hash, header2) {
  let url = `${API_WEB}/api?variables=${variables}&extensions={"persistedQuery":{"version":1,"sha256Hash":"${hash}"}}`;
  let data = await request(url, { headers: header2 });
  if (!data.success || data.json && data.json["errors"]) console.error("Allmanga request", data, url, header2);
  return data;
}
async function SearchAnimeInAllmanga(name, page) {
  try {
    let variables = `{"search":{"query":"${name.replaceAll('"', "").replaceAll("&", "")}"},"limit":26,"page":${page},"translationType":"sub","countryOrigin":"ALL"}`;
    const resp = await requestToApi(variables, HASH_SEARCH, header);
    if (!resp.success || !resp.json) return [];
    if ("errors" in resp.json) {
      console.warn("Allmanga Request show error", resp.json["errors"], variables);
      return [];
    }
    return resp.json.data.shows.edges.map((card) => converterData(card));
  } catch (error) {
    console.error("SearchAnimeInAllmanga/Allmanga Plugin", error);
    return [];
  }
}
function SheepFinderAnime2000(animeList, anime) {
  try {
    if (anime.id != "") {
      console.log("ID Check");
      const findedID = animeList.find((item) => item.id == anime.id);
      if (findedID) return findedID.player_ID;
    }
    console.log("First Check", animeList);
    if (animeList.length <= 0) return void 0;
    if (animeList.length == 1) return animeList[0].player_ID;
    let seasonYearFilter = animeList.filter((element) => element.seasonYear == anime.seasonYear);
    console.log("Second Check", seasonYearFilter);
    if (seasonYearFilter.length <= 0) return void 0;
    if (seasonYearFilter.length == 1) return seasonYearFilter[0].player_ID;
    let seasonFilter = seasonYearFilter.filter((element) => makeSmallText(element.season) == makeSmallText(anime.season));
    console.log("Third Check", seasonYearFilter);
    if (seasonFilter.length <= 0) return void 0;
    if (seasonFilter.length == 1) return seasonFilter[0].player_ID;
    let episodesFilter = void 0;
    if (anime.episodes) {
      episodesFilter = seasonFilter.filter((element) => element.episodes == anime.episodes);
      console.log("Four Check", episodesFilter);
      if (episodesFilter.length <= 0) return void 0;
      if (episodesFilter.length == 1) return episodesFilter[0].player_ID;
    }
    let durationFilter = [];
    if (episodesFilter) durationFilter = episodesFilter.filter((element) => element.duration == anime.duration);
    else durationFilter = seasonFilter.filter((element) => element.duration == anime.duration);
    console.log("Five Check", durationFilter);
    if (durationFilter.length <= 0) return void 0;
    if (durationFilter.length == 1) return durationFilter[0].player_ID;
    let formatFilter = durationFilter.filter((element) => makeSmallText(element.format) == makeSmallText(anime.format));
    console.log("Six Check", formatFilter);
    if (formatFilter.length <= 0) return void 0;
    if (formatFilter.length == 1) return formatFilter[0].player_ID;
    return formatFilter[0].player_ID;
  } catch (error) {
    console.error("Allmanga SheepFinderAnime2000 error", error);
    return animeList[0].player_ID;
  }
}
async function formatEpisodeData(data) {
  try {
    if (!data) return [];
    let finnallData = [];
    for (let index = 0; index < data.length; index++) {
      const element = data[index];
      const thumbnail = element.thumbnails.filter((url) => url.startsWith("https"));
      finnallData.push({
        ep: element.episodeIdNum,
        img: thumbnail.length > 0 ? thumbnail[0] : void 0,
        title: element.notes ? element.notes.replace("<note-split>", " ") : void 0
      });
    }
    return finnallData;
  } catch (error) {
    console.error("formatEpisodeData", error, data);
    return [];
  }
}
async function extractEpisodes(anime_id, episode) {
  try {
    let variables = `{"showId":"${anime_id}","episodeNumStart":${parseInt(episode.start.toString())},"episodeNumEnd":${parseInt(episode.end.toString())}}`;
    const resp = await requestToApi(variables, HASH_DATA, header);
    if (!resp.success || !resp.json) return [];
    if ("errors" in resp.json) return [];
    if (!resp.json.data.episodeInfos) return [];
    return await formatEpisodeData(resp.json.data.episodeInfos);
  } catch (Error) {
    console.error(Error);
    return [];
  }
}
async function extractInformation(id) {
  let variables = `{"_id":"${id}"}`;
  const resp = await requestToApi(variables, HASH_INFO, header);
  if (!resp.success || !resp.json || !resp.json.data.show) return [];
  let anime_data = resp.json.data.show;
  let episodes = await extractEpisodes(id, { start: parseInt(anime_data.availableEpisodesDetail.sub.at(-1)), end: parseInt(anime_data.availableEpisodesDetail.sub[0]) });
  if (episodes.length <= 0) episodes = anime_data["availableEpisodesDetail"]["sub"].map((v) => ({ ep: v }));
  episodes = episodes.sort((a, b) => Number(a.ep) - Number(b.ep));
  return [
    {
      episodes: episodes.length !== anime_data.availableEpisodes.sub ? episodes.slice(0, anime_data.availableEpisodes.sub != 0 ? anime_data.availableEpisodes.sub - 1 : 0) : episodes,
      type: "sub"
    },
    {
      episodes: episodes.length !== anime_data.availableEpisodes.dub ? episodes.slice(0, anime_data.availableEpisodes.dub != 0 ? anime_data.availableEpisodes.dub - 1 : 0) : episodes,
      type: "dub"
    },
    {
      episodes: episodes.length !== anime_data.availableEpisodes.raw ? episodes.slice(0, anime_data.availableEpisodes.raw != 0 ? anime_data.availableEpisodes.raw - 1 : 0) : episodes,
      type: "raw"
    }
  ];
}
async function requestForUrl(url) {
  if (url.startsWith("https")) return void 0;
  const links = await request(`http://allanime.day${url.replace("clock", "clock.json")}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0"
    }
  });
  if (!links.success || !links.json) return void 0;
  let listUrls;
  links.json.links.forEach((element) => {
    if (!element.src) return;
    const urlObject = new URL(element.src);
    if (element.mp4) {
      listUrls = { resolution: [{ url: element.src, res: "1080", hls: false }], hostname: urlObject.hostname };
    } else {
      listUrls = { resolution: [{ url: element.src, res: "", hls: true }], hostname: urlObject.hostname };
    }
  });
  return listUrls;
}
async function fetchMP4(hostname, url) {
  try {
    let resoltutions = [];
    const extractedata = await runYT_DLP(url);
    for (let index = 0; index < extractedata.formats.length; index++) {
      const element = extractedata.formats[index];
      if ("format_id" in element && element["format_id"].includes("dash-video")) resoltutions.push({
        res: `${element["height"]}`,
        url: element["url"],
        reqHeader: element["http_headers"]
      });
    }
    return {
      hostname,
      resolution: resoltutions.reverse()
    };
  } catch (error) {
    return void 0;
  }
}
class Allmanga {
  metadata = {
    version: "1.12",
    name: "Allmanga",
    author: "Owca525",
    icon: "https://allmanga.to/android-icon-192x192.png",
    supportLang: ["en"],
    urlWebsite: "https://allmanga.to"
  };
  config = {
    "settings.extensions.website": API_WEB,
    "HASH_SEARCH": HASH_SEARCH,
    "HASH_INFO": HASH_INFO,
    "HASH_PLAYER": HASH_PLAYER,
    "HASH_DATA": HASH_DATA
  };
  async extractPlayerData(type, episode, id) {
    let variables = `{"showId":"${id}","translationType":"${type}","episodeString":"${episode}"}`;
    try {
      const resp = await requestToApi(variables, HASH_PLAYER, header);
      if (!resp.success || !resp.json) return [];
      let jsonObject = resp.json;
      const sources = jsonObject.data.episode.sourceUrls;
      const urls = sources.map(
        (tmp) => findUrl(tmp.sourceUrl, tmp.sourceName)
      ).filter((item) => item !== void 0);
      let data = [];
      for (let i = 0; i < urls.length; i++) {
        const element = urls[i];
        if (element.decode) {
          let tmp = await requestForUrl(element.url);
          if (tmp) data.push(tmp);
        }
        if (!element.decode) {
          const urlObject = new URL(element.url);
          data.push({
            hostname: urlObject.hostname,
            resolution: [],
            extractResolution: async () => await fetchMP4(urlObject.hostname, element.url)
          });
        }
      }
      if (type == "dub" && jsonObject.data.episode.episodeInfo.vidInforsdub) {
        data.push({
          hostname: "wp.youtube-anime.com",
          resolution: [{
            res: jsonObject.data.episode.episodeInfo.vidInforsdub.vidResolution.toString(),
            url: `https://aln.youtube-anime.com${jsonObject.data.episode.episodeInfo.vidInforsdub.vidPath}`,
            hls: false,
            doNotUseBackend: true
          }]
        });
      }
      if (type == "raw" && jsonObject.data.episode.episodeInfo.vidInforsraw) {
        data.push({
          hostname: "wp.youtube-anime.com",
          resolution: [{
            res: jsonObject.data.episode.episodeInfo.vidInforsraw.vidResolution.toString(),
            url: `https://aln.youtube-anime.com${jsonObject.data.episode.episodeInfo.vidInforsraw.vidPath}`,
            hls: false,
            doNotUseBackend: true
          }]
        });
      }
      if (type == "sub" && jsonObject.data.episode.episodeInfo.vidInforssub) {
        data.push({
          hostname: "wp.youtube-anime.com",
          resolution: [{
            res: jsonObject.data.episode.episodeInfo.vidInforssub.vidResolution.toString(),
            url: `https://aln.youtube-anime.com${jsonObject.data.episode.episodeInfo.vidInforssub.vidPath}`,
            hls: false,
            doNotUseBackend: true
          }]
        });
      }
      return data;
    } catch (error) {
      console.error(`Error in extractPlayerData`, error);
      return [];
    }
  }
  async extractEpisodeList(animeData, anime_id) {
    try {
      let tmpAnimeID = anime_id;
      if (animeData && !tmpAnimeID) {
        let data = await SearchAnimeInAllmanga(animeData.title.romaji, 1);
        tmpAnimeID = SheepFinderAnime2000(data, animeData);
      }
      ;
      console.log(tmpAnimeID);
      if (!tmpAnimeID || tmpAnimeID == "") return;
      let episodeList2 = await extractInformation(tmpAnimeID);
      return { player_id: tmpAnimeID, episodesData: episodeList2 };
    } catch (error) {
      console.error("Allmanga extractEpisodeList error", error);
      return;
    }
  }
  async extractOnlyEpisodesList(type, anime_id) {
    let episodes = await extractInformation(anime_id);
    for (let index = 0; index < episodes.length; index++) {
      const element = episodes[index];
      if (element.type == type) return element.episodes;
    }
    return [];
  }
  async searchAnime(name, page, _params) {
    let resp = await SearchAnimeInAllmanga(name.replaceAll('"', "").replaceAll("&", ""), page);
    return resp.map((card) => ({ AnimeData: card }));
  }
}
export {
  Allmanga as default,
  extractEpisodes,
  extractInformation
};
