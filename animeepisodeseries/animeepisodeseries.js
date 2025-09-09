async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2("https://animeepisodeseries.com/?s=" + encodeURIComponent(keyword));
        const html = await response.text();

        const regex = /<a href="([^"]+)"[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<h2 class="entry-title"><a [^>]+>([^<]+)<\/a><\/h2>/g;

        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[3].trim(),
                image: match[2].trim(),
                href: match[1].trim()
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

        const match = html.match(/<p><strong[\s\S]*?>[\s\S]*?Summary:[\s\S]*?<\/strong><br\s*\/?>(.*?)<\/p>/i);
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
    const results = [];
    try {
        const response = await fetchv2(url);
        const html = await response.text();
        
        const gridMatch = html.match(/<div[^>]+class="[^"]*eael-post-grid[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]+class="clearfix">/i);
    
        
        const gridHtml = gridMatch[1];
        
        const patterns = [
            /<a[^>]+href="([^"]*?-episode-(\d+)-[^"]*)"/gi,
            /<a[^>]+href="([^"]*?-episode-(\d+)(?:-[^"]*)?\/?)"/gi,
            /<a[^>]+href="([^"]*?episode(\d+)[^"]*)"/gi,
            /<a[^>]+href="([^"]*?ep(\d+)[^"]*)"/gi
        ];
        
        for (const regex of patterns) {
            let match;
            while ((match = regex.exec(gridHtml)) !== null) {
                const episodeNumber = parseInt(match[2], 10);
                
                if (!results.find(r => r.number === episodeNumber && r.href === match[1].trim())) {
                    results.push({
                        href: match[1].trim(),
                        number: episodeNumber
                    });
                }
            }
        }
        
        if (results.length === 0) {
            const linkRegex = /<a[^>]+href="([^"]+)"[^>]*title="[^"]*episode[^"]*(\d+)[^"]*"/gi;
            let match;
            while ((match = linkRegex.exec(gridHtml)) !== null) {
                results.push({
                    href: match[1].trim(),
                    number: parseInt(match[2], 10)
                });
            }
        }
        
        const uniqueResults = results.reduce((acc, current) => {
            const existing = acc.find(item => item.number === current.number);
            if (!existing) {
                acc.push(current);
            }
            return acc;
        }, []);
        
        uniqueResults.sort((a, b) => a.number - b.number);
        
        return JSON.stringify(uniqueResults);
        
    } catch (err) {
        console.error("Error in extractEpisodes:", err);
        return JSON.stringify([{
            href: "Error: " + err.message,
            number: "Error"
        }]);
    }
}

async function extractStreamUrl(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const match = html.match(/<iframe[^>]+src="(https:\/\/www\.4shared\.com\/web\/embed\/file\/[^"]+)"/i);
        const video = match ? match[1].trim() : null;
        console.log("Extracted iframe URL:"+ video);
        const response2 = await fetchv2(video);
        const html2 = await response2.text();
        
        const match2 = html2.match(/<source[^>]+src="([^"]+)"[^>]*type="video\/mp4"/i);
        
        return match2 ? match2[1].trim() : "dwa";
    } catch (err) {
        return "https://files.catbox.moe/avolvc.mp4";
    }
}

