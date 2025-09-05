async function searchResults(keyword) {
  const response = await soraFetch(
    `https://streamingunity.co/it/archive?search=${keyword}`
  );
  const html = await response.text();

  const regex = /<div[^>]*id="app"[^>]*data-page="([^"]*)"/;
  const match = regex.exec(html);

  if (!match || !match[1]) {
    return JSON.stringify([]);
  }

  const dataPage = match[1].replaceAll(`&quot;`, `"`);
  const pageData = JSON.parse(dataPage);
  const titles = pageData.props?.titles || [];

  const results =
    titles
      .map((item) => {
        const posterImage = item.images?.find((img) => img.type === "poster");
        return {
          title:
            item.name?.replaceAll("amp;", "").replaceAll("&#39;", "'") || "",
          image: posterImage?.filename
            ? `https://cdn.streamingunity.co/images/${posterImage.filename}`
            : "",
          href: `https://streamingunity.co/it/titles/${item.id}-${item.slug}`,
        };
      })
      .filter((item) => item.image) || [];

  return JSON.stringify(results);
}

async function extractDetails(url) {
  const response = await soraFetch(`${url}/season-1`);
  const html = await response.text();

  const regex = /<div[^>]*id="app"[^>]*data-page="([^"]*)"/;
  const match = regex.exec(html);

  if (!match || !match[1]) {
    return JSON.stringify([]);
  }

  const dataPage = match[1].replaceAll(`&quot;`, `"`);
  const pageData = JSON.parse(dataPage);
  const titleData = pageData.props?.title;

  if (!titleData) {
    return JSON.stringify([]);
  }

  return JSON.stringify([
    {
      description:
        titleData.plot?.replaceAll("amp;", "").replaceAll("&#39;", "'") ||
        "N/A",
      aliases:
        titleData.original_name
          ?.replaceAll("amp;", "")
          .replaceAll("&#39;", "'") || "N/A",
      airdate: titleData.release_date || "N/A",
    },
  ]);
}

async function extractEpisodes(url) {
  try {
    const episodes = [];
    const baseUrl = url.replace(/\/season-\d+$/, "");

    const response = await soraFetch(`${baseUrl}/season-1`);
    const html = await response.text();
    const regex = /<div[^>]*id="app"[^>]*data-page="([^"]*)"/;
    const match = regex.exec(html);

    if (!match?.[1]) return JSON.stringify([]);

    const pageData = JSON.parse(match[1].replaceAll(`&quot;`, `"`));
    const titleData = pageData.props?.title;
    if (!titleData) return JSON.stringify([]);

    const titleId = titleData.id;
    const totalSeasons = titleData.seasons_count || 1;

    let hasEpisodes = false;

    for (let season = 1; season <= totalSeasons; season++) {
      try {
        const seasonResponse = await soraFetch(`${baseUrl}/season-${season}`);
        const seasonHtml = await seasonResponse.text();
        const seasonMatch = regex.exec(seasonHtml);

        if (seasonMatch?.[1]) {
          const seasonData = JSON.parse(
            seasonMatch[1].replaceAll(`&quot;`, `"`)
          );
          const seasonEpisodes = seasonData.props?.loadedSeason?.episodes || [];

          if (seasonEpisodes.length > 0) {
            hasEpisodes = true;
            seasonEpisodes.forEach((episode) => {
              episodes.push({
                href: `https://streamingunity.co/it/iframe/${titleId}?episode_id=${episode.id}`,
                number: episode.number || episodes.length + 1,
              });
            });
          }
        }
      } catch (error) {
        console.log(`Error fetching season ${season}:`, error);
      }
    }

    if (!hasEpisodes) {
      episodes.push({
        href: `https://streamingunity.co/it/iframe/${titleId}`,
        number: 1,
      });
    }

    return JSON.stringify(episodes);
  } catch (error) {
    console.log("Error extracting episodes:", error);
    return JSON.stringify([]);
  }
}

async function extractStreamUrl(url) {
  try {
    let modifiedUrl = url;
    if (!url.includes("/it/iframe") && !url.includes("/en/iframe")) {
      modifiedUrl = url.replace("/iframe", "/it/iframe");
    }
    const response1 = await soraFetch(modifiedUrl);
    const html1 = await response1.text();

    const iframeMatch = html1.match(/<iframe[^>]*src="([^"]*)"/);
    if (!iframeMatch) {
      console.log("No iframe found in the HTML.");
      return null;
    }

    const embedUrl = iframeMatch[1].replace(/amp;/g, "");
    console.log("Embed URL:", embedUrl);

    const response2 = await soraFetch(embedUrl);
    const html2 = await response2.text();

    let finalUrl = null;

    if (html2.includes("window.masterPlaylist")) {
      const urlMatch = html2.match(/url:\s*['"]([^'"]+)['"]/);
      const tokenMatch = html2.match(/['"]?token['"]?\s*:\s*['"]([^'"]+)['"]/);
      const expiresMatch = html2.match(
        /['"]?expires['"]?\s*:\s*['"]([^'"]+)['"]/
      );

      if (urlMatch && tokenMatch && expiresMatch) {
        const baseUrl = urlMatch[1];
        const token = tokenMatch[1];
        const expires = expiresMatch[1];

        if (baseUrl.includes("?b=1")) {
          finalUrl = `${baseUrl}&token=${token}&expires=${expires}&h=1`;
        } else {
          finalUrl = `${baseUrl}?token=${token}&expires=${expires}&h=1`;
        }
      }
    }

    if (!finalUrl) {
      const m3u8Match = html2.match(/(https?:\/\/[^'"\s]+\.m3u8[^'"\s]*)/);
      if (m3u8Match) {
        finalUrl = m3u8Match[1];
      }
    }

    if (!finalUrl) {
      const scriptMatches = html2.match(/<script[^>]*>(.*?)<\/script>/gs);
      if (scriptMatches) {
        for (const script of scriptMatches) {
          const streamMatch = script.match(
            /['"]?(https?:\/\/[^'"\s]+(?:\.m3u8|playlist)[^'"\s]*)/
          );
          if (streamMatch) {
            finalUrl = streamMatch[1];
            break;
          }
        }
      }
    }

    if (!finalUrl) {
      const videoMatch = html2.match(
        /(?:src|source|url)['"]?\s*[:=]\s*['"]?(https?:\/\/[^'"\s]+(?:\.mp4|\.m3u8|\.mpd)[^'"\s]*)/
      );
      if (videoMatch) {
        finalUrl = videoMatch[2] || videoMatch[1];
      }
    }

    if (finalUrl) {
      console.log("Final URL found:", finalUrl);
      return finalUrl;
    } else {
      console.log(
        "No stream URL found. HTML content:",
        html2.substring(0, 1000)
      );
      return null;
    }
  } catch (error) {
    console.log("Fetch error:", error);
    return null;
  }
}

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
    try {
        return await fetchv2(url, options.headers ?? {}, options.method ?? 'GET', options.body ?? null);
    } catch(e) {
        try {
            return await fetch(url, options);
        } catch(error) {
            return null;
        }
    }
}