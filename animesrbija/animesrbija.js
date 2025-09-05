async function searchResults(keyword) {
    const results = [];
    const baseUrl = "https://www.animesrbija.com";
    const response = await fetchv2("https://www.animesrbija.com/filter?search=" + encodeURIComponent(keyword));
    const html = await response.text();
    
    const animeItems = html.match(/<div class="ani-item">.*?<\/h3><\/a><\/div>/gs) || [];
    
    animeItems.forEach(itemHtml => {
        const titleMatch = itemHtml.match(/<h3 class="ani-title" title="([^"]+)"/);
        const hrefMatch = itemHtml.match(/<a href="([^"]+)"/);
        const imgMatch = itemHtml.match(/<noscript>.*?src="([^"]+)".*?<\/noscript>/s);
        
        const title = titleMatch ? titleMatch[1].trim() : '';
        const href = hrefMatch ? baseUrl + hrefMatch[1].trim() : '';
        let imageUrl = '';
        
        if (imgMatch) {
            let srcUrl = imgMatch[1];
            if (srcUrl.includes('/_next/image?url=')) {
                const urlParam = srcUrl.match(/url=([^&]+)/);
                if (urlParam) {
                    imageUrl = baseUrl + decodeURIComponent(urlParam[1]);
                }
            } else {
                imageUrl = srcUrl.startsWith('http') ? srcUrl : baseUrl + srcUrl;
            }
        }
        
        if (title && href) {
            results.push({
                title,
                image: imageUrl,
                href
            });
        }
    });
    
    console.log(results);
    return JSON.stringify(results);
}

async function extractDetails(url) {
    const details = [];
    const response = await fetchv2(url);
    const html = await response.text();
    const descriptionMatch = html.match(/<div class="anime-description">([\s\S]*?)<\/div>/);
    let description = descriptionMatch ? descriptionMatch[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/<br \/>\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() : '';


    const nameMatch = html.match(/<h2 class="anime-name[^>]*>([^<]+)<\/h2>/);
    const engNameMatch = html.match(/<h3 class="anime-eng-name">([^<]+)<\/h3>/);

    const airdateMatch = html.match(/<span class="bt">Datum:<\/span>([^<]+)/);
    let airdate = airdateMatch ? airdateMatch[1].trim() : '';

    let name = nameMatch ? nameMatch[1].trim() : '';
    let engName = engNameMatch ? engNameMatch[1].trim() : '';
    let aliases = name === engName ? 'N/A' : engName;

    if (description || airdate) {
        details.push({
            description: description,
            aliases: aliases,
            airdate: airdate
        });
    }

    console.log(details);
    return JSON.stringify(details);
}

async function extractEpisodes(url) {
    const episodes = [];
    const response = await fetchv2(url);
    const html = await response.text();
    const baseUrl = 'https://www.animesrbija.com';
    
    const episodeRegex = /<li\s+class="anime-episode-item">\s*<span\s+class="anime-episode-num">([^<]+)<\/span>\s*<a\s+class="anime-episode-link"\s+href="([^"]+)"/g;
    
    let match;
    while ((match = episodeRegex.exec(html)) !== null) {
        const episodeText = match[1].trim();
        const href = baseUrl + match[2];
        let number;
        
        if (episodeText.toLowerCase() === 'film') {
            number = 1;
        } else {
            const numberMatch = episodeText.match(/\d+/);
            number = numberMatch ? parseInt(numberMatch[0], 10) : null;
                }
        
        episodes.push({
            href: href,
            number: number
        });
    }
    
    episodes.reverse();
    console.log(JSON.stringify(episodes));
    return JSON.stringify(episodes);
}

async function extractStreamUrl(url) {
    const response = await fetchv2(url);
    const html = await response.text();

    const playerRegex = /"player1":\s*"?(!?https?:\/\/[^"\n]+\.m3u8)"/i;

    const match = html.match(playerRegex);
    if (match) {
        let playerUrl = match[1].trim();
        if (playerUrl.startsWith('!')) {
            playerUrl = playerUrl.substring(1);
        }
        console.log("URL", playerUrl);
        return playerUrl;
    } else {
        console.log("Link not found");
        return null;
    }
}



