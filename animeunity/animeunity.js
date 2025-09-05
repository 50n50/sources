async function searchResults(keyword) {
  const response = await fetchv2(
    `https://www.animeunity.so/archivio?title=${keyword}`
  );
  const html = await response.text();

  const regex = /<archivio[^>]*records="([^"]*)"/;
  const match = regex.exec(html);

  if (!match || !match[1]) {
    return { results: [] };
  }

  const items = JSON.parse(match[1].replaceAll(`&quot;`, `"`));

  const results =
    items.map((item) => ({
      title: item.title ?? item.title_eng,
      image: item.imageurl,
      href: `https://www.animeunity.so/info_api/${item.id}`,
    })) || [];

  return JSON.stringify(results);
}

async function extractDetails(url) {
  const response = await fetchv2(url);
  const json = JSON.parse(await response.text());

  return JSON.stringify([
    {
      description: json.plot,
      aliases: "N/A",
      airdate: json.date,
    },
  ]);
}

async function extractEpisodes(url) {
  try {
    const episodes = [];

    const apiResponse = await fetchv2(url);
    const apiJson = JSON.parse(await apiResponse.text());
    const slug = apiJson.slug;
    const idAnime = apiJson.id;

    if (!slug) {
      console.log("No slug found in API response");
      return episodes;
    }

    const pageResponse = await fetchv2(
      `https://www.animeunity.so/anime/${idAnime}-${slug}`
    );
    const html = await pageResponse.text();

    const videoPlayerRegex =
      /<video-player[^>]*anime="([^"]*)"[^>]*episodes="([^"]*)"/;
    const videoPlayerMatch = html.match(videoPlayerRegex);
    if (!videoPlayerMatch) {
      console.log("No video-player tag found");
      return episodes;
    }

    const decodeHtml = (str) =>
      str.replace(/&quot;/g, '"').replace(/\\\//g, "/");

    const animeJsonStr = decodeHtml(videoPlayerMatch[1]);
    const episodesJsonStr = decodeHtml(videoPlayerMatch[2]);

    const animeData = JSON.parse(animeJsonStr);
    const episodesData = JSON.parse(episodesJsonStr);

    episodesData.forEach((episode) => {
      episodes.push({
        href: `https://animeunity.so/anime/${idAnime}-${slug}/${episode.id}`,
        number: parseInt(episode.number),
      });
    });

    return JSON.stringify(episodes);
  } catch (error) {
    console.log("Error extracting episodes:", error);
    return [];
  }
}

async function extractStreamUrl(url) {
  try {
    const response1 = await fetchv2(url);
    const html = await response1.text();

    const vixcloudMatch = html.match(
      /embed_url="(https:\/\/vixcloud\.co\/embed\/\d+\?[^"]+)"/
    );
    if (!vixcloudMatch) {
      console.log("No vixcloud.co URL found in the HTML.");
      return null;
    }

    let vixcloudUrl = vixcloudMatch[1];
    vixcloudUrl = vixcloudUrl.replace(/&amp;/g, "&");

    const response = await fetch(vixcloudUrl);
    const downloadUrlMatch = response.match(
      /window\.downloadUrl\s*=\s*['"]([^'"]+)['"]/
    );

    if (!downloadUrlMatch) {
      console.log("No downloadUrl found in the response.");
      return null;
    }

    const downloadURL = downloadUrlMatch[1];
    console.log(downloadURL);
    return downloadURL;
  } catch (error) {
    console.log("Fetch error:", error);
    return null;
  }
}