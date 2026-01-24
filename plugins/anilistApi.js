import { g as genYearsList, s as request } from "./index.js";
const pageSize = 20;
const animeData = `
      id
      title {
        english
        romaji
        native
      }
      coverImage {
        extraLarge
        large
      }
      startDate {
        year
        month
        day
      }
      endDate {
        year
        month
        day
      }
      bannerImage
      season
      seasonYear
      description
      type
      format
      status(version: 2)
      episodes
      duration
      genres
      source
      synonyms
      isAdult
      averageScore
      trailer {
        id
        site
      }
      nextAiringEpisode {
        airingAt
        timeUntilAiring
        episode
      }
      characters(perPage: 30) {
        edges {
          role
          node {
            id
            name {
              full
            }
            image {
              large
            }
          }
          voiceActors(language: JAPANESE) {
            id
            name {
              full
            }
            language
            image {
              large
            }
          }
        }
      }
      studios(isMain: true) {
        edges {
          isMain
          node {
            id
            name
          }
        }
      }
      relations {
        edges {
          relationType
          node {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              extraLarge
              large
            }
            bannerImage
          }
        }
      }
      recommendations(page: 1, perPage: 10) {
        nodes {
          mediaRecommendation {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              extraLarge
              large
            }
          }
        }
      }
`;
const graphicApi = `
query(
  $page: Int = 1,
  $id: Int,
  $type: MediaType,
  $isAdult: Boolean,
  $search: String,
  $format: [MediaFormat],
  $status: MediaStatus,
  $countryOfOrigin: CountryCode,
  $source: MediaSource,
  $season: MediaSeason,
  $seasonYear: Int,
  $year: String,
  $onList: Boolean,
  $yearLesser: FuzzyDateInt,
  $yearGreater: FuzzyDateInt,
  $episodeLesser: Int,
  $episodeGreater: Int,
  $durationLesser: Int,
  $durationGreater: Int,
  $chapterLesser: Int,
  $chapterGreater: Int,
  $volumeLesser: Int,
  $volumeGreater: Int,
  $licensedBy: [Int],
  $isLicensed: Boolean,
  $genres: [String],
  $excludedGenres: [String],
  $tags: [String],
  $excludedTags: [String],
  $minimumTagRank: Int,
  $sort: [MediaSort] = [POPULARITY_DESC, SCORE_DESC]
) {
  Page(page: $page, perPage: ${pageSize}) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(
      id: $id,
      type: $type,
      season: $season,
      format_in: $format,
      status: $status,
      countryOfOrigin: $countryOfOrigin,
      source: $source,
      search: $search,
      onList: $onList,
      seasonYear: $seasonYear,
      startDate_like: $year,
      startDate_lesser: $yearLesser,
      startDate_greater: $yearGreater,
      episodes_lesser: $episodeLesser,
      episodes_greater: $episodeGreater,
      duration_lesser: $durationLesser,
      duration_greater: $durationGreater,
      chapters_lesser: $chapterLesser,
      chapters_greater: $chapterGreater,
      volumes_lesser: $volumeLesser,
      volumes_greater: $volumeGreater,
      licensedById_in: $licensedBy,
      isLicensed: $isLicensed,
      genre_in: $genres,
      genre_not_in: $excludedGenres,
      tag_in: $tags,
      tag_not_in: $excludedTags,
      minimumTagRank: $minimumTagRank,
      sort: $sort,
      isAdult: $isAdult
    ) {
      ${animeData}
    }
  }
}
`;
const graphicHomeApi = `
  query (
    $season: MediaSeason,
    $seasonYear: Int,
    $isAdult: Boolean
  ) {
    trending: Page(page: 1, perPage: ${pageSize}) {
      media(sort: TRENDING_DESC, type: ANIME, isAdult: $isAdult) {
        ...media
      }
    }
    season: Page(page: 1, perPage: ${pageSize}) {
      media(season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC, type: ANIME, isAdult: $isAdult) {
        ...media
      }
    }
    popular: Page(page: 1, perPage: ${pageSize}) {
      media(sort: POPULARITY_DESC, type: ANIME, isAdult: $isAdult) {
        ...media
      }
    }
  }

  fragment media on Media {
    ${animeData}
  }
`;
const graphicApIDAnime = `
query(
  $id: Int!
) {
  Media(id: $id, type: ANIME) {
    ${animeData}
  }
}
`;
const header = {
  "Content-Type": "application/json",
  "Accept": "application/json"
};
const tendingAnime = {
  page: 1,
  sort: ["TRENDING_DESC", "POPULARITY_DESC"],
  type: "ANIME"
};
const allPopular = {
  page: 1,
  sort: "POPULARITY_DESC",
  type: "ANIME"
};
function Convert(convert) {
  let characters = [];
  let relations = [];
  let recommendations = [];
  try {
    for (let index = 0; index < convert.characters.edges.length; index++) {
      const element = convert.characters.edges[index];
      if (element.voiceActors.length === 0) characters.push({ role: element.role, character: { id: element.node.id, image: element.node.image.large, name: element.node.name.full } });
      else characters.push({ role: element.role, character: { id: element.node.id, image: element.node.image.large, name: element.node.name.full }, voiceActor: { id: element.voiceActors[0].id, image: element.voiceActors[0].image.large, name: element.voiceActors[0].name.full } });
    }
  } catch (error) {
    console.error("AnilistApi/Convert", error);
  }
  try {
    if (convert.relations) {
      convert.relations.edges.forEach((element) => {
        if (!element) return;
        relations.push({
          id: element.node.id,
          title: element.node.title,
          coverImage: element.node.coverImage.extraLarge ? element.node.coverImage.extraLarge : element.node.coverImage.large,
          relationType: element.relationType
        });
      });
    }
  } catch (error) {
    console.error("AnilistApi/Convert", error);
  }
  try {
    if (convert.recommendations) {
      convert.recommendations.nodes.forEach((element) => {
        if (!element || !element.mediaRecommendation) return;
        recommendations.push({
          id: element.mediaRecommendation.id,
          title: element.mediaRecommendation.title,
          coverImage: element.mediaRecommendation.coverImage.extraLarge ? element.mediaRecommendation.coverImage.extraLarge : element.mediaRecommendation.coverImage.large
        });
      });
    }
  } catch (error) {
    console.error("AnilistApi/Convert", error);
  }
  return {
    AnimeData: {
      ...convert,
      coverImage: convert.coverImage.extraLarge ? convert.coverImage.extraLarge : convert.coverImage.large,
      studios: convert.studios.edges.map((studio) => studio.node.name),
      characters,
      recommendations,
      relations
    }
  };
}
async function sendPost(variable, query) {
  return await request("https://graphql.anilist.co", { method: "POST", headers: header, body: JSON.stringify({ query, variables: variable }) });
}
async function sendToApi(variable, query) {
  let data = await request("https://graphql.anilist.co", { method: "POST", headers: header, body: JSON.stringify({ query, variables: variable }) });
  if (data.success && data.json) {
    return data.json.data.Page.media.map((data2) => Convert(data2));
  }
  return [];
}
function getSeasonFromDate() {
  const now = /* @__PURE__ */ new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  let season;
  if (month >= 1 && month <= 3) {
    season = "WINTER";
  } else if (month >= 4 && month <= 6) {
    season = "SPRING";
  } else if (month >= 7 && month <= 9) {
    season = "SUMMER";
  } else {
    season = "FALL";
  }
  return { season, seasonYear: year };
}
async function fetchCategory(params, title) {
  const globalParams = params;
  console.log(params, title);
  let container = {
    title,
    data: await sendToApi(params, graphicApi),
    onScrollDownFunction: async (_search, page, _params) => {
      let resp = await sendToApi({ ...globalParams, page }, graphicApi);
      console.log(globalParams, page, resp);
      return {
        maxPage: pageSize,
        data: resp
      };
    }
  };
  return container;
}
async function searchInAnilist(name, page, params, isAdult = false, MaxPage = 20) {
  try {
    let variables = {
      page,
      sort: "SEARCH_MATCH",
      type: "ANIME",
      isAdult
    };
    if (name.replaceAll(" ", "") != "") variables = { ...variables, search: name };
    if (params) {
      if (params) variables = { ...variables, genres: params.genres };
      if (params.genres) variables = { ...variables, genres: params.genres };
      if (params.genres) variables = { ...variables, genres: params.genres };
      if (params.years) variables = { ...variables, seasonYear: parseInt(params.years) };
      if (params.seasons) variables = { ...variables, season: params.seasons.toUpperCase() };
      if (params.format) variables = { ...variables, format: params.format.map((tmp) => tmp.toUpperCase().replaceAll(" ", "_")) };
      if (params.airing) variables = { ...variables, status: params.airing.toUpperCase().replaceAll(" ", "_") };
    }
    const resp = await sendToApi(variables, graphicApi.replaceAll("20", MaxPage.toString()));
    return {
      data: resp,
      maxPage: pageSize
    };
  } catch (error) {
    console.error("Error in searchInAnilist/anilist", error);
    return {
      data: [],
      maxPage: pageSize
    };
  }
}
async function searchWrapper(name, page, params, isAdult = false, MaxPage = 20) {
  try {
    return await searchInAnilist(name, page, params, isAdult, MaxPage);
  } catch (error) {
    console.error("Error in searchWrapper/anilist", error);
    return {
      data: [],
      maxPage: pageSize
    };
  }
}
class AnilistApi {
  metadata = {
    version: "2.0",
    name: "AnilistApi",
    pageSize,
    searchOption: {
      genres: [
        "Action",
        "Adventure",
        "Comedy",
        "Drama",
        "Ecchi",
        "Fantasy",
        "Hentai",
        "Horror",
        "Mahou Shoujo",
        "Mecha",
        "Music",
        "Mystery",
        "Psychological",
        "Romance",
        "Sci-Fi",
        "Slice of Life",
        "Sports",
        "Supernatural",
        "Thriller"
      ],
      seasons: ["Winter", "Spring", "Summer", "Fall"],
      years: genYearsList(1940),
      format: ["TV", "Movie", "TV Short", "special", "OVA", "ONA"],
      statuses: ["Releasing", "Finished", "Not Yet Released", "Cancelled"]
    },
    author: "Owca525",
    urlWebsite: "https://anilist.co",
    icon: "https://anilist.co/img/icons/icon.svg"
  };
  config = {
    "Adult Mode": false,
    "Max Page Size": 20
  };
  // async schedule(context: { airingStart: number; airingEnd: number; }, callbacks: { onSuccess: (data: containerData) => void; onError: (error: string) => void; }) {
  //   let week = getWeek()
  //   console.log(week)
  //   let variables = {
  //     page: 1,
  //     perPage: 50,
  //     sort: ["TIME"],
  //     airingAtGreater: week.startWeekUnix,
  //     airingAtLesser: week.endWeekUnix
  //   }
  //   console.log(await sendPost(variables, graphicAiringAnime))
  // }
  async search(context, callbacks) {
    try {
      let title = void 0;
      if (!(context.name.replaceAll(" ", "") == "")) title = `Searching: ${context.name}`;
      const resp = await searchInAnilist(context.name, context.page, context.params, this.config["Adult Mode"], this.config["Max Page Size"]);
      callbacks.onSuccess({
        title,
        data: resp.data,
        onScrollDownFunction: async (search, page, params) => await searchWrapper(search ? search : "", page, params, this.config["Adult Mode"], this.config["Max Page Size"])
      });
    } catch (error) {
      console.error("Error in search/Anilistapi", error);
      callbacks.onError(`${error}`);
    }
  }
  async home(callbacks) {
    try {
      let season = getSeasonFromDate();
      let data = await sendPost({ season: season.season, seasonYear: season.seasonYear, isAdult: this.config["Adult Mode"] }, graphicHomeApi.replaceAll("20", this.config["Max Page Size"]));
      if (!data.success || !data.json) {
        console.log(data);
        return callbacks.onError("Anilist isn't accessible");
      }
      let home = [
        {
          title: "home.trending_now",
          data: data.json.data.trending.media.map((anime) => Convert(anime)),
          horizontal: true,
          onTitleClick: async () => await fetchCategory({ ...tendingAnime, isAdult: this.config["Adult Mode"] }, "home.trending_now")
        },
        {
          title: "home.popular_in_this_season",
          data: data.json.data.season.media.map((anime) => Convert(anime)),
          horizontal: true,
          onTitleClick: async () => await fetchCategory({
            page: 1,
            season: season.season,
            seasonYear: season.seasonYear,
            type: "ANIME",
            isAdult: this.config["Adult Mode"]
          }, "home.popular_in_this_season")
        },
        {
          title: "home.all_time_popular",
          data: data.json.data.popular.media.map((anime) => Convert(anime)),
          horizontal: true,
          onTitleClick: async () => await fetchCategory({ ...allPopular, isAdult: this.config["Adult Mode"] }, "home.all_time_popular")
        }
      ];
      callbacks.onSuccess({ sections: home, topCards: home[0] });
    } catch (error) {
      console.error("Error in home/anilistapi", error);
      callbacks.onError("Anilist isn't accessible");
    }
  }
  async anime(context) {
    try {
      let req = await sendPost({ id: context.id }, graphicApIDAnime);
      console.log(req);
      if (!req.success || !req.json) return;
      return Convert(req.json.data.Media).AnimeData;
    } catch (error) {
      console.error("Uknown error in anime/anilistapi", error);
      return;
    }
  }
}
export {
  AnilistApi as default,
  searchInAnilist
};
