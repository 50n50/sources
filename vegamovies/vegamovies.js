async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2(`https://vegamovies10.com/search.php?query=${keyword}`);
        const html = await response.text();

        const regex = /<a[^>]+href="([^"]+)"[^>]+title="([^"]+)"[^>]*class="blog-img[^"]*"[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*>/g;

        let match;
        while ((match = regex.exec(html)) !== null) {
            const title = match[2].trim();

            if (/episodes?/i.test(title)) continue;

            results.push({
                title,
                image: match[3].trim().startsWith("http") ? match[3].trim() : "https://vegamovies10.com" + match[3].trim(),
                href: match[1].trim().startsWith("http") ? match[1].trim() : "https://vegamovies10.com" + match[1].trim()
            });
        }

        return JSON.stringify(results);
    } catch (err) {
        console.error("Search error:" + err);
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
        
        const match = html.match(/<h3[^>]*>[\s\S]*?Movie-SYNOPSIS\/PLOT:[\s\S]*?<\/h3>\s*<p>([\s\S]*?)<\/p>/i);
        
        const rawDescription = match ? match[1] : "";
        const cleaned = rawDescription
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .trim();
            
        return JSON.stringify([{
            description: cleaned || "N/A",
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
    try {
        const response = await fetchv2(url);
        const html = await response.text();
        
        let match = html.match(/<h5[^>]*>([\s\S]*?1080p[\s\S]*?)<\/h5>[\s\S]*?<a\s+href="([^"]+)"/i);
        
        if (!match) {
            match = html.match(/<h5[^>]*>([\s\S]*?720p[\s\S]*?)<\/h5>[\s\S]*?<a\s+href="([^"]+)"/i);
        }
        
        if (!match) {
            match = html.match(/<h5[^>]*>([\s\S]*?480p[\s\S]*?)<\/h5>[\s\S]*?<a\s+href="([^"]+)"/i);
        }
        
        let downloadLink = null;
        if (match) {
            downloadLink = match[2].trim();
            const qualityText = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            console.log('Selected quality: ' + qualityText);
        }
        
        if (downloadLink) {
            return JSON.stringify([{
                href: downloadLink,
                number: 1
            }]);
        } else {
            return JSON.stringify([{
                href: "No download link found",
                number: 1
            }]);
        }
    } catch (err) {
        return JSON.stringify([{
            href: "Error",
            number: "Error"
        }]);
    }
}

async function extractStreamUrl(url) {
    try {
        const headers = {
            "Referer": "https://vegamovies10.com/"
        };
        const response = await fetchv2(url, headers);
        const html = await response.text();
        
        const match = html.match(/<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?V-Cloud[\s\S]*?<\/a>/i);
        if (!match) {
            console.log("No V-Cloud link found");
            return "Error";
        }

        const relativeUrl = match[1].trim();
        const finalUrl = relativeUrl.startsWith("http")
            ? relativeUrl
            : "https://www.9xlinks.xyz" + relativeUrl;

        const followResponse = await fetchv2(finalUrl);
        const followText = await followResponse.text();

        const downloadMatch = followText.match(/<div class="mt-6 flex justify-center space-x-3">[\s\S]*?<a href="([^"]+)"/i);

        if (downloadMatch) {
            const downloadUrl = downloadMatch[1].trim();
            console.log("Direct Download URL: " + downloadUrl);
            return downloadUrl;
        } else {
            console.log("No direct download link found");
            return "Error";
        }

    } catch (err) {
        console.log("Error in extractStreamUrl: " + err);
        return "Error";
    }
}




