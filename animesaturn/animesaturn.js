async function searchResults(keyword) {
    const results = [];
    const response = await fetchv2(`https://www.animesaturn.cx/animelist?search=${keyword}`);
    const html = await response.text();

    const regex = /<a href="(https:\/\/www\.animesaturn\.cx\/anime\/[^"]+)"[^>]*class="thumb image-wrapper">\s*<img src="(https:\/\/cdn\.animesaturn\.cx\/static\/images\/copertine\/[^"]+)"[^>]*alt="([^"]+)"/g;

    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push({
            title: match[3].trim(),
            image: match[2].trim(),
            href: match[1].trim()
        });
    }

    return JSON.stringify(results);
}

async function extractDetails(url) {
    const results = [];
    const response = await fetchv2(url);
    const html = await response.text();

    const descriptionRegex = /<div id="shown-trama">([^<]+)<\/div>/;
    const descriptionMatch = html.match(descriptionRegex);
    const description = descriptionMatch ? descriptionMatch[1].trim() : 'N/A';

    results.push({
        description: description,
        aliases: 'N/A',
        airdate: 'N/A'
    });

    return JSON.stringify(results);
}

async function extractEpisodes(url) {
    const results = [];
    const response = await fetchv2(url);
    const html = await response.text();

    const episodeRegex = /<a\s+href="(https:\/\/www\.animesaturn\.cx\/ep\/[^"]+)"\s*target="_blank"\s*class="btn btn-dark mb-1 bottone-ep">\s*Episodio\s+(\d+)\s*<\/a>/gs;

    let match;
    while ((match = episodeRegex.exec(html)) !== null) {
        results.push({
            href: match[1].trim(),
            number: parseInt(match[2], 10)
        });
    }

    return JSON.stringify(results);
}

async function extractStreamUrl(url) {
    const response = await fetchv2(url);
    const html = await response.text();

    const streamUrlRegex = /<a href="(https:\/\/www\.animesaturn\.cx\/watch\?file=[^"]+)"/;
    const match = html.match(streamUrlRegex);

    const redirect = match ? match[1] : null;
    const responseTwo = await fetchv2(redirect);
    const htmlTwo = await responseTwo.text();

    const hlsUrlRegex = /file:\s*"(https:\/\/[^"]+\.m3u8)"/;
    const hlsMatch = htmlTwo.match(hlsUrlRegex);
    
    if (hlsMatch) {
        return hlsMatch[1].trim();
    }
    
    const mp4UrlRegex = /<source[^>]+src="(https:\/\/[^">]+\.mp4)"/;
    const mp4Match = htmlTwo.match(mp4UrlRegex);
    
    return mp4Match ? mp4Match[1].trim() : null;
}

