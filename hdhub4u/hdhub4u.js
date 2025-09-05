async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2("https://hdhub4u.navy/?s=" + keyword);
        const html = await response.text();

        const regex = /<li class="thumb[^>]*>[\s\S]*?<img src="([^"]+)"[^>]*alt="([^"]+)"[\s\S]*?<a href="([^"]+)"/g;
        let match;

        while ((match = regex.exec(html)) !== null) {
            const title = cleanTitle(match[2].trim());
            if (!/episode/i.test(title)) {
                results.push({
                    title: title,
                    image: match[1].trim(),
                    href: match[3].trim()
                });
            }
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

        const regexTitle = /<h1 class="page-title">[\s\S]*?<span class="material-text">([\s\S]*?)<\/span>/i;
        const matchTitle = regexTitle.exec(html);
        const titleText = matchTitle ? matchTitle[1].replace(/<[^>]+>/g, "").trim() : "";

        let description;
        if (/episodes/i.test(titleText)) {
            description = "SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED - SHOWS NOT SUPPORTED ";
        } else {
            const regexDesc = /<div class="kno-rdesc">([\s\S]*?)<\/div>/i;
            const matchDesc = regexDesc.exec(html);
            description = matchDesc ? matchDesc[1].replace(/<[^>]+>/g, "").trim() : "N/A";
        }

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
  try {
    const response = await fetchv2(url);
    const html = await response.text();

    const regex = /<a\s+[^>]*href="([^"]+)"[^>]*>([^<]*(?:\d+p|\d+\.\d*(?:GB|MB)|480p|720p|1080p|4K|2160p)[^<]*)<\/a>/gi;
    
    let matches = [];
    let match;
    
    while ((match = regex.exec(html)) !== null) {
      const href = match[1].trim();
      const text = match[2].trim();
      
      if (!href.includes('join-our-group') && 
          !href.includes('telegram') && 
          !href.includes('whatsapp') && 
          !text.toLowerCase().includes('join') &&
          !text.toLowerCase().includes('group')) {
        matches.push({
          href: href,
          text: text
        });
      }
    }
    
    const lastMatch = matches.length > 0 ? matches[matches.length - 1] : null;
    
    return JSON.stringify([{
      href: lastMatch ? lastMatch.href : "N/A",
      number: 1,
      text: lastMatch ? lastMatch.text : "N/A"
    }]);
    
  } catch (err) {
    console.error('Error extracting episodes:', err);
    return JSON.stringify([{
      href: "Error",
      number: "Error",
      text: "Error"
    }]);
  }
}

async function extractStreamUrl(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const regex = /<title>HubDrive \| (.*?)<\/title>/i;
        const match = regex.exec(html);
        const filename = match ? match[1].trim() : "default.mp4";

        const baseUrls = ["https://fsl.fastcloud.lol/", "https://fsl.fastcloud.buzz/"];
        let fullUrl = null;

        for (const base of baseUrls) {
            const testUrl = base + filename;
            try {
                const passthroughUrl = "https://passthrough-worker.simplepostrequest.workers.dev/?head=" + encodeURIComponent(testUrl);
                const resText = await fetchv2(passthroughUrl).then(r => r.text());
                if (!/Status:404/i.test(resText)) {
                    fullUrl = testUrl;
                    break;
                }
            } catch {}
        }

        if (!fullUrl) fullUrl = "https://files.catbox.moe/avolvc.mp4";

        console.log("Full URL:"+ fullUrl);
        return fullUrl;
    } catch (err) {
        console.log("Full URL:"+ "https://files.catbox.moe/avolvc.mp4");
        return "https://files.catbox.moe/avolvc.mp4";
    }
}

function cleanTitle(title) {
    return title
        .replace(/&#8217;|&rsquo;/g, "'")
        .replace(/&#8216;|&lsquo;/g, "'")
        .replace(/&#8220;|&ldquo;/g, '"')
        .replace(/&#8221;|&rdquo;/g, '"')
        .replace(/&#8211;|&ndash;/g, "-")
        .replace(/&#8212;|&mdash;/g, "--")
        .replace(/&#8230;|&hellip;/g, "...")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&#[0-9]+;/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

