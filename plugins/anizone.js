import { request, convertChaptersVTT, convertText } from "./index.js";
const WEB = "https://anizone.to";
const CARDS_REGEX = /<div[^>]*class=["']grid grid-cols-1 2xl:grid-cols-2 gap-4["'][^>]*>(.*?)<\/div>/gs;
const HEADER = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0"
};
async function searchAnime(name) {
  try {
    let url = `${WEB}/anime?search=${convertText(name)}`;
    const req = await request(url, { headers: HEADER });
    if (!req.success) return [];
    let tmp = [...req.text.matchAll(CARDS_REGEX)];
    if (tmp.length <= 0) return [];
    let finnallData = [];
    for (let index = 0; index < tmp.length; index++) {
      const element = tmp[index];
      let animeID = [...element[0].matchAll(/wire:key=["']([^"']+)["']/g)];
      let animeIMG = [...element[0].matchAll(/src=["'](https:\/\/anizone\.to\/images\/anime\/[^"']+)["']/g)];
      let animeTITLE = [...element[0].matchAll(/alt=["']([^"']+)["']/g)];
      finnallData.push({ AnimeData: {
        characters: [],
        studios: [],
        coverImage: animeIMG[0][1],
        title: {
          english: void 0,
          native: decodeURI(animeTITLE[0][1]),
          romaji: decodeURI(animeTITLE[0][1])
        },
        id: "",
        player_ID: animeID[0][1].slice(2),
        genres: void 0
      } });
    }
    return finnallData;
  } catch (error) {
    console.error(error);
    return [];
  }
}
class Anizone {
  metadata = {
    version: "1.1",
    name: "AniZone",
    author: "Owca525",
    supportLang: ["en", "pl", "de"],
    urlWebsite: WEB
  };
  extractPlayerData = async (_type, episode, id) => {
    let url = `${WEB}/anime/${id}/${episode}`;
    const req = await request(url, { headers: HEADER });
    if (!req.success) return [];
    let data = req.text;
    let storyboard = [...data.matchAll(/https:\/\/seiryuu\.vid-cdn\.xyz\/[a-z0-9-]+\/storyboard\.vtt/gi)];
    let chapters = [...data.matchAll(/https:\/\/seiryuu\.vid-cdn\.xyz\/[a-z0-9-]+\/chapters\.vtt/gi)];
    let urls = [...data.matchAll(/https:\/\/seiryuu\.vid-cdn\.xyz\/[a-z0-9-]+\/master\.m3u8/gi)];
    if (urls.length <= 0) return [];
    let otherFiles = [...data.matchAll(/<track[^>]*\s+src=["']?(?<src>[^"'\s>]+)["']?[^>]*\s+data-type=["']?(?<dataType>[^"'\s>]+)["']?[^>]*\s+kind=["']?(?<kind>[^"'\s>]+)["']?[^>]*\s+label=["']?(?<label>[^"']+)["']?[^>]*\s+srclang=["']?(?<srclang>[^"'\s>]+)["']?[^>]*>/gi)];
    if (otherFiles.length <= 0) return [];
    let subList = [];
    for (let index = 0; index < otherFiles.length; index++) {
      const element = otherFiles[index];
      if (element[3] == "subtitles") {
        subList.push({
          url: element[1],
          lang: element[5],
          label: element[4],
          format: element[2]
        });
      }
    }
    let chapterList = [];
    if (chapters.length > 0) {
      let data2 = await convertChaptersVTT(chapters[0][0]);
      for (let index = 0; index < data2.length; index++) {
        const element = data2[index];
        if (element.name == "Intro") {
          chapterList.push({ ...element, type: "opening" });
          continue;
        }
        if (element.name == "Credits") {
          chapterList.push({ ...element, type: "ending" });
          continue;
        }
        if (element.name == "Ending") {
          chapterList.push({ ...element, type: "ending" });
          continue;
        }
        if (element.name == "Opening") {
          chapterList.push({ ...element, type: "opening" });
          continue;
        }
        chapterList.push(element);
      }
    }
    return [{
      hostname: "Anizone.to",
      subtitles: subList,
      listChapters: chapterList,
      external: chapters.length > 0 ? { chaptersUrl: chapters[0][0] } : void 0,
      storyboardVTT: storyboard.length > 0 ? storyboard[0][0] : void 0,
      resolution: [{ res: "", url: urls[0][0], defaultSubtitles: true, hls: true }]
    }];
  };
  extractEpisodeList = async (animeData, anime_id) => {
    try {
      let idAnime = anime_id;
      if (!idAnime && animeData) {
        let data2 = await searchAnime(animeData.title.romaji);
        if (data2.length <= 0) return;
        idAnime = data2[0].AnimeData.player_ID;
      }
      if (!idAnime) return;
      let url = `${WEB}/anime/${idAnime}`;
      const req = await request(url, { headers: HEADER });
      if (!req.success) return void 0;
      let data = req.text;
      let tmpData = [...data.matchAll(/<ul.*?>(.*?)<\/ul>/gs)];
      let urls = [...tmpData[0][0].matchAll(/href=["'](https:\/\/anizone\.to\/anime\/[^\s"']+)["']/g)];
      let dataList = [...data.matchAll(/<div[^>]*class="(?=[^"]*text-slate-100)(?=[^"]*text-xs)(?=[^"]*lg:text-base)(?=[^"]*flex)(?=[^"]*flex-wrap)(?=[^"]*justify-center)(?=[^"]*gap-2)(?=[^"]*sm:gap-6)[^"]*"[^>]*>[\s\S]*?<\/div>/g)];
      let informationList = [...dataList[0][0].matchAll(/<[^>]*class="[^"]*\binline-block\b[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/g)];
      let ep = void 0;
      for (let index = 0; index < informationList.length; index++) {
        const element = informationList[index];
        if (element[1].includes("Episodes")) ep = parseInt(element[1].split(" ")[0]);
      }
      let lengthEpisodes = urls.filter((value) => !value[0].substring(value[0].lastIndexOf("/")).includes("s")).length;
      if (!ep) return void 0;
      let episodeList2 = [];
      let tmp = ep;
      if (lengthEpisodes < ep && lengthEpisodes != 36) tmp = lengthEpisodes;
      for (let index = 1; index < tmp + 1; index++) {
        episodeList2.push({ ep: index.toString() });
      }
      return { player_id: idAnime, episodesData: [{ episodes: episodeList2, type: "sub", name: "Subtitles" }] };
    } catch (error) {
      console.error("Error in extractEpisodeList/Anizone", error);
      return;
    }
  };
  extractOnlyEpisodesList = async (_type, anime_id) => {
    let data = await this.extractEpisodeList(void 0, anime_id);
    if (!data) return [];
    return data.episodesData[0].episodes;
  };
  searchAnime = async (name, _page, _params) => {
    return await searchAnime(name);
  };
}
export {
  Anizone as default
};
