async function searchResults(keyword) {
    const results = [];
    const image = 'https://files.catbox.moe/9tbjtb.png';
    const regex = /<tr><td><a href="([^"]+)">([^<]+)<\/a><\/td><td[^>]*>[^<]*<\/td><\/tr>/g;

    const urls = [
        'https://a.111477.xyz/tvs/',
        'https://a.111477.xyz/movies/',
        'https://a.111477.xyz/kdrama/',
        'https://a.111477.xyz/asiandrama/'
    ];

    for (const url of urls) {
        const response = await fetchv2(url);
        const html = await response.text();

        let match;
        while ((match = regex.exec(html)) !== null) {
            const rawTitle = match[2].trim().replace(/\/$/, '');
            const cleanedTitle = rawTitle.replace(/\.+/g, ' ').toLowerCase();

            if (cleanedTitle.includes(keyword.toLowerCase())) {
                results.push({
                    title: rawTitle.replace(/\.+/g, ' '), 
                    image,
                    href: url + match[1].trim()
                });
            }
        }
    }

    return JSON.stringify(results);
}

async function extractDetails(url) {
    const results = [];

    results.push({
        description: 'None provided, but hell who cares anyway',
        aliases: 'N/A',
        airdate: 'N/A'
    });

    return JSON.stringify(results);
}

async function extractEpisodes(url) {
  const results = [];
  const response = await fetchv2(url);
  const html = await response.text();
  
  const episodeRegex = /<tr><td><a href="(https:\/\/[^"]+\.mkv)">([^<]+\.mkv)<\/a><\/td>/g;
  let match;
  let count = 1;
  
  while ((match = episodeRegex.exec(html)) !== null) {
    results.push({
      href: match[1].trim(),
      number: count++
    });
  }
  
  if (results.length > 0) {
    return JSON.stringify([{
      href: url,
      number: 1
    }]);
  }
  if (results.length === 0) {
    const seasonRegex = /<tr><td><a href="([^"]+\/)"[^>]*>([^<]+\/)<\/a><\/td>/g;
    const seasons = [];
    
    while ((match = seasonRegex.exec(html)) !== null) {
      const seasonHref = match[1].trim();
      const seasonName = match[2].trim();
      
      if (seasonHref === '../' || seasonName === '../') continue;
      
      const isSeasonDir = (
        /season\s*\d+/i.test(seasonName) ||
        /s\d+/i.test(seasonName) ||
        /series\s*\d+/i.test(seasonName) ||
        /specials/i.test(seasonName) ||
        /extras/i.test(seasonName) ||
        /bonus/i.test(seasonName) ||
        (/\d+/.test(seasonName) && seasonName.endsWith('/'))
      );
      
      if (isSeasonDir) {
        seasons.push({
          href: seasonHref,
          name: seasonName
        });
      }
    }
    
    seasons.sort((a, b) => {
      const aNum = extractSeasonNumber(a.name);
      const bNum = extractSeasonNumber(b.name);
      
      if (aNum === null && bNum === null) return a.name.localeCompare(b.name);
      if (aNum === null) return 1;
      if (bNum === null) return -1;
      
      return aNum - bNum;
    });
    
    console.log(`Found ${seasons.length} seasons:`, seasons.map(s => s.name));
    console.log(`Base URL: "${url}"`);
    console.log(`Base URL ends with /: ${url.endsWith('/')}`);
    
    
    for (const season of seasons) {
      console.log(`Processing season: ${season.name}`);
      console.log(`Season href: "${season.href}"`);
      
      let seasonUrl;
      if (season.href.startsWith('http')) {
        seasonUrl = season.href;
      } else {
        const baseUrl = url.endsWith('/') ? url : url + '/';
        seasonUrl = baseUrl + season.href;
      }
      
      console.log(`Season URL: "${seasonUrl}"`);
      console.log(`URL encoded version: "${encodeURI(seasonUrl)}"`);
      
      try {
        const seasonResponse = await fetchv2(decodeURIComponent(seasonUrl));
        const seasonHtml = await seasonResponse.text();
        
        console.log(`Sample HTML from ${season.name}:`, seasonHtml.substring(0, 500));
        
        let episodeCount = 1;
        
        const seasonEpisodeRegex = /<a href="([^"]+\.mkv)"[^>]*>([^<]+\.mkv)<\/a>/g;
        let seasonMatch;
        let episodesInSeason = 0;
        
        while ((seasonMatch = seasonEpisodeRegex.exec(seasonHtml)) !== null) {
          let episodeHref = seasonMatch[1].trim();
          
          if (!episodeHref.startsWith('http')) {
            episodeHref = seasonUrl.endsWith('/') ? seasonUrl + episodeHref : seasonUrl + '/' + episodeHref;
          }
          
          results.push({
            href: episodeHref,
            number: episodeCount++,
            season: season.name.replace('/', '') 
          });
          episodesInSeason++;
        }
        
        console.log(`Found ${episodesInSeason} episodes in ${season.name}`);
        
      } catch (error) {
        console.warn(`Failed to fetch season ${season.name}:`, error);
        console.warn(`Season URL was: ${seasonUrl}`);
      }
    }
  }
  
  return JSON.stringify(results);
}

function extractSeasonNumber(seasonName) {
  const patterns = [
    /season\s*(\d+)/i,
    /s(\d+)/i,
    /series\s*(\d+)/i,
    /(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = seasonName.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  return null; 
}


async function extractStreamUrl(url) {
  if (url.toLowerCase().endsWith('.mkv')) {
    const filename = url.split('/').pop();
    
    const final = {
      streams: [filename, url],
      subtitles: ""
    };
    
    console.log("RETURN: " + JSON.stringify(final));
    return JSON.stringify(final);
  }
  
  try {
    const response = await fetchv2(decodeURIComponent(url));
    const html = await response.text();
    
    const mkvRegex = /<tr><td><a href="([^"]+\.mkv)"[^>]*>([^<]+\.mkv)<\/a><\/td>/g;
    const streams = [];
    let match;
    
    while ((match = mkvRegex.exec(html)) !== null) {
      const mkvUrl = match[1].trim();
      const filename = match[2].trim();
      
      streams.push(filename, mkvUrl);
    }
    
    const final = {
      streams,
      subtitles: ""
    };
    
    console.log("RETURN: " + JSON.stringify(final));
    return "JSON.stringify(final)";
    
  } catch (error) {
    console.log("Error in extractStreamUrl:", error);
    return JSON.stringify({
      streams: [],
      subtitles: ""
    });
  }
}
