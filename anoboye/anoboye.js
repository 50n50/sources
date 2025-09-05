async function searchResults(keyword) {
    const results = [];
    const response = await fetchv2(`https://anoboye.com/?s=${keyword}`);
    const html = await response.text();

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
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
        if (!iframeMatch) throw new Error("iframe not found");

        const iframeUrl = iframeMatch[1];

        const iframeResponse = await fetchv2(iframeUrl);
        const iframeHtml = await iframeResponse.text();

        const videoMatch = iframeHtml.match(/videoUrl:\s*["']([^"']+)["']/i);
        if (!videoMatch) throw new Error("videoUrl not found");

        return videoMatch[1].replace(/\\/g, ""); 
    } catch (err) {
        return "https://files.catbox.moe/avolvc.mp4";
    }
}

