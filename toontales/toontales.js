async function searchResults(keyword) {
  const results = [];
  try {
    const response = await fetchv2(`https://www.toontales.net/?s=${keyword}&search=Search`);
    const html = await response.text();
    
    const matches = html.matchAll(/<a href="([^"]+)">\s*<img src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g);
    
    for (const match of matches) {
      const href = match[1].trim();
      const image = match[2].trim();
      const title = match[3].trim();
      
      const imageUrl = image.includes('noimage.jpg') ? null : image;
      
      results.push({
        href: href,
        image: imageUrl,
        title: title || 'No Title'
      });
    }
    
    return JSON.stringify(results);
  } catch (err) {
    return JSON.stringify([{
      title: "Error: " + err.message,
      image: "Error",
      href: "Error"
    }]);
  }
}
async function extractDetails(url) {
  try {
    const response = await fetchv2(url);
    const html = await response.text();
    
    const descriptionMatch = html.match(/<meta name="description" content="([^"]*)"[^>]*\/>/);
    const description = descriptionMatch ? descriptionMatch[1].trim() : "N/A";

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
    return JSON.stringify([{
        number: 1,
        href: url
    }]);
}

async function extractStreamUrl(url) {
  try {
    const response = await fetchv2(url);
    const html = await response.text();

    let urlMatch = html.match(/file:\s*"([^"]+\.mp4)"/); 
    if (!urlMatch) {
      urlMatch = html.match(/"contentUrl"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*\.mp4)"/); 
    }
    
    const extractedUrl = urlMatch ? urlMatch[1] : null;
    
    return (extractedUrl && extractedUrl.endsWith('.mp4')) 
      ? extractedUrl 
      : "i wanna kms";
  } catch (err) {
    return "https://files.catbox.moe/avolvc.mp4";
  }
}