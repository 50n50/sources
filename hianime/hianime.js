async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await fetchv2(`https://bshar1865-hianime2.vercel.app/api/v2/hianime/search?q=${encodedKeyword}`);
        const data = await responseText.json();

        console.log("Search results:", data);

        const transformedResults = data.data.animes.map(anime => ({
            title: anime.name,
            image: anime.poster,
            href: `https://hianime.to/watch/${anime.id}`
        }));
        
        console.log("Transformed results:", transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const match = url.match(/https:\/\/hianime\.to\/watch\/(.+)$/);
        const encodedID = match[1];
        const response = await fetchv2(`https://bshar1865-hianime2.vercel.app/api/v2/hianime/anime/${encodedID}`);
        const data = await response.json();
        
        const animeInfo = data.data.anime.info;
        const moreInfo = data.data.anime.moreInfo;

        const transformedResults = [{
            description: animeInfo.description || 'No description available',
            aliases: `Duration: ${animeInfo.stats?.duration || 'Unknown'}`,
            airdate: `Aired: ${moreInfo?.aired || 'Unknown'}`
        }];
        
        console.log("Transformed results:", transformedResults);
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

async function extractEpisodes(url) {
    try {
        const match = url.match(/https:\/\/hianime\.to\/watch\/(.+)$/);
        const encodedID = match[1];
        const response = await fetchv2(`https://bshar1865-hianime2.vercel.app/api/v2/hianime/anime/${encodedID}/episodes`);
        const data = await response.json();

        const transformedResults = data.data.episodes.map(episode => ({
            href: episode.episodeId,
            number: episode.number
        }));

        console.log("Transformed results:" +  transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error:', error);
    }
}

async function extractStreamUrl(id) {
        try {
            const subRes = await fetchv2(`https://animeapiiiii.vercel.app/api/stream?id=${id}&server=hd-1&type=sub`);
            const subJson = await subRes.json();

            const streamSub = subJson.results.streamingLink.link.file;
            const englishSubtitles = (subJson.results.streamingLink.tracks || []).find(
                track => track.kind === "captions" && track.label.toLowerCase().includes("english")
            )?.file || "";

            let streamDub = null;
            try {
                const dubRes = await fetchv2(`https://animeapiiiii.vercel.app/api/stream?id=${id}&server=hd-1&type=dub`);
                const dubJson = await dubRes.json();
                streamDub = dubJson.results?.streamingLink?.link?.file || null;
            } catch (e) {
                streamDub = null;
            }

            const streams = [];

            if (streamDub) {
                streams.push("DUB", streamDub);
            }

            if (streamSub) {
                streams.push("SUB", streamSub);
            }

            const final = {
                streams,
                subtitles: englishSubtitles
            };

            console.log("RETURN: " + JSON.stringify(final));
            return JSON.stringify(final);

        } catch (error) {
            console.log("Error in extractStreamUrl:", error);
            return JSON.stringify({
                streams: [],
                subtitles: ""
            });
        }
}

