async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2(
            "https://ww.anime4up.rest/?search_param=animes&s=" + encodeURIComponent(keyword)
        );
        const html = await response.text();

        const regex = /<div class="anime-card-container">[\s\S]*?<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[\s\S]*?<h3><a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a><\/h3>/gi;

        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[4].trim(), 
                image: match[1].trim().replace('ww.anime4up.rest', 'www.anime4up.rest'),
                href: match[3].trim().replace('ww.anime4up.rest', 'www.anime4up.rest') 
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

        const descMatch = /<p class="anime-story">([\s\S]*?)<\/p>/i.exec(html);
        const description = descMatch ? descMatch[1].trim() : "N/A";

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
        
        const episodeRegex = /<div class="col-lg-3[^"]*DivEpisodeContainer">([\s\S]*?)<\/div>\s*<\/div>/gi;
        let match;
        let epNumber = 1;
        
        while ((match = episodeRegex.exec(html)) !== null) {
            const hrefMatch = /<h3><a href="([^"]+)"/i.exec(match[1]);
            const href = hrefMatch ? hrefMatch[1].trim() : "";
            results.push({
                href: href,
                number: epNumber
            });
            epNumber++;
        }
        
        const paginationRegex = /<li\s*><a\s+class="page-numbers"\s+href="[^"]*\/page\/(\d+)\/">(\d+)<\/a><\/li>/gi;
        let maxPage = 1;
        let paginationMatch;
        
        while ((paginationMatch = paginationRegex.exec(html)) !== null) {
            const pageNum = parseInt(paginationMatch[2]);
            if (pageNum > maxPage) {
                maxPage = pageNum;
            }
        }
        
        if (maxPage > 1) {
            const pagePromises = [];
            
            for (let page = 2; page <= maxPage; page++) {
                const pageUrl = `${url}/page/${page}/`;
                pagePromises.push(fetchPageEpisodes(pageUrl, epNumber + (page - 2) * getEpisodesPerPage(results.length)));
            }
            
            const pageResults = await Promise.all(pagePromises);
            
            pageResults.forEach(pageEpisodes => {
                results.push(...pageEpisodes);
            });
            
            results.forEach((episode, index) => {
                episode.number = index + 1;
            });
        }
        
        return JSON.stringify(results);
        
    } catch (err) {
        return JSON.stringify([{
            href: "Error",
            number: "Error"
        }]);
    }
}

async function fetchPageEpisodes(pageUrl, startingEpNumber) {
    try {
        const response = await fetchv2(pageUrl);
        const html = await response.text();
        const episodeRegex = /<div class="col-lg-3[^"]*DivEpisodeContainer">([\s\S]*?)<\/div>\s*<\/div>/gi;
        const pageResults = [];
        let match;
        let epNumber = startingEpNumber;
        
        while ((match = episodeRegex.exec(html)) !== null) {
            const hrefMatch = /<h3><a href="([^"]+)"/i.exec(match[1]);
            const href = hrefMatch ? hrefMatch[1].trim() : "";
            pageResults.push({
                href: href,
                number: epNumber
            });
            epNumber++;
        }
        
        return pageResults;
    } catch (err) {
        return [];
    }
}

function getEpisodesPerPage(firstPageCount) {
    return firstPageCount || 12; 
}

async function extractStreamUrl(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const match = /<a[^>]+data-ep-url="([^"]*uqload\.cx[^"]*)"/i.exec(html);
        if (match) {
            console.log(match[1].trim());
            const response2 = await fetchv2(match[1].trim());
            const html2 = await response2.text();

            const match2 = /sources:\s*\[\s*"([^"]+)"\s*\]/i.exec(html2);
            const url = match2 ? match2[1] : null;


            return url;
        }

        return "dwd";
    } catch (err) {
        console.error(err);
        return "https://files.catbox.moe/avolvc.mp4";
    }
}
