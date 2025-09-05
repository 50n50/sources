async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2("https://animesdrive.blog/?s=" + encodeURIComponent(keyword));
        const html = await response.text();

        const regex = /<div class="result-item">[\s\S]*?<a href="([^"]+)"[^>]*>\s*<img src="([^"]+)"[^>]*alt="([^"]+)"/g;

        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                href: match[1].trim(),
                image: match[2].trim(),
                title: cleanHtmlSymbols(match[3].trim())
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

        const regex = /<p[^>]*>\s*Sinopse\s*:\s*([\s\S]*?)<\/p>/i;
        const match = regex.exec(html);

        const description = match ? match[1].trim() : "fuck off you don't need a description";

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
    
    const regex = /<div class=['"]?numerando['"]?[^>]*>\d+\s*-\s*(\d+)<\/div>[\s\S]*?<a\s+href=['"]([^'"]+)['"][^>]*>/g;

    try {
        const response = await fetchv2(url);
        const html = await response.text();

        let match;
        while ((match = regex.exec(html)) !== null) {
            const episodeNumber = parseInt(match[1], 10);  
            const href = match[2].trim();

            results.push({
                href: "episode: " + href,
                number: episodeNumber
            });
        }

        if (results.length === 0) {
            results.push({
                href: "movie: " + url,        
                number: 1         
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

async function extractStreamUrl(url) {
    try {
        let endpointType;

        if (url.startsWith("movie: ")) {
            url = url.replace("movie: ", "");
            endpointType = "movie";
        } else if (url.startsWith("episode: ")) {
            url = url.replace("episode: ", "");
            endpointType = "tv";
        } else {
            return "ERROR";
        }

        const response = await fetchv2(url);
        const html = await response.text();

        const idMatch = html.match(/<link rel=['"]shortlink['"] href=['"][^?]+\?p=(\d+)['"]/);
        if (!idMatch) return "ID NOT FOUND";
        const id = idMatch[1];

        const apiUrl = `https://animesdrive.blog/wp-json/dooplayer/v2/${id}/${endpointType}/1`;
        const apiResponse = await fetchv2(apiUrl);
        const apiData = await apiResponse.json();
        console.log(JSON.stringify(apiData));
     
        const embedResponse = await fetchv2(apiData.embed_url);
        const embedHtml = await embedResponse.text();

        const match = embedHtml.match(/<source\s+src="([^"]+)"\s+type="video\/mp4"/i);
        const finalUrl = match ? match[1] : null;
        console.log("Final URL: " + finalUrl);
        
        return finalUrl
    } catch (err) {
        console.error("Error extracting stream URL:"+ err);
        return "{ error: err.message }";
    }
}

function cleanHtmlSymbols(string) {
  if (!string) return "";
  return string
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#[0-9]+;/g, "")
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
