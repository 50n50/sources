async function searchResults(keyword) {
    const searchUrl = `https://kimcartoon.com.co/?s=${encodeURIComponent(keyword)}`;
    try {
        const response = await fetch(searchUrl);
        const html = await response;
        const results = [];
        const articleRegex = /<article[^>]*class="bs styletwo"[\s\S]*?<\/article>/g;
        const items = html.match(articleRegex) || [];
        
        function cleanTitle(title) {
            return title
                .replace(/&#8217;/g, "'")
                .replace(/&#8211;/g, "-")
                .replace(/&#[0-9]+;/g, "");
        }
        
        items.forEach((itemHtml) => {
            const titleMatch = itemHtml.match(/<a[^>]*href="([^"]+)"[^>]*title="([^"]+)"/);
            const imgMatch = itemHtml.match(/<img[^>]*src="([^"]+)"/);
            if (!titleMatch || !imgMatch) return;
            const href = `${titleMatch[1].trim()}?video_index=2`;
            const title = cleanTitle(titleMatch[2].trim());
            const imageUrl = imgMatch[1].trim();
            results.push({ title, image: imageUrl, href });
        });
        
        console.log(JSON.stringify(results));
        return JSON.stringify(results);
    } catch (error) {
        throw error;
    }
}

async function extractDetails(url) {
    const response = await fetch(url);
    const html = await response;
    const details = [];
    const descriptionMatch = html.match(/<div class="entry-content" itemprop="description">\s*<p>(.*?)<\/p>/);
    const description = descriptionMatch ? descriptionMatch[1].trim() : `N/A`;

    details.push({
        description,
        alias: 'N/A',
        airdate: 'N/A'
    });

    console.log(JSON.stringify(details));
    return JSON.stringify(details);
}
async function extractEpisodes(url) {
    const response = await fetch(url);
    const html = await response;
    const episodes = [];
    
    const allMatches = [...html.matchAll(/<li[^>]*>\s*<a href="([^"]+)">\s*<div class="epl-title">([^<]*) <\/div>/g)];
    
    for (const match of allMatches) {
        const href = match[1].trim();
        const title = match[2].trim();
        
        if (title.startsWith("Episode")) {
            const numberMatch = title.match(/Episode (\d+)/);
            if (numberMatch && numberMatch[1]) {
                episodes.push({
                    href: href,
                    number: parseInt(numberMatch[1], 10)
                });
            }
        } else {
            episodes.push({
                href: href,
                number: 1
            });
        }
    }
    
    episodes.reverse();
    console.log(JSON.stringify(episodes));
    return JSON.stringify(episodes);
}

async function extractStreamUrl(url) {
    const embedResponse = await fetch(url);
    const data = await embedResponse;
    
    const embedMatch = data.match(/<div class="pembed" data-embed="(.*?)"/);
    if (embedMatch && embedMatch[1]) {
        let embedUrl = embedMatch[1].trim();
        
        let fullEmbedUrl;
        if (embedUrl.startsWith('//')) {
            fullEmbedUrl = 'https:' + embedUrl;
        } else if (embedUrl.startsWith('http://') || embedUrl.startsWith('https://')) {
            fullEmbedUrl = embedUrl; 
        } else {
            fullEmbedUrl = 'https://' + embedUrl; 
        }
        
        console.log(fullEmbedUrl);
        const embedPageResponse = await fetch(fullEmbedUrl);
        const embedPageData = await embedPageResponse;
        
        console.log(embedPageData);
        const m3u8Match = embedPageData.match(/sources:\s*\[\{file:"(https:\/\/[^"]*\.m3u8)"/);
        if (m3u8Match && m3u8Match[1]) {
            const m3u8Url = m3u8Match[1];
            console.log(m3u8Url);
            return m3u8Url;
        } else {
            throw new Error("M3U8 URL not found.");
        }
    } else {
        throw new Error("Embed URL not found.");
    }
}
