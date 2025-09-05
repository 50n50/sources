ûŽ~®Ùqj{òœ><rHconst PLACEHOLDER_IMAGE = "https://media.istockphoto.com/id/1147544807/vector/thumbnail-image-vector-graphic.jpg?s=612x612&w=0&k=20&c=rnCKVbdxqkjlcs3xH87-9gocETqpspHFXu5dIGB4wuM=";

async function searchResults(keyword) {
    const searchUrl = `https://api-v2.soundcloud.com/search?q=${encodeURIComponent(keyword)}&facet=model&user_id=200971-112325-516393-99787&client_id=UjhhbCuNo1OQfTwkzajxQNLlJcSlUlVz&limit=30`;
    try {
        const response = await fetch(searchUrl);
        const json = await JSON.parse(response);

        const results = json.collection.map(item => ({
            title: item.title,
            image: item.artwork_url || PLACEHOLDER_IMAGE,
            href: item.permalink_url
        }));
        //console.log(results);
        console.log(JSON.stringify(results));
        return JSON.stringify(results);
    } catch (error) {
        console.error("Error fetching search results:", error);
        return JSON.stringify([]);
    }
}

async function extractDetails(url) {
    const details = [];
    details.push({
        description: 'N/A',
        alias: 'N/A',
        airdate: 'N/A'
    });

    //#IAMLAZY

    console.log(JSON.stringify(details));
    return JSON.stringify(details);
}

async function extractEpisodes(url) {
    const response = await fetch(url);
    const html = await response;
    const tracks = [];

    const trackRegex = /<article itemprop="track"[^>]*>[\s\S]*?<h2 itemprop="name"><a itemprop="url" href="([^"]+)">/g;
    
    let match;
    let number = 1;

    while ((match = trackRegex.exec(html)) !== null) {
        tracks.push({
            number: number++,
            href: 'https://soundcloud.com' + match[1].trim()
        });
    }

    if (tracks.length > 0) {
        return JSON.stringify(tracks);
    } else {
        const canonicalMatch = html.match(/\["link",\{"rel":"canonical","href":"([^"]+)"\}\]/);
        if (canonicalMatch) {
            return JSON.stringify([{ number: 1, href: canonicalMatch[1].trim() }]);
        }
    }

    return JSON.stringify([]); 
}


async function extractStreamUrl(url) {
    const clientId = "UjhhbCuNo1OQfTwkzajxQNLlJcSlUlVz";
    try {
      const response = await fetch(url);
      const html = await response;
      
      const urlMatch = html.match(/"url":"(https:\/\/api[^\.]*\.soundcloud\.com\/media\/soundcloud:tracks:[^"]+)"/);
      const authMatch = html.match(/"track_authorization":"([^"]+)"/);
      
      if (urlMatch && authMatch) {
        const streamUrl = `${urlMatch[1]}?client_id=${clientId}&track_authorization=${authMatch[1]}`;
        
        const responseTwo = await fetch(streamUrl);
        const json = await JSON.parse(responseTwo);

        return json.url;
      } else {
        console.log("No stream URL found");
        
        return null;
      }
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  }
