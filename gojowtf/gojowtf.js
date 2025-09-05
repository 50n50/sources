async function searchResults(keyword) {
    const results = [];
    const headers = {
        'Referer': 'https://animetsu.to/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    const encodedKeyword = encodeURIComponent(keyword);
    const response = await fetchv2(`https://backend.animetsu.to/api/anime/search?query=${encodedKeyword}&page=1&perPage=1000`, headers);
    const json = await response.json();

    json.results.forEach(anime => {
        const title = anime.title.english || anime.title.romaji || anime.title.native || "Unknown Title";
        const image = anime.coverImage.large;
        const href = `${anime.id}`;

        if (title && href && image) {
            results.push({
                title: title,
                image: image,
                href: href
            });
        } else {
            console.error("Missing or invalid data in search result item:", {
                title,
                href,
                image
            });
        }
    });

    return JSON.stringify(results);
}

async function extractDetails(id) {
    const results = [];
    const headers = {
        'Referer': 'https://animetsu.to/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    const response = await fetchv2(`https://backend.animetsu.to/api/anime/info/${id}`, headers);
    const json = await response.json();

    const description = cleanHtmlSymbols(json.description) || "No description available"; 

    results.push({
        description: description.replace(/<br>/g, ''),
        aliases: 'N/A',
        airdate: 'N/A'
    });

    return JSON.stringify(results);
}

async function extractEpisodes(id) {
    const results = [];
    const headers = {
        'Referer': 'https://animetsu.to/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    const response = await fetchv2(`https://backend.animetsu.to/api/anime/eps/${id}`, headers);
    const json = await response.json();

    for (const ep of json) {
        results.push({
            number: ep.number,
            href: `&id=${id}&num=${ep.number}`
        });
    }

    return JSON.stringify(results);
}

async function extractStreamUrl(slug) {
    const headers = {
        'Referer': 'https://animetsu.to/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    const fixedSlug = slug.replace('&', '?');
    const streams = [];

    const serverListRes = await fetchv2(`https://backend.animetsu.to/api/anime/servers${fixedSlug}`, headers);
    const serverList = await serverListRes.json();
    console.log("Fetched server list: " + JSON.stringify(serverList));
    const unfixedSlug = fixedSlug.replace('?', '&');

    for (const server of serverList) {
        if (server.name?.toLowerCase().includes('zoro') || server.id?.toLowerCase().includes('zoro')) {
            console.log(`Skipping Zoro server: ${server.name || server.id}`);
            continue;
        }

        for (const subType of ['sub', ...(server.hasDub ? ['dub'] : [])]) {
            const url = `https://backend.animetsu.to/api/anime/tiddies?server=${server.id}${unfixedSlug}&subType=${subType}`;
            console.log("Fetching stream URL:" + url);
            const res = await fetchv2(url, headers);
            const data = await res.json();

            if (data?.sources?.length) {
                for (const { quality, url: streamUrl } of data.sources) {
                    const language = subType === 'sub' ? 'HARDSUB' : subType.toUpperCase();
                    streams.push(`${server.id} - ${quality} - ${language}`, streamUrl);
                }
            }
        }
    }

    const final = {
        streams,
        subtitles: ""
    };

    console.log("RETURN: " + JSON.stringify(final));
    return JSON.stringify(final);
}




function cleanHtmlSymbols(string) {
    if (!string) return "";

    return string
        .replace(/&#8217;/g, "'")
        .replace(/&#8211;/g, "-")
        .replace(/&#[0-9]+;/g, "")
        .replace(/\r?\n|\r/g, " ")  
        .replace(/\s+/g, " ")       
        .replace(/<i[^>]*>(.*?)<\/i>/g, "$1")
        .replace(/<b[^>]*>(.*?)<\/b>/g, "$1") 
        .replace(/<[^>]+>/g, "")
        .trim();                 
}
