async function searchResults(keyword) {
    const results = [];
    const response = await fetchv2(`https://www.dora-video.cn/search/${keyword}/`);
    const html = await response.text();

    const regex = /<div class="card-img-bili">.*?<a href="(.*?)">.*?data-url="(.*?)".*?<span class="title">(.*?)<\/span>/gs;
    
    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push({
            title: (match[3] || "").trim().replace(/<font color="red">a<\/font>|<font color="red">|<\/font>/g, " "),
            image: "https://i.ibb.co/ds7r6YJy/Search-has-no-images.png",
            href: match[1].trim()
        });
    }

    return JSON.stringify(results);
}

async function extractDetails(url) {
    const results = [];
    const response = await fetchv2(url);
    const html = await response.text();

    const regex = /<div class="card-body">.*?<h3.*?>(.*?)<\/h3>.*?<p>(.*?)<\/p>.*?<p>(.*?)<\/p>/s;
    const match = regex.exec(html);

    let description = "N/A";
    if (match) {
        description = match[3]
            .replace(/&nbsp;/g, " ") 
            .replace(/\s+/g, " ") 
            .trim();
    }

    results.push({
        description: description,
        aliases: "N/A",
        airdate: "N/A"
    });

    return JSON.stringify(results);
}



async function extractEpisodes(url) {
    const results = [];
    const response = await fetchv2(url);
    const html = await response.text();
    console.error(html);
    const regex = /<a href="([^"]+)"[ ]?class="btn btn-outline-primary btn-space">([^<]+)<\/a>/g;
        let match;
    let count = 1; 

    while ((match = regex.exec(html)) !== null) {
        results.push({
            href: match[1].trim(),
            number: count
        });
        count++;
    }

    return JSON.stringify(results);
}


async function extractStreamUrl(url) {
    const response = await fetchv2(url);
    const html = await response.text();
    const match = html.match(/<iframe[^>]+src="([^"]+)"[^>]*>/);
    if (!match) return null;
    
    const iframeUrl = match[1];
    
    const headers = {
      'Referer': 'https://www.dora-video.cn/'
    };
    const responseTwo = await fetchv2(iframeUrl, headers);
    const htmlTwo = await responseTwo.text();
    
    const m3u8Match = htmlTwo.match(/url: ['"]([^'"]+\.m3u8)['"],/);

    
    const m3u8Url = m3u8Match[1];
    console.error(m3u8Url);
    
    return m3u8Url;
  }

