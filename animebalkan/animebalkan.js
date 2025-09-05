function preprocessHtml(html) {
    //Module specefic, ignore
    return html.replace(/\\2605/g, '★');
}

function searchResults(html) {
    html = preprocessHtml(html);
    const results = [];
    const baseUrl = "https://animebalkan.org/";

    const filmListRegex = /<article class="bs"[\s\S]*?<\/article>/g;
    const items = html.match(filmListRegex) || [];

    items.forEach((itemHtml) => {
        const titleMatch = itemHtml.match(/<h2 itemprop="headline">([^<]+)<\/h2>/);
        const hrefMatch = itemHtml.match(/<a[^>]+href="([^"]+)"[^>]*>/);
        const imgMatch = itemHtml.match(/<img[^>]+src="([^"]+)"[^>]*>/);

        let title = titleMatch ? titleMatch[1].trim().replace(/&#8211;/g, '–') : '';
        const href = hrefMatch ? hrefMatch[1].trim() : '';
        const imageUrl = imgMatch ? imgMatch[1].trim() : '';

        if (title && href) {
            results.push({
                title,
                image: imageUrl.startsWith('http') ? imageUrl : baseUrl + imageUrl,
                href
            });
        }
    });

    return results;
}


function extractDetails(html) {
    const details = [];
    const descriptionMatch = html.match(/<span class="Y2IQFc"[^>]*>([\s\S]*?)<\/span>/);
    const airdateMatch = html.match(/<time[^>]*datetime="([^"]+)"/);
    
    if (descriptionMatch) {
        let description = descriptionMatch[1].trim()
            .replace(/&#8211;/g, '-')  
            .replace(/&#8212;/g, '—')  
            .replace(/&#8220;/g, '"')   
            .replace(/&#8221;/g, '"')  
            .replace(/&#8230;/g, '...') 
            .replace(/&#8243;/g, '"')  
            .replace(/&#8242;/g, "'");  
        
        let airdate = airdateMatch ? airdateMatch[1].split('T')[0] : '';
        
        if (description && airdate) {
            details.push({
                description: description,
                aliases: 'N/A',
                airdate: airdate
            });
        }
    }
    
    return details;
}

function extractEpisodes(html) {
    const episodes = [];
    const episodeRegex = /<a href="([^"]+)">[^<]*<div class="epl-num">([^<]+)<\/div>/g;
    
    let match;
    while ((match = episodeRegex.exec(html)) !== null) {
        const href = match[1];
        let number = match[2];
        
        const isMovie = href.includes('film') || 
                       href.includes('movie') ||
                       number.toLowerCase() === 'film';
        
        if (isMovie) {
            number = '1';
        }
        
        if (href.includes('epizoda-') || 
            href.includes('specijalna-epizoda') || 
            href.includes('-epizoda/') ||
            href.includes('film') ||
            href.includes('movie')) {
            
            episodes.push({
                href: href,
                number: number
            });
        }
    }
    
    episodes.reverse();
    console.log(episodes);
    return episodes;
}

function extractStreamUrl(html) {
    const sourceRegex = /<source\s+[^>]*src="([^"]+)"/;
    const match = html.match(sourceRegex);

    if (match) {
        console.log(match[1]);
        return match[1]; 
    } else {
        console.log("No stream URL found.");
        return null;
    }
}
