´ËW6À˜àˆ$lýGÊ Ñ///////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////       Main Functions          //////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////
searchUrl = 'https://en.wikipedia.org/wiki/List_of_films_in_the_public_domain_in_the_United_States';

async function searchResults(keyword) {
    try {
        const response = await fetch(searchUrl);
        const html = await response;

        // Regex to match the table rows
        const tableRegex = /<table class="wikitable sortable">([\s\S]*?)<\/table>/;
        const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
        const cellRegex = /<td>([\s\S]*?)<\/td>/g;

        const tableMatch = html.match(tableRegex);
        if (!tableMatch) {
            throw new Error('Table not found');
        }

        const rows = tableMatch[1].match(rowRegex);
        if (!rows) {
            throw new Error('No rows found in the table');
        }

        const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/`;
        console.log("Test");

        const results = [];
        for (const row of rows) {
            const cells = [...row.matchAll(cellRegex)];
            if (cells.length > 0) {
                // Extract the path after /wiki/
                const path = cells[0][1].match(/href="([^"]+)"/)[1].split('/wiki/')[1];
                const coverImage = apiUrl + path;

                try {
                    const title = cells[0][1].replace(/<[^>]+>/g, '').trim();
                    if (title.toLowerCase().includes(keyword.toLowerCase())) {
                        const responseCover = await fetch(coverImage);
                        const dataCover = await JSON.parse(responseCover);
                        const imageUrl = dataCover.thumbnail.source;
                        results.push({
                            title: title,
                            href: "https://en.wikipedia.org" + cells[0][1].match(/href="([^"]+)"/)[1],
                            image: imageUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg"
                        });
                    }
                } catch (error) {
                    console.log('Error fetching cover image:' + error);
                }
            }
        }

        return JSON.stringify(results);

    } catch (error) {
        console.log('Fetch error:' + error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        // Extract the path after /wiki/
        const path = url.split('/wiki/')[1];
        const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${path}`;
        const response = await fetch(apiUrl);
        const data = await JSON.parse(response);


        const transformedResults = [{
            description: data.extract || 'No description available',
            aliases: '',
            airdate: data.description || 'No airdate available'
        }];

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error:' + error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: '',
            airdate: 'Aired: Unknown'
        }]);
    }
}

async function extractEpisodes(url) {

    try {

        const fetchUrl = `${url}`;
        const response = await fetch(fetchUrl);
        const htmlString = await response;

        // Updated regex to find video URLs including special characters
        const regex = /(\/\/upload\.wikimedia\.org\/wikipedia\/commons\/[^\s"']+\.(mp4|webm|ogg))/gi;

        const matches = htmlString.match(regex);

        console.log(matches); // This will output an array of video URLs

        const finishedList = matches.map((url, index) => ({
            number: index + 1,
            href: url
        }));

        return JSON.stringify(finishedList);

    } catch (error) {
        console.log('Fetch error:' + error);
        return JSON.stringify([{ number: 'Error', href: '' }]);

    }

}

async function extractStreamUrl(url) {
    return "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
}