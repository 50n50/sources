async function searchResults(keyword) {
    const results = [];
    const response = await fetchv2(`https://animenosub.to/?s=${keyword}`);
    const html = await response.text();

    // Regex pattern to extract the title, image, and href from the article elements
    const regex = /<article class="bs"[^>]*>.*?<a href="([^"]+)"[^>]*>.*?<img src="([^"]+)"[^>]*>.*?<h2[^>]*>(.*?)<\/h2>/gs;

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

    const match = html.match(/<div class="entry-content"[^>]*>([\s\S]*?)<\/div>/);

    let description = "N/A";
    if (match) {
        description = match[1]
            .replace(/<[^>]+>/g, '') 
            .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code)) 
            .replace(/&quot;/g, '"') 
            .replace(/&apos;/g, "'") 
            .replace(/&amp;/g, "&") 
            .trim();
    }

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

    const regex = /<a href="([^"]+)">\s*<div class="epl-num">([\d.]+)<\/div>/g;

    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push({
            href: match[1].trim(),
            number: parseInt(match[2], 10)
        });
    }
    results.reverse();
    return JSON.stringify(results);
}


async function extractStreamUrl(url) {
    const response = await fetchv2(url);
    const html = await response.text();

    const regexSub = /<option value="([^"]+)"[^>]*>\s*SUB - Omega\s*<\/option>/;
    const regexFallback = /<option value="([^"]+)"[^>]*>\s*Omega\s*<\/option>/;
    const anotherFallbackDawggggWhatsWrongWithTHisWebsite = /<option value="([^"]+)"[^>]*>\s*SUB v2 - Omega\s*<\/option>/;


    let match = html.match(regexSub) || html.match(regexFallback) || html.match(anotherFallbackDawggggWhatsWrongWithTHisWebsite);
    if (!match) return null;

    const decodedHtml = atob(match[1]); // Decode base64
    const iframeMatch = decodedHtml.match(/<iframe\s+src="([^"]+)"/);

    if (!iframeMatch) return null;

    const streamUrl = iframeMatch[1].startsWith("//") ? "https:" + iframeMatch[1] : iframeMatch[1];

    const responseTwo = await fetchv2(streamUrl);
    const htmlTwo = await responseTwo.text();

    const m3u8Match = htmlTwo.match(/sources:\s*\[\{file:"([^"]+\.m3u8)"/);
    console.error(m3u8Match ? m3u8Match[1] : null);
    return m3u8Match ? m3u8Match[1] : null;
}