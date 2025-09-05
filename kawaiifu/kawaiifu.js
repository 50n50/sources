async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2("https://kawaiifu.com/search-movie?keyword=" + encodeURIComponent(keyword)+ "&cat-get=");
        const html = await response.text();

        const regex = /<a class="thumb" href="([^"]+)"><img src="([^"]+)"[^>]*alt="([^"]+)"><\/a>/g;

        let match;
        while ((match = regex.exec(html)) !== null) {
            let href = match[1].trim();
            href = href.replace("https://kawaiifu.com/", "https://domdom.stream/anime/").replace(/\.html$/, "");

            results.push({
                href: href,
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


function cleanTitle(title) {
    return title
        .replace(/&#8217;/g, "'")  
        .replace(/&#8211;/g, "-")  
        .replace(/&#[0-9]+;/g, ""); 
}

async function extractDetails(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();
        
        const summaryMatch = html.match(/<h5[^>]*>Summary<\/h5>([\s\S]*?)(?=<\/div>|$)/i);
        
        if (!summaryMatch) {
            return JSON.stringify([{
                description: "Description not found",
                aliases: "N/A",
                airdate: "N/A"
            }]);
        }
        
        let description = summaryMatch[1]
            .replace(/<[^>]*>/g, '') 
            .replace(/&#8217;/g, "'") 
            .replace(/&nbsp;/g, ' ') 
            .replace(/&amp;/g, '&') 
            .replace(/\s+/g, ' ') 
            .trim();
        
        if (!description) {
            description = "No description available";
        }
        
        let aliases = "N/A";
        const italicMatch = summaryMatch[1].match(/<i>([^<]+)<\/i>/);
        if (italicMatch) {
            aliases = italicMatch[1].trim();
        }
        
        let airdate = "N/A";
        const yearMatch = description.match(/(\d{4})/);
        if (yearMatch) {
            airdate = yearMatch[1];
        }
        
        return JSON.stringify([{
            description: description,
            aliases: aliases,
            airdate: airdate
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
        
        const listRegex = /<ul class="list-ep"[^>]*>([\s\S]*?)<\/ul>/;
        const listMatch = html.match(listRegex);
        
        if (!listMatch) {
            return JSON.stringify([]);
        }
        
        const listContent = listMatch[1];
        
        const linkRegex = /<a\s+href="([^"]+)"[\s\S]*?>([\s\S]*?)<\/a>/g;
        
        let match;
        while ((match = linkRegex.exec(listContent)) !== null) {
            const href = match[1];
            const text = match[2].replace(/\s+/g, ' ').trim(); 
            
            let number = 1;
            
            const textMatch = text.match(/Ep\s*(\d+)/i);
            if (textMatch) {
                number = parseInt(textMatch[1], 10);
            }
            else {
                const urlMatch = href.match(/[?&]ep=(\d+)/);
                if (urlMatch) {
                    number = parseInt(urlMatch[1], 10);
                }
            }
            
            results.push({
                href: href,
                number: number
            });
        }
        
        results.sort((a, b) => a.number - b.number);
        
        return JSON.stringify(results);
    } catch (err) {
        console.error('Extract episodes error:', err);
        return JSON.stringify([{
            href: "Error",
            number: "Error"
        }]);
    }
}

async function extractStreamUrl(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();
        
        const patterns = [
            /<source\s+src="([^"]+\.mp4[^"]*)"[^>]*>/i,
            /atr_id="([^"]+\.mp4[^"]*)"[^>]*>/i,
            /<video[^>]+src="([^"]+\.mp4[^"]*)"[^>]*>/i
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return "https://files.catbox.moe/avolvc.mp4";
        
    } catch (err) {
        return "https://files.catbox.moe/avolvc.mp4";
    }
}
