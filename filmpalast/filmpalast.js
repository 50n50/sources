/**
 * filmpalast.js
 * A module for Sora that provides watch functionality for filmpalast.to.
 * @module filmpalast
 * @author JMcrafte26
 * @license MIT
 * @version 1.1.3
 * @mirror https://api.jm26.net/sora-modules/filmpalast/filmpalast.json
*/

/**
 * Searches for films on filmpalast.to based on a keyword.
 * @param {string} keyword - The search keyword.
 * @returns {Promise<string>} - A JSON string of search results.
 */
async function searchResults(keyword) {
  try {
    const encodedKeyword = encodeURIComponent(keyword);
    const html = await fetch(
      `https://filmpalast.to/search/title/${encodedKeyword}`
    );
    const filmListRegex =
      /<article class="liste glowliste  rb"[\s\S]*?<\/article>/g;
    const items = html.match(filmListRegex) || [];

    const results = [];

    items.forEach((itemHtml, index) => {
      const titleMatch = itemHtml.match(
        /<a href="([^"]+)" class="rb" title="([^"]+)"[^>]*>([^<]+)<\/a>/
      );
      let title = titleMatch ? titleMatch[3] : "";
      const hrefMatch = itemHtml.match(
        /<a href="\/\/filmpalast.to\/stream\/([^"]+)"[^>]*>/
      );
      const href = hrefMatch
        ? `https://filmpalast.to/stream/${hrefMatch[1]}`
        : "";
      const imageMatch = itemHtml.match(
        /<img[^>]+src="([^"]+)"[^>]+class="cover-opacity"[^>]*>/
      );
      const image = "https://filmpalast.to" + (imageMatch ? imageMatch[1] : "");
      title = cleanTitle(title);

      if (title && href) {
        results.push({
          title,
          image,
          href,
        });
      }
    });

    return JSON.stringify(results);
  } catch (error) {
    console.log("Fetch error:", error);
    return JSON.stringify([{ title: "Error", image: "", href: "" }]);
  }
}

/**
 * Cleans the title by replacing HTML entities with their corresponding characters.
 * @param {string} title - The title to clean.
 * @returns {string} - The cleaned title.
 */
function cleanTitle(title) {
  return title
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/**
 * Extracts details from a film's page.
 * @param {string} url - The URL of the film's page.
 * @returns {Promise<string>} - A JSON string of the film's details.
 */
async function extractDetails(url) {
  try {
    const html = await fetch(url);
    const descriptionMatch = html.match(
      /<span itemprop="description">([^<]+)<\/span>/
    );
    const description = descriptionMatch
      ? descriptionMatch[1]
      : "Error loading description";

    const durationMatch = html.match(/<br \/>Spielzeit: <em>([^<]+)<\/em>/);
    const duration = durationMatch ? durationMatch[1] : "Unknown";

    const airedMatch = html.match(/<br \/>Ver&ouml;ffentlicht: (\d{4})/);
    const aired = airedMatch ? airedMatch[1] : "Unknown";

    const transformedResults = [
      {
        description,
        aliases: `Duration: ${duration}`,
        airdate: `Aired: ${aired}`,
      },
    ];
    return JSON.stringify(transformedResults);
  } catch (error) {
    console.log("Details error:", error);
    return JSON.stringify([
      {
        description: "Error loading description",
        aliases: "Duration: Unknown",
        airdate: "Aired: Unknown",
      },
    ]);
  }
}

/**
 * Extracts episodes from a film's page.
 * @param {string} url - The URL of the film's page.
 * @returns {Promise<string>} - A JSON string of the episodes.
 */
async function extractEpisodes(url) {
  try {
    const match = url.match(/https:\/\/filmpalast\.to\/stream\/(.+)$/);
    if (!match) {
      return JSON.stringify([{ number: "0", href: "" }]);
    }

    return JSON.stringify([{ number: "1", href: url }]);
  } catch (error) {
    console.log("Fetch error:", error);
  }
}

/**
 * Extracts the stream URL from a film's page.
 * @param {string} url - The URL of the film's page.
 * @returns {Promise<string|null>} - The stream URL or null if not found.
 * 
 */
async function extractStreamUrl(url) {
  try {
    const response = await fetch(url);
    const html = await response.text ? response.text() : response;

    let streamUrl = null;
    try {
      streamUrl = await voeExtract(html);
    } catch (error) {
        console.log('VOE HD extraction error:', error);
    }

    console.log('Voe Stream URL: ' + streamUrl);
    if (streamUrl && streamUrl !== false && streamUrl !== null) {
        return streamUrl;
    }


    console.log('using alternative extraction method');
    try {
        streamUrl = await bigWarpExtract(html);
    } catch (error) {
        console.log('BigWarp HD extraction error:', error);
    }

    console.log('BigWarp Stream URL: ' + streamUrl);
    if (streamUrl && streamUrl !== false && streamUrl !== null) {
        return streamUrl;
    }

    console.log('No stream URL found');

    return null;
    
  } catch (error) {
    console.log("Fetch error:", error);
    return null;
  }
}

/**
 * Extracts the stream URL from a film's page.
 * @param {string} url - The URL of the film's page.
 * @returns {Promise<string|null>} - The stream URL or null if not found.
 * Thanks to @Hamzo for the Voe extraction code.
 */

async function voeExtract(html) {
    console.log('VOE HD extraction method');
    const voeRegex = /<ul class="currentStreamLinks"[\s\S]*?<p class="hostName">VOE HD<\/p>[\s\S]*?<a[^>]+class="button rb iconPlay"[^>]+href="([^"]+)"[^>]*>/;
    const voeMatch = voeRegex.exec(html);
    
    if (!voeMatch || !voeMatch[1]) {
      console.log('VOE HD stream URL not found');
      return false;
    }
    const voeUrl = voeMatch[1];

    
    console.log('VOE URL:', voeUrl);

    const videoPage = await fetch(voeUrl);
    if (!videoPage) {
      console.log('VOE HD video page not found');
      return false;
    }


    const scriptRegex = /window\.location\.href\s*=\s*['"]([^'"]+)['"]/;
    const scriptMatch = scriptRegex.exec(videoPage);
    const winLocUrl = scriptMatch ? scriptMatch[1] : '';

    if (!winLocUrl) {
      console.log('VOE HD window location URL not found');
      return false;
    }

    const hlsSourceUrl = await fetch(winLocUrl);

    const sourcesRegex = /var\s+sources\s*=\s*({[^}]+})/;
    const sourcesMatch = sourcesRegex.exec(hlsSourceUrl);
    let sourcesString = sourcesMatch ? sourcesMatch[1].replace(/'/g, '"') : null;

    sourcesString = sourcesString ? sourcesString.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']') : null;

    const sources = sourcesString ? JSON.parse(sourcesString) : null;
    if (sources && sources.hls) {
      const hlsBase64 = sources.hls;
      const hlsDecoded = base64Decode(hlsBase64);
      console.log('HLS Decoded:' + hlsDecoded);
      return hlsDecoded;
    }

    return false;
}

/**
 * Extracts the stream URL from a film's page.
 * @param {string} url - The URL of the film's page.
 * @returns {Promise<string|null>} - The stream URL or null if not found.
 */

async function bigWarpExtract(html) {
    console.log('BigWarp HD extraction method');
    const bwRegex = /<ul class="currentStreamLinks"[\s\S]*?<p class="hostName">BigWarp HD<\/p>[\s\S]*?<a[^>]+class="button rb iconPlay"[^>]+href="([^"]+)"[^>]*>/;
    const bwMatch = bwRegex.exec(html);

    if (!bwMatch || !bwMatch[1]) {
      console.log('BigWarp HD stream URL not found');
      return false;
    }

    let bwUrl = bwMatch[1];

    console.log('BigWarp URL:', bwUrl);

    const videoPage = await fetch(bwUrl);

    const scriptRegex = /jwplayer\("vplayer"\)\.setup\(\{[\s\S]*?sources:\s*\[\{file:"([^"]+)",label:"[^"]+"\}\]/;
    const scriptMatch = scriptRegex.exec(videoPage);
    const bwDecoded = scriptMatch ? scriptMatch[1] : false;
    console.log('BigWarp HD Decoded:', bwDecoded);
    return bwDecoded;
}

/**
 * Decodes a base64 encoded string.
 * @param {string} str - The base64 encoded string.
 * @returns {string} - The decoded string.
 */
function base64Decode(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';

  str = String(str).replace(/=+$/, '');

  if (str.length % 4 === 1) {
    throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  }

  for (let bc = 0, bs, buffer, idx = 0; (buffer = str.charAt(idx++)); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
    buffer = chars.indexOf(buffer);
  }

  return output;
}

// Check out the Sora WebUI at https://api.jm26.net/sora-modules/