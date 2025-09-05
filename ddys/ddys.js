async function searchResults(keyword) {
    const searchUrl = `https://ddys.pro/?s=${encodeURIComponent(keyword)}`;
    try {
        const response = await fetchv2(searchUrl);
        const html = await response.text();
        const results = [];

        const articleRegex = /<article id="post-\d+"[^>]*>[\s\S]*?<h2 class="post-title"><a href="([^"]+)"[^>]*>([^<]+)<\/a><\/h2>/g;
        let match;

        while ((match = articleRegex.exec(html)) !== null) {
            const href = match[1].trim();
            const title = match[2].trim();
            const imageUrl = "https://i.ibb.co/Y4b38sTG/Search-has-no-images.png";

            results.push({
                title,
                image: imageUrl,
                href
            });
        }

        console.log(results);
        return JSON.stringify(results);
    } catch (error) {
        throw error;
    }
}

async function extractDetails(url) {
    const response = await fetchv2(url);
    const html = await response.text();

    const aliasMatch = html.match(/又名:\s*([^<]+)/);
    const descriptionMatch = html.match(/简介:\s*([\s\S]*?)<\/div>/);
    const airdateMatch = html.match(/年份:\s*(\d{4})/);

    const alias = aliasMatch ? aliasMatch[1].trim() : "N/A";
    const description = descriptionMatch ? descriptionMatch[1].trim() : "No description available.";
    const airdate = airdateMatch ? airdateMatch[1].trim() : "N/A";

    const details = [{
        alias,
        description,
        airdate
    }];

    console.log(JSON.stringify(details));
    return JSON.stringify(details);
}

async function extractEpisodes(url) {
    const response = await fetchv2(url);
    const html = await response.text();
    const episodes = [];

    const scriptMatch = html.match(/<script class="wp-playlist-script" type="application\/json">(\{[\s\S]*?\})<\/script>/);

    if (scriptMatch) {
        const jsonData = JSON.parse(scriptMatch[1]);

        jsonData.tracks.forEach(track => {
            if (track.src0) {
                const episodeMatch = track.src0.match(/S01E(\d+)/) || track.caption.match(/\u7b2c(\d+)\u96c6/);
                const episodeNumber = episodeMatch ? parseInt(episodeMatch[1], 10) : null; // Convert to integer

                episodes.push({
                    href: `https://v.ddys.pro${track.src0.trim()}`,
                    number: episodeNumber
                });
            }
        });
    }

    console.log(episodes);
    return JSON.stringify(episodes);
}


async function extractStreamUrl(url) {
    return url;
}
