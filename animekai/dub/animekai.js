async function searchResults(query) {
  const encodeQuery = keyword => encodeURIComponent(keyword);
  const searchBaseUrl = "https://animekai.to/browser?keyword=";
  const baseUrl = "https://animekai.to";
  
  const posterHrefRegex = /href="[^"]*" class="poster"/g;
  const titleRegex = /class="title"[^>]*title="[^"]*"/g;
  const imageRegex = /data-src="[^"]*"/g;
  const extractHrefRegex = /href="([^"]*)"/;
  const extractImageRegex = /data-src="([^"]*)"/;
  const extractTitleRegex = /title="([^"]*)"/;
  
  try {
    const encodedQuery = encodeQuery(query);
    const searchUrl = searchBaseUrl + encodedQuery;
    const response = await fetchv2(searchUrl);
    const htmlText = await response.text();
    
    const results = [];
    const posterMatches = htmlText.match(posterHrefRegex) || [];
    const titleMatches = htmlText.match(titleRegex) || [];
    const imageMatches = htmlText.match(imageRegex) || [];
    
    const minLength = Math.min(posterMatches.length, titleMatches.length, imageMatches.length);
    
    for (let index = 0; index < minLength; index++) {
      const hrefMatch = posterMatches[index].match(extractHrefRegex);
      const fullHref = hrefMatch ? 
        (hrefMatch[1].startsWith("http") ? hrefMatch[1] : baseUrl + hrefMatch[1]) : 
        null;
      
      const imageMatch = imageMatches[index].match(extractImageRegex);
      const imageSrc = imageMatch ? imageMatch[1] : null;
      
      const titleMatch = titleMatches[index].match(extractTitleRegex);
      const cleanTitle = titleMatch ? 
        decodeHtmlEntities(titleMatch[1]) : 
        null;
      
      if (fullHref && imageSrc && cleanTitle) {
        results.push({
          href: fullHref,
          image: imageSrc,
          title: cleanTitle
        });
      }
    }
    
    return JSON.stringify(results);
  } catch (error) {
    return JSON.stringify([{
      href: "",
      image: "",
      title: "Search failed: " + error.message
    }]);
  }
}

async function extractDetails(url) {
  try {
    const response = await fetchv2(url);
    const htmlText = await response.text();
    console.log(htmlText);
    
    const descriptionMatch = (/<div class="desc text-expand">([\s\S]*?)<\/div>/.exec(htmlText) || [])[1];
    const aliasesMatch = (/<small class="al-title text-expand">([\s\S]*?)<\/small>/.exec(htmlText) || [])[1];
    
    return JSON.stringify([{
      description: descriptionMatch ? cleanHtmlSymbols(descriptionMatch) : "Not available",
      aliases: aliasesMatch ? cleanHtmlSymbols(aliasesMatch) : "Not available",
      airdate: "If stream doesn't load try later or disable VPN/DNS"
    }]);
  } catch (error) {
    console.error("Error fetching details:" + error);
    return [{
      description: "Error loading description",
      aliases: "Aliases: Unknown",
      airdate: "Aired: Unknown"
    }];
  }
}

async function extractEpisodes(animeUrl) {
  try {
    const response = await fetchv2(animeUrl);
    const htmlText = await response.text();
    
    const animeIdMatch = (htmlText.match(/<div class="rate-box"[^>]*data-id="([^"]+)"/) || [])[1];
    if (!animeIdMatch) {
      return [{
        error: "AniID not found"
      }];
    }
    
    const tokenResponse = await fetchv2(`https://ilovekai.simplepostrequest.workers.dev/?ilovefeet=${encodeURIComponent(animeIdMatch)}`);
    const token = await tokenResponse.text();
    
    const episodeListUrl = `https://animekai.to/ajax/episodes/list?ani_id=${animeIdMatch}&_=${token}`;
    console.log("List API URL:" + episodeListUrl);
    
    const episodeListResponse = await fetchv2(episodeListUrl);
    const episodeListData = await episodeListResponse.json();
    const cleanedHtml = cleanJsonHtml(episodeListData.result);
    
    const episodeRegex = /<a[^>]+num="([^"]+)"[^>]+token="([^"]+)"[^>]*>/g;
    const episodeMatches = [...cleanedHtml.matchAll(episodeRegex)];
    
    const episodePromises = episodeMatches.map(([_, episodeNum, episodeToken]) => 
      fetchv2(`https://ilovekai.simplepostrequest.workers.dev/?ilovefeet=${encodeURIComponent(episodeToken)}`)
        .then(response => response.text())
        .then(tokenResult => ({
          number: parseInt(episodeNum, 10),
          href: `https://animekai.to/ajax/links/list?token=${episodeToken}&_=${tokenResult}`
        }))
        .catch(() => ({
          number: parseInt(episodeNum, 10),
          href: "Error"
        }))
    );
    
    const episodes = await Promise.all(episodePromises);
    return JSON.stringify(episodes);
  } catch (err) {
    console.error("Error fetching episodes:" + err);
    return [{
      number: 1,
      href: "Error fetching episodes"
    }];
  }
}

async function extractStreamUrl(url) {
  try {
    const fetchUrl = `${url}`;
    const response = await fetchv2(fetchUrl);
    const text = await response.text();
    const cleanedHtml = cleanJsonHtml(text);
    const subRegex = /<div class="server-items lang-group" data-id="sub"[^>]*>([\s\S]*?)<\/div>/;
    const softsubRegex = /<div class="server-items lang-group" data-id="softsub"[^>]*>([\s\S]*?)<\/div>/;
    const dubRegex = /<div class="server-items lang-group" data-id="dub"[^>]*>([\s\S]*?)<\/div>/;
    const subMatch = subRegex.exec(cleanedHtml);
    const softsubMatch = softsubRegex.exec(cleanedHtml);
    const dubMatch = dubRegex.exec(cleanedHtml);
    const subContent = subMatch ? subMatch[1].trim() : "";
    const softsubContent = softsubMatch ? softsubMatch[1].trim() : "";
    const dubContent = dubMatch ? dubMatch[1].trim() : "";
    const serverSpanRegex = /<span class="server"[^>]*data-lid="([^"]+)"[^>]*>Server 1<\/span>/;
    const serverIdDub = serverSpanRegex.exec(dubContent)?.[1];
    const serverIdSoftsub = serverSpanRegex.exec(softsubContent)?.[1];
    const serverIdSub = serverSpanRegex.exec(subContent)?.[1];
    const [streamTokenDub, streamTokenSoftsub, streamTokenSub] = await Promise.all([
      fetchv2(`https://ilovekai.simplepostrequest.workers.dev/?ilovefeet=${serverIdDub}`).then(res => res.text()),
      fetchv2(`https://ilovekai.simplepostrequest.workers.dev/?ilovefeet=${serverIdSoftsub}`).then(res => res.text()),
      fetchv2(`https://ilovekai.simplepostrequest.workers.dev/?ilovefeet=${serverIdSub}`).then(res => res.text())
    ]);
    const streamUrlDub = `https://animekai.to/ajax/links/view?id=${serverIdDub}&_=${streamTokenDub}`;
    const streamUrlSoftsub = `https://animekai.to/ajax/links/view?id=${serverIdSoftsub}&_=${streamTokenSoftsub}`;
    const streamUrlSub = `https://animekai.to/ajax/links/view?id=${serverIdSub}&_=${streamTokenSub}`;
    
    const processStream = async (streamUrl, streamType) => {
      try {
        const res = await fetchv2(streamUrl);
        const json = await res.json();
        const result = json.result;
        const decryptRes = await fetchv2(`https://ilovekai.simplepostrequest.workers.dev/?ilovearmpits=${result}`);
        const text = await decryptRes.text();
        const parsed = JSON.parse(text);
        console.log(`decrypted${streamType} URL:` + parsed.url);
        return parsed.url;
      } catch (error) {
        console.log(`Error processing ${streamType}:`, error);
        return null;
      }
    };

    const [decryptedDub, decryptedSoftsub, decryptedSub] = await Promise.all([
      processStream(streamUrlDub, "Dub"),
      processStream(streamUrlSoftsub, "Softsub"), 
      processStream(streamUrlSub, "Sub")
    ]);
    
    console.log(decryptedDub);
    const networkResult = await networkFetch(decryptedDub, {
      timeoutSeconds: 10,
      headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Encoding": "gzip",
          "Connection": "Keep-Alive",
          "Host": "megaup.site",
          "Referer": "https://animekai.to/",
          "sec-ch-ua": "\"Android WebView\";v=\"119\", \"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Android\"",
          "Upgrade-Insecure-Requests": "1",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
      },
      cutoff: ".m3u8",
      waitForSelectors: [".jw-icon.jw-icon-display"],
      clickSelectors: [".jw-icon.jw-icon-display"],
      maxWaitTime: 10
    });

    console.log(JSON.stringify(networkResult));

    if (networkResult.requests && networkResult.requests.length > 0) {
    const streamUrl = networkResult.requests.find(url => url.endsWith('.m3u8')) || null;
        return streamUrl;
    } else {
        return null;
    }
  } catch (error) {
    console.log("Fetch error:"+ error);
    return "https://error.org";
  }
}

function cleanHtmlSymbols(string) {
  if (!string) {
    return "";
  }
  return string
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#[0-9]+;/g, "")
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanJsonHtml(jsonHtml) {
  if (!jsonHtml) {
    return "";
  }
  return jsonHtml
    .replace(/\\"/g, "\"")
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r");
}

function decodeHtmlEntities(text) {
  if (!text) {
    return "";
  }
  return text
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}
