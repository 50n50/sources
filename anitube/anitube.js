async function searchResults(keyword) {
  const results = [];
  try {
    const response = await fetchv2("https://www.anitube.news/?s=" + keyword);
    const html = await response.text();

    const regex = /<div class="aniItem">\s*<a href="([^"]+)"[^>]*>[\s\S]*?<img src="([^"]+)"[^>]*>[\s\S]*?<div class="aniItemNome">\s*([^<]+)\s*<\/div>/g;

    let match;
    while ((match = regex.exec(html)) !== null) {
      results.push({
        href: match[1].trim(),
        image: match[2].trim(),
        title: match[3].trim()
      });
    }

    return JSON.stringify(results);
  } catch (err) {
    return JSON.stringify([{
      title: "Error",
      image: "Error",
      href: "Error"
    }]);
  }
}

async function extractDetails(url) {
  try {
    const response = await fetchv2(url);
    const html = await response.text();

    const regex = /<div id="sinopse2">(.*?)<\/div>/s;
    const match = regex.exec(html);

    const description = match ? match[1].trim() : "N/A";

    return JSON.stringify([{
      description: description,
      aliases: "N/A",
      airdate: "N/A"
    }]);
  } catch (err) {
    return JSON.stringify([{
      description: "Error",
      aliases: "Error",
      airdate: "Error"
    }]);
  }
}

async function extractEpisodes(url) {
  try {
    const response = await fetchv2(url);
    const html = await response.text();

    const episodes = [];
    const epRegex = /<a href="([^"]+)" title="([^"]+)">/g;

    let match;
    let counter = 1;
    while ((match = epRegex.exec(html)) !== null) {
      const href = match[1].trim();

      if (href === "https://www.anitube.news") continue;

      const title = match[2];
      const numMatch = /Episódio\s+(\d+)/.exec(title);
      const number = numMatch ? parseInt(numMatch[1], 10) : counter++;

      episodes.push({
        number: number,
        href: href
      });
    }

    if (episodes.length > 1 && episodes[0].number > episodes[1].number) {
      episodes.reverse();
    }

    return JSON.stringify(episodes);
  } catch (err) {
    return JSON.stringify([{
      number: -1,
      href: "Error"
    }]);
  }
}

async function extractStreamUrl(url) {
  try {
    const response = await fetchv2(url);
    const html = await response.text();

    const regex = /src="https:\/\/api\.anivideo\.net\/videohls\.php\?d=([^"&]+\.m3u8)[^"]*"/;
    const match = regex.exec(html);

    if (!match) {
      return "Error: stream not found";
    }

    const hlsUrl = decodeURIComponent(match[1]);

    return hlsUrl;
  } catch (err) {
    return "Error: " + err.message;
  }
}
