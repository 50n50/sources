async function searchResults(keyword) {
  const results = [];
  try {
    const response = await fetchv2(
      "https://api-search.anroll.net/data?q=" + encodeURIComponent(keyword)
    );
    const json = await response.json();

    if (json.code === 200 && json.data && Array.isArray(json.data)) {
      for (const item of json.data) {
        if (item.generic_path && item.generic_path.startsWith("/f/")) {
          continue; 
        }

        results.push({
          title: item.title,
          image: `https://www.anroll.net/_next/image?url=${encodeURIComponent(
            "https://static.anroll.net/images/animes/capas/" + item.slug + ".jpg"
          )}&w=384&q=75`,
          href: "https://www.anroll.net" + item.generic_path,
        });
      }
    }

    return JSON.stringify(results);
  } catch (err) {
    return JSON.stringify([
      {
        title: "Error",
        image: "Error",
        href: "Error",
      },
    ]);
  }
}


async function extractDetails(url) {
  try {
    console.log(url);
    const response = await fetchv2(url);
    const html = await response.text();

    const match = html.match(/<div class="sinopse">(.*?)<\/div>/s);
    const description = match ? match[1].trim() : "N/A";

    return JSON.stringify([
      {
        description: description,
        aliases: "N/A",
        airdate: "N/A",
      },
    ]);
  } catch (err) {
    return JSON.stringify([
      {
        description: "Error",
        aliases: "Error",
        airdate: "Error",
      },
    ]);
  }
}

async function extractEpisodes(url) {
  try {
    const results = [];
    
    const response = await fetchv2(url);
    const html = await response.text();
    
    const episodesMatch = html.match(/"episodes"\s*:\s*(\d+)/);
    const episodes = episodesMatch ? parseInt(episodesMatch[1], 10) : null;
    const idMatch = html.match(/"id_serie"\s*:\s*(\d+)/);
    const serieId = idMatch ? parseInt(idMatch[1], 10) : null;
    
    if (!episodes || !serieId) {
      console.log("Failed to extract episode count or serie ID.");
      return JSON.stringify([{ href: "Error", number: "Error" }]);
    }
    
    const totalPages = Math.ceil(episodes / 25);
    
    const pagePromises = [];
    for (let page = 1; page <= totalPages; page++) {
      const apiUrl = `https://apiv3-prd.anroll.net/animes/${serieId}/episodes?page=${page}&order=desc`;
      
      pagePromises.push(
        fetchv2(apiUrl)
          .then(response => response.json())
          .then(json => {
            console.log(`Fetched page ${page} of ${totalPages}...`);
            if (json && json.data && Array.isArray(json.data)) {
              return json.data.map(ep => ({
                href: "https://www.anroll.net/watch/e/" + ep.generate_id,
                number: parseInt(ep.n_episodio, 10),
              }));
            }
            return [];
          })
          .catch(error => {
            console.log(`Error fetching page ${page}:`, error);
            return [];
          })
      );
    }
    
    const pageResults = await Promise.all(pagePromises);
    
    pageResults.forEach(pageEpisodes => {
      results.push(...pageEpisodes);
    });
    
    return JSON.stringify(results.reverse());
  } catch (err) {
    console.log("Error during fetch:", err);
    return JSON.stringify([{ href: "Error", number: "Error" }]);
  }
}

async function extractStreamUrl(url) {
  try {
    const response = await fetchv2(url);
    const html = await response.text();
    
    const patterns = [
      /"streamUrl"\s*:\s*"([^"]+\.m3u8)"/,
      /"streamUrl\\?"\s*:\s*\\?"([^"\\]+\.m3u8)\\?"/,
      /streamUrl['"]\s*:\s*['"](https?:\/\/[^'"]+\.m3u8)['"]/,
      /streamUrl\s*:\s*"([^"]+\.m3u8)"/,
      /\\"streamUrl\\":\\"([^"\\]+\.m3u8)\\"/
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const streamUrl = match[1]
          .replace(/\\"/g, '"')
          .replace(/\\\//g, '/')
          .replace(/\\\\/g, '\\');
        return streamUrl;
      }
    }
    
    const nextDataMatch = html.match(/self\.__next_f\.push\(\[1,"([^"]+)"\]\)/g);
    if (nextDataMatch) {
      for (const match of nextDataMatch) {
        const dataMatch = match.match(/self\.__next_f\.push\(\[1,"([^"]+)"\]\)/);
        if (dataMatch && dataMatch[1]) {
          const decodedData = dataMatch[1]
            .replace(/\\"/g, '"')
            .replace(/\\\//g, '/')
            .replace(/\\n/g, '\n');
          
          const streamMatch = decodedData.match(/streamUrl['"]\s*:\s*['"](https?:\/\/[^'"]+\.m3u8)['"]/);
          if (streamMatch && streamMatch[1]) {
            return streamMatch[1];
          }
        }
      }
    }
    
    return "https://files.catbox.moe/avolvc.mp4";
    
  } catch (err) {
    console.error('Error extracting stream URL:', err);
    return "https://files.catbox.moe/avolvc.mp4";
  }
}


