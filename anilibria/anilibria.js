async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await fetch(`https://api.anilibria.tv/v3/title/search?search=${encodedKeyword}&filter=id,names,posters`);
        const data = JSON.parse(responseText);
        
        const transformedResults = data.list.map(anime => ({
            title: anime.names.en || anime.names.ru || 'Unknown Title',
            image: `https://anilibria.tv${anime.posters.original.url}`,
            href: `${anime.id}`
        }));
        
        return JSON.stringify(transformedResults);
        
    } catch (error) {
        console.log('Fetch error:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}


async function extractDetails(id) {
    try {
        const response = await fetch(`https://api.anilibria.tv/v3/title?id=${id}&filter=description`);
        const data = JSON.parse(response);
        
        const animeInfo = data; 

        const transformedResults = [{
            description: animeInfo.description || 'No description available',
            aliases: `Alias: Unknown`,
            airdate: `Aired: Unknown`
        }];
        
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error:', error);
        return JSON.stringify([{
        description: 'Error loading description',
        aliases: 'Duration: Unknown',
        airdate: 'Aired: Unknown'
        }]);
  }
}

async function extractEpisodes(id) {
    try {        
        const response = await fetch(`https://api.anilibria.tv/v3/title?id=${id}`);
        const data = JSON.parse(response);

        const transformedResults = Object.values(data.player.list).map(episode => ({
            href: `https://cache.libria.fun${episode.hls.hd}`,
            number: episode.episode
        }));
        
        return JSON.stringify(transformedResults);
        
    } catch (error) {
        console.log('Fetch error:', error);
    }    
}

async function extractStreamUrl(url) {
    try {
       return url;
    } catch (error) {
       console.log('Fetch error:', error);
       return null;
    }
}
