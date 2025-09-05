async function searchResults(keyword) {
    const searchUrl = `https://hds.turkish123.com/?s=${encodeURIComponent(keyword)}`;
    try {
        const response = await fetch(searchUrl);
        const html = await response;
        const results = [];

        const itemRegex = /<div[^>]*class="ml-item"[^>]*>[\s\S]*?<\/div>/g;
        const items = html.match(itemRegex) || [];

        items.forEach((itemHtml) => {
            const titleMatch = itemHtml.match(/<span class="mli-info"><h2>([^<]+)<\/h2><\/span>/);
            const imgMatch = itemHtml.match(/<img[^>]*src="([^"]+)"[^>]*class="mli-thumb"/);
            const hrefMatch = itemHtml.match(/<a href="([^"]+)"[^>]*class="ml-mask/);

            if (!titleMatch || !imgMatch || !hrefMatch) return;

            const title = titleMatch[1].trim();
            const imageUrl = imgMatch[1].trim();
            const href = hrefMatch[1].trim();

            results.push({
                title,
                image: imageUrl,
                href
            });
        });
        //console.log(results);
        console.log(JSON.stringify(results));
        return JSON.stringify(results);
    } catch (error) {
        throw error;
    }
}

async function extractDetails(url) {
    const details = [];

    try {
        const response = await fetch(url);
        const html = await response;

        const descriptionMatch = html.match(/<p class="f-desc">([\s\S]*?)<\/p>/);
        let description = descriptionMatch ? descriptionMatch[1].trim() : 'Weirdly the website doesn\'t provide any description, either that or I\'m blind.';

        description = description.replace(/&#8211;/g, '–').replace(/&#8217;/g, '’');

        const yearMatch = html.match(/<i class="fa fa-calendar" aria-hidden="true"><\/i><strong>Year:<\/strong>[\s\S]*?<a href="[^"]*" rel="tag">(\d{4})<\/a>/);
        const airdate = yearMatch ? yearMatch[1] : 'N/A';

        details.push({
            description,
            alias: 'N/A',
            airdate
        });
        //console.log(details);
        console.log(JSON.stringify(details));
        return JSON.stringify(details);
    } catch (error) {
        console.error('Error extracting details:', error);
        return JSON.stringify([]);
    }
}

async function extractEpisodes(url) {
    const response = await fetch(url);
    const html = await response;
    const episodes = [];

    const episodeMatches = html.match(/<a class="episodi" href="([^"]+)">[^<]*Episode (\d+)[^<]*(?:<span[^>]*>[^<]*<\/span>)?[^<]*<\/a>/g);

    if (episodeMatches) {
        episodeMatches.forEach((match) => {
            const hrefMatch = match.match(/href="([^"]+)"/);
            const episodeNumberMatch = match.match(/Episode (\d+)/);

            if (hrefMatch && episodeNumberMatch) {
                episodes.push({
                    href: hrefMatch[1].trim(),
                    number: parseInt(episodeNumberMatch[1], 10) 
                });
            }
        });
    }
    //console.log(episodes);
    console.log(JSON.stringify(episodes));
    return JSON.stringify(episodes);
}

async function extractStreamUrl(url) {
    const response = await fetch(url);
    const data = await response;
    const iframeMatch = data.match(/var copyTexti= \['<iframe[^>]*src="(https:\/\/tukipasti\.com\/[^"]+)"[^>]*><\/iframe>'\]/);

    if (iframeMatch) {
        const iframeUrl = iframeMatch[1];
        const responseTwo = await fetch(iframeUrl);
        const dataTwo = await responseTwo;
        const m3u8Match = dataTwo.match(/var urlPlay = '([^']+)'/);

        if (m3u8Match) {
            const m3u8Url = m3u8Match[1];
            console.log(m3u8Url);
            return m3u8Url;
        }
        return null;
    }
    return null;
}
