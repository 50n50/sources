async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2("https://dorabash.com/?s=" + encodeURIComponent(keyword));
        const html = await response.text();

        const regex = /<article class="bs"[\s\S]*?<a href="([^"]+)"[^>]*>[\s\S]*?<img src="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?<\/a>/g;

        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                href: match[1].trim(),
                image: match[2].trim(),
                title: cleanHtmlSymbols(match[3].trim())
            });
        }

        return JSON.stringify(results);
    } catch (err) {
        return JSON.stringify([{
            title: "Error",
            image: "Error",
            href: "Error"
        }]);
    }
}

async function extractDetails(url) {
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const regex = /<div class="entry-content"[^>]*itemprop="description"[^>]*>\s*<p>([\s\S]*?)<\/p>/i;
        const match = regex.exec(html);

        const description = match ? match[1].trim() : "N/A";

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
    const results = [];
    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const regex = /<li[^>]*>\s*<a href="([^"]+)">[\s\S]*?<div class="epl-num">([^<]+)<\/div>/g;

        let match;
        while ((match = regex.exec(html)) !== null) {
            let numText = match[2].trim();
            let number = /^\d+$/.test(numText) ? parseInt(numText, 10) : 1; 

            results.push({
                href: match[1].trim(),
                number: number
            });
        }

        return JSON.stringify(results.reverse());
    } catch (err) {
        return JSON.stringify([{
            href: "Error",
            number: "Error"
        }]);
    }
}

async function extractStreamUrl(url) {
  try {
    const response = await fetchv2(url);
    const html = await response.text();

    const playerRegex = /<option[^>]*value="([^"]+)"[^>]*data-index="2"[^>]*>/;
    const playerMatch = playerRegex.exec(html);
    if (!playerMatch) throw new Error("Player not found");

    const decodedHtml = atob(playerMatch[1]);

    const iframeSrcMatch = /<iframe[^>]*src="([^"]*filemoon[^"]*)"/.exec(decodedHtml);
    if (!iframeSrcMatch) throw new Error("Filemoon iframe not found");

    const filemoonUrl = iframeSrcMatch[1];

    const providers = { [filemoonUrl]: "filemoon" };
    const streams = await multiExtractor(providers);

    const hlsLink = streams[1];

    console.log(hlsLink);

    return hlsLink;


  } catch (err) {
    console.error("Error in extractStreamUrl:", err);
    return "https://files.catbox.moe/avolvc.mp4";
  }
}

function cleanHtmlSymbols(string) {
  if (!string) return "";
  return string
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#[0-9]+;/g, "")
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ⚠️ DO NOT EDIT BELOW THIS LINE ⚠️
// EDITING THIS FILE COULD BREAK THE UPDATER AND CAUSE ISSUES WITH THE EXTRACTOR

/* {GE START} */
/* {VERSION: 1.1.4} */

/**
 * @name global_extractor.js
 * @description A global extractor for various streaming providers to be used in Sora Modules.
 * @author Cufiy
 * @url https://github.com/JMcrafter26/sora-global-extractor
 * @license CUSTOM LICENSE - see https://github.com/JMcrafter26/sora-global-extractor/blob/main/LICENSE
 * @date 2025-08-13 03:44:07
 * @version 1.1.4
 * @note This file was generated automatically.
 * The global extractor comes with an auto-updating feature, so you can always get the latest version. https://github.com/JMcrafter26/sora-global-extractor#-auto-updater
 */

function globalExtractor(providers) {
  for (const [url, provider] of Object.entries(providers)) {
    try {
      const streamUrl = extractStreamUrlByProvider(url, provider);
      // check if streamUrl is not null, a string, and starts with http or https
      if (streamUrl && typeof streamUrl === "string" && (streamUrl.startsWith("http"))) {
        return streamUrl;
        // if its an array, get the value that starts with http
      } else if (Array.isArray(streamUrl)) {
        const httpStream = streamUrl.find(url => url.startsWith("http"));
        if (httpStream) {
          return httpStream;
        }
      } else if (streamUrl || typeof streamUrl !== "string") {
        // check if it's a valid stream URL
        return null;
      }

    } catch (error) {
      // Ignore the error and try the next provider
    }
  }
  return null;
}

async function multiExtractor(providers) {
  /* this scheme should be returned as a JSON object
  {
  "streams": [
    "FileMoon",
    "https://filemoon.example/stream1.m3u8",
    "StreamWish",
    "https://streamwish.example/stream2.m3u8",
    "Okru",
    "https://okru.example/stream3.m3u8",
    "MP4",
    "https://mp4upload.example/stream4.mp4",
    "Default",
    "https://default.example/stream5.m3u8"
  ]
}
  */

  const streams = [];
  const providersCount = {};
  for (let [url, provider] of Object.entries(providers)) {
    try {
      // if provider starts with "direct-", then add the url to the streams array directly
      if (provider.startsWith("direct-")) {
        const directName = provider.slice(7); // remove "direct-" prefix
        if (directName && directName.length > 0) {
          streams.push(directName, url);
        } else {
          streams.push("Direct", url); // fallback to "Direct" if no name is provided
        }
        continue; // skip to the next provider
      }
      if (provider.startsWith("direct")) {
        provider = provider.slice(7); // remove "direct-" prefix
        if (provider && provider.length > 0) {
          streams.push(provider, url);
        } else {
          streams.push("Direct", url); // fallback to "Direct" if no name is provided
        }
      }

      let customName = null; // to store the custom name if provided

      // if the provider has - then split it and use the first part as the provider name
      if (provider.includes("-")) {
        const parts = provider.split("-");
        provider = parts[0]; // use the first part as the provider name
        customName = parts.slice(1).join("-"); // use the rest as the custom name
      }

      // check if providercount is not bigger than 3
      if (providersCount[provider] && providersCount[provider] >= 3) {
        console.log(`Skipping ${provider} as it has already 3 streams`);
        continue;
      }
      let streamUrl = await extractStreamUrlByProvider(url, provider);
      
       if (streamUrl && Array.isArray(streamUrl)) {
        const httpStream = streamUrl.find(url => url.startsWith("http"));
        if (httpStream) {
          streamUrl = httpStream;
        }
      }
      // check if provider is already in streams, if it is, add a number to it
      if (
        !streamUrl ||
        typeof streamUrl !== "string" ||
        !streamUrl.startsWith("http")
      ) {
        continue; // skip if streamUrl is not valid
      }

      // if customName is defined, use it as the name
      if (customName && customName.length > 0) {
        provider = customName;
      }

      if (providersCount[provider]) {
        providersCount[provider]++;
        streams.push(
          provider.charAt(0).toUpperCase() +
            provider.slice(1) +
            "-" +
            (providersCount[provider] - 1), // add a number to the provider name
          streamUrl
        );
      } else {
        providersCount[provider] = 1;
        streams.push(
          provider.charAt(0).toUpperCase() + provider.slice(1),
          streamUrl
        );
      }
    } catch (error) {
      // Ignore the error and try the next provider
    }
  }
  return streams;
}

async function extractStreamUrlByProvider(url, provider) {
  if (eval(`typeof ${provider}Extractor`) !== "function") {
    // skip if the extractor is not defined
    console.log(`Extractor for provider ${provider} is not defined, skipping...`);
    return null;
  }
  let headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Referer": url,
    "Connection": "keep-alive",
    "x-Requested-With": "XMLHttpRequest"
  };
  if(provider == 'bigwarp') {
    delete headers["User-Agent"];
    headers["x-requested-with"] = "XMLHttpRequest";
  } else if (provider == 'vk') {
    headers["encoding"] = "windows-1251"; // required
  } else if (provider == 'sibnet') {
    headers["encoding"] = "windows-1251"; // required
  }

  // fetch the url
  // and pass the response to the extractor function
  console.log("Fetching URL: " + url);
  const response = await soraFetch(url, {
      headers
    });

  console.log("Response: " + response.status);
  let html = response.text ? await response.text() : response;
  // if title contains redirect, then get the redirect url
  const title = html.match(/<title>(.*?)<\/title>/);
  if (title && title[1].toLowerCase().includes("redirect")) {
    const redirectUrl = html.match(/<meta http-equiv="refresh" content="0;url=(.*?)"/);
    const redirectUrl2 = html.match(/window\.location\.href\s*=\s*["'](.*?)["']/);
    const redirectUrl3 = html.match(/window\.location\.replace\s*\(\s*["'](.*?)["']\s*\)/);
    if (redirectUrl) {
      console.log("Redirect URL: " + redirectUrl[1]);
      url = redirectUrl[1];
      html = await soraFetch(url, {
        headers
      });
      html = html.text ? await html.text() : html;

    } else if (redirectUrl2) {
      console.log("Redirect URL 2: " + redirectUrl2[1]);
      url = redirectUrl2[1];
      html = await soraFetch(url, {
        headers
      });
      html = html.text ? await html.text() : html;
    } else if (redirectUrl3) {
      console.log("Redirect URL 3: " + redirectUrl3[1]);
      url = redirectUrl3[1];
      html = await soraFetch(url, {
        headers
      });
      html = html.text ? await html.text() : html;
    } else {
      console.log("No redirect URL found");
    }
  }

  // console.log("HTML: " + html);
  switch (provider) {
    case "bigwarp":
      try {
         return await bigwarpExtractor(html, url);
      } catch (error) {
         console.log("Error extracting stream URL from bigwarp:", error);
         return null;
      }
    case "doodstream":
      try {
         return await doodstreamExtractor(html, url);
      } catch (error) {
         console.log("Error extracting stream URL from doodstream:", error);
         return null;
      }
    case "filemoon":
      try {
         return await filemoonExtractor(html, url);
      } catch (error) {
         console.log("Error extracting stream URL from filemoon:", error);
         return null;
      }
    case "megacloud":
      try {
         return await megacloudExtractor(html, url);
      } catch (error) {
         console.log("Error extracting stream URL from megacloud:", error);
         return null;
      }
    case "mp4upload":
      try {
         return await mp4uploadExtractor(html, url);
      } catch (error) {
         console.log("Error extracting stream URL from mp4upload:", error);
         return null;
      }
    case "sibnet":
      try {
         return await sibnetExtractor(html, url);
      } catch (error) {
         console.log("Error extracting stream URL from sibnet:", error);
         return null;
      }
    case "uqload":
      try {
         return await uqloadExtractor(html, url);
      } catch (error) {
         console.log("Error extracting stream URL from uqload:", error);
         return null;
      }
    case "vidmoly":
      try {
         return await vidmolyExtractor(html, url);
      } catch (error) {
         console.log("Error extracting stream URL from vidmoly:", error);
         return null;
      }
    case "vidoza":
      try {
         return await vidozaExtractor(html, url);
      } catch (error) {
         console.log("Error extracting stream URL from vidoza:", error);
         return null;
      }
    case "voe":
      try {
         return await voeExtractor(html, url);
      } catch (error) {
         console.log("Error extracting stream URL from voe:", error);
         return null;
      }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}






////////////////////////////////////////////////
//                 EXTRACTORS                 //
////////////////////////////////////////////////

// DO NOT EDIT BELOW THIS LINE UNLESS YOU KNOW WHAT YOU ARE DOING //


/* --- bigwarp --- */

/**
 * 
 * @name bigWarpExtractor
 * @author Cufiy
 */
async function bigwarpExtractor(videoPage, url = null) {

  // regex get 'sources: [{file:"THIS_IS_THE_URL" ... '
  const scriptRegex = /sources:\s*\[\{file:"([^"]+)"/;
  // const scriptRegex =
  const scriptMatch = scriptRegex.exec(videoPage);
  const bwDecoded = scriptMatch ? scriptMatch[1] : false;
  console.log("BigWarp HD Decoded:", bwDecoded);
  return bwDecoded;
}


/* --- doodstream --- */

/**
 * @name doodstreamExtractor
 * @author Cufiy
 */
async function doodstreamExtractor(html, url = null) {
    console.log("DoodStream extractor called");
    console.log("DoodStream extractor URL: " + url);
        const streamDomain = url.match(/https:\/\/(.*?)\//, url)[0].slice(8, -1);
        const md5Path = html.match(/'\/pass_md5\/(.*?)',/, url)[0].slice(11, -2);
        const token = md5Path.substring(md5Path.lastIndexOf("/") + 1);
        const expiryTimestamp = new Date().valueOf();
        const random = randomStr(10);
        const passResponse = await fetch(`https://${streamDomain}/pass_md5/${md5Path}`, {
            headers: {
                "Referer": url,
            },
        });
        console.log("DoodStream extractor response: " + passResponse.status);
        const responseData = await passResponse.text();
        const videoUrl = `${responseData}${random}?token=${token}&expiry=${expiryTimestamp}`;
        console.log("DoodStream extractor video URL: " + videoUrl);
        return videoUrl;
}
function randomStr(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}


/* --- filemoon --- */

/* {REQUIRED PLUGINS: unbaser} */
/**
 * @name filemoonExtractor
 * @author Cufiy - Inspired by Churly
 */
async function filemoonExtractor(html, url = null) {
    // check if contains iframe, if does, extract the src and get the url
    const regex = /<iframe[^>]+src="([^"]+)"[^>]*><\/iframe>/;
    const match = html.match(regex);
    if (match) {
        console.log("Iframe URL: " + match[1]);
        const iframeUrl = match[1];
        const iframeResponse = await soraFetch(iframeUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Referer": url,
            }
        });
        console.log("Iframe Response: " + iframeResponse.status);
        html = await iframeResponse.text();
    }
    // console.log("HTML: " + html);
    // get /<script[^>]*>([\s\S]*?)<\/script>/gi
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    const scripts = [];
    let scriptMatch;
    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
        scripts.push(scriptMatch[1]);
    }
    // get the script with eval and m3u8
    const evalRegex = /eval\((.*?)\)/;
    const m3u8Regex = /m3u8/;
    // console.log("Scripts: " + scripts);
    const evalScript = scripts.find(script => evalRegex.test(script) && m3u8Regex.test(script));
    if (!evalScript) {
        console.log("No eval script found");
        return null;
    }
    const unpackedScript = unpack(evalScript);
    // get the m3u8 url
    const m3u8Regex2 = /https?:\/\/[^\s]+master\.m3u8[^\s]*?(\?[^"]*)?/;
    const m3u8Match = unpackedScript.match(m3u8Regex2);
    if (m3u8Match) {
        return m3u8Match[0];
    } else {
        console.log("No M3U8 URL found");
        return null;
    }
}




/* --- megacloud --- */

/**
 * @name megacloudExtractor
 * @author ShadeOfChaos
 */

// Megacloud V3 specific
async function megacloudExtractor(html, embedUrl) {
	const CHARSET = Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32));
	const xraxParams = embedUrl.split('/').pop();
	const xrax = xraxParams.includes('?') ? xraxParams.split('?')[0] : xraxParams;
	const nonce = await getNonce(embedUrl);
	// return decrypt(secretKey, nonce, encryptedText);
	try {
		const response = await fetch(`https://megacloud.blog/embed-2/v3/e-1/getSources?id=${xrax}&_k=${nonce}`);
		const rawSourceData = await response.json();
		const encrypted = rawSourceData?.sources;
		let decryptedSources = null;
		if (rawSourceData?.encrypted == false) {
			decryptedSources = rawSourceData.sources;
		}
		if (decryptedSources == null) {
			decryptedSources = await getDecryptedSourceV3(encrypted, nonce);
			if (!decryptedSources) throw new Error("Failed to decrypt source");
		}
		console.log("Decrypted sources:" + JSON.stringify(decryptedSources, null, 2));
		// return the first source if it's an array
		if (Array.isArray(decryptedSources) && decryptedSources.length > 0) {
			try {
				return decryptedSources[0].file;
			} catch (error) {
				console.log("Error extracting MegaCloud stream URL:" + error);
				return null;
			}
		}
		// return {
		// 	status: true,
		// 	result: {
		// 		sources: decryptedSources,
		// 		tracks: rawSourceData.tracks,
		// 		intro: rawSourceData.intro ?? null,
		// 		outro: rawSourceData.outro ?? null,
		// 		server: rawSourceData.server ?? null
		// 	}
		// }
	} catch (error) {
		console.error(`[ERROR][decryptSources] Error decrypting ${embedUrl}:`, error);
		return {
			status: false,
			error: error?.message || 'Failed to get HLS link'
		};
	}
	/**
	 * Computes a key based on the given secret and nonce.
	 * The key is used to "unlock" the encrypted data.
	 * The computation of the key is based on the following steps:
	 * 1. Concatenate the secret and nonce.
	 * 2. Compute a hash value of the concatenated string using a simple
	 *    hash function (similar to Java's String.hashCode()).
	 * 3. Compute the remainder of the hash value divided by the maximum
	 *    value of a 64-bit signed integer.
	 * 4. Use the result as a XOR mask to process the characters of the
	 *    concatenated string.
	 * 5. Rotate the XOR-processed string by a shift amount equal to the
	 *    hash value modulo the length of the XOR-processed string plus 5.
	 * 6. Interleave the rotated string with the reversed nonce string.
	 * 7. Take a substring of the interleaved string of length equal to 96
	 *    plus the hash value modulo 33.
	 * 8. Convert each character of the substring to a character code
	 *    between 32 and 126 (inclusive) by taking the remainder of the
	 *    character code divided by 95 and adding 32.
	 * 9. Join the resulting array of characters into a string and return it.
	 * @param {string} secret - The secret string
	 * @param {string} nonce - The nonce string
	 * @returns {string} The computed key
	 */
	function computeKey(secret, nonce) {
		const secretAndNonce = secret + nonce;
		let hashValue = 0n;
		for (const char of secretAndNonce) {
			hashValue = BigInt(char.charCodeAt(0)) + hashValue * 31n + (hashValue << 7n) - hashValue;
		}
		const maximum64BitSignedIntegerValue = 0x7fffffffffffffffn;
		const hashValueModuloMax = hashValue % maximum64BitSignedIntegerValue;
		const xorMask = 247;
		const xorProcessedString = [...secretAndNonce]
			.map(char => String.fromCharCode(char.charCodeAt(0) ^ xorMask))
			.join('');
		const xorLen = xorProcessedString.length;
		const shiftAmount = (Number(hashValueModuloMax) % xorLen) + 5;
		const rotatedString = xorProcessedString.slice(shiftAmount) + xorProcessedString.slice(0, shiftAmount);
		const reversedNonceString = nonce.split('').reverse().join('');
		let interleavedString = '';
		const maxLen = Math.max(rotatedString.length, reversedNonceString.length);
		for (let i = 0; i < maxLen; i++) {
			interleavedString += (rotatedString[i] || '') + (reversedNonceString[i] || '');
		}
		const length = 96 + (Number(hashValueModuloMax) % 33);
		const partialString = interleavedString.substring(0, length);
		return [...partialString]
			.map(ch => String.fromCharCode((ch.charCodeAt(0) % 95) + 32))
			.join('');
	}
	/**
	 * Encrypts a given text using a columnar transposition cipher with a given key.
	 * The function arranges the text into a grid of columns and rows determined by the key length,
	 * fills the grid column by column based on the sorted order of the key characters,
	 * and returns the encrypted text by reading the grid row by row.
	 * 
	 * @param {string} text - The text to be encrypted.
	 * @param {string} key - The key that determines the order of columns in the grid.
	 * @returns {string} The encrypted text.
	 */
	function columnarCipher(text, key) {
		const columns = key.length;
		const rows = Math.ceil(text.length / columns);
		const grid = Array.from({ length: rows }, () => Array(columns).fill(''));
		const columnOrder = [...key]
			.map((char, idx) => ({ char, idx }))
			.sort((a, b) => a.char.charCodeAt(0) - b.char.charCodeAt(0));
		let i = 0;
		for (const { idx } of columnOrder) {
			for (let row = 0; row < rows; row++) {
				grid[row][idx] = text[i++] || '';
			}
		}
		return grid.flat().join('');
	}
	/**
	 * Deterministically unshuffles an array of characters based on a given key phrase.
	 * The function simulates a pseudo-random shuffling using a numeric seed derived
	 * from the key phrase. This ensures that the same character array and key phrase
	 * will always produce the same output, allowing for deterministic "unshuffling".
	 * @param {Array} characters - The array of characters to unshuffle.
	 * @param {string} keyPhrase - The key phrase used to generate the seed for the 
	 *                             pseudo-random number generator.
	 * @returns {Array} A new array representing the deterministically unshuffled characters.
	 */
	function deterministicUnshuffle(characters, keyPhrase) {
		let seed = [...keyPhrase].reduce((acc, char) => (acc * 31n + BigInt(char.charCodeAt(0))) & 0xffffffffn, 0n);
		const randomNumberGenerator = (upperLimit) => {
			seed = (seed * 1103515245n + 12345n) & 0x7fffffffn;
			return Number(seed % BigInt(upperLimit));
		};
		const shuffledCharacters = characters.slice();
		for (let i = shuffledCharacters.length - 1; i > 0; i--) {
			const j = randomNumberGenerator(i + 1);
			[shuffledCharacters[i], shuffledCharacters[j]] = [shuffledCharacters[j], shuffledCharacters[i]];
		}
		return shuffledCharacters;
	}
	/**
	 * Decrypts an encrypted text using a secret key and a nonce through multiple rounds of decryption.
	 * The decryption process includes base64 decoding, character substitution using a pseudo-random 
	 * number generator, a columnar transposition cipher, and deterministic unshuffling of the character set.
	 * Finally, it extracts and parses the decrypted JSON string or verifies it using a regex pattern.
	 * 
	 * @param {string} secretKey - The key used to decrypt the text.
	 * @param {string} nonce - A nonce for additional input to the decryption key.
	 * @param {string} encryptedText - The text to be decrypted, encoded in base64.
	 * @param {number} [rounds=3] - The number of decryption rounds to perform.
	 * @returns {Object|null} The decrypted JSON object if successful, or null if parsing fails.
	 */
	function decrypt(secretKey, nonce, encryptedText, rounds = 3) {
		let decryptedText = Buffer.from(encryptedText, 'base64').toString('utf-8');
		const keyPhrase = computeKey(secretKey, nonce);
		for (let round = rounds; round >= 1; round--) {
			const encryptionPassphrase = keyPhrase + round;
			let seed = [...encryptionPassphrase].reduce((acc, char) => (acc * 31n + BigInt(char.charCodeAt(0))) & 0xffffffffn, 0n);
			const randomNumberGenerator = (upperLimit) => {
				seed = (seed * 1103515245n + 12345n) & 0x7fffffffn;
				return Number(seed % BigInt(upperLimit));
			};
			decryptedText = [...decryptedText]
				.map(char => {
					const charIndex = CHARSET.indexOf(char);
					if (charIndex === -1) return char;
					const offset = randomNumberGenerator(95);
					return CHARSET[(charIndex - offset + 95) % 95];
				})
				.join('');
			decryptedText = columnarCipher(decryptedText, encryptionPassphrase);
			const shuffledCharset = deterministicUnshuffle(CHARSET, encryptionPassphrase);
			const mappingArr = {};
			shuffledCharset.forEach((c, i) => (mappingArr[c] = CHARSET[i]));
			decryptedText = [...decryptedText].map(char => mappingArr[char] || char).join('');
		}
		const lengthString = decryptedText.slice(0, 4);
		let length = parseInt(lengthString, 10);
		if (isNaN(length) || length <= 0 || length > decryptedText.length - 4) {
			console.error('Invalid length in decrypted string');
			return decryptedText;
		}
		const decryptedString = decryptedText.slice(4, 4 + length);
		try {
			return JSON.parse(decryptedString);
		} catch (e) {
			console.warn('Could not parse decrypted string, unlikely to be valid. Using regex to verify');
			const regex = /"file":"(.*?)".*?"type":"(.*?)"/;
			const match = encryptedText.match(regex);
			const matchedFile = match?.[1];
			const matchType = match?.[2];
			if (!matchedFile || !matchType) {
				console.error('Could not match file or type in decrypted string');
				return null;
			}
			return decryptedString;
		}
	}
	/**
   * Tries to extract the MegaCloud nonce from the given embed URL.
   * 
   * Fetches the HTML of the page, and tries to extract the nonce from it.
   * If that fails, it sends a request with the "x-requested-with" header set to "XMLHttpRequest"
   * and tries to extract the nonce from that HTML.
   * 
   * If all else fails, it logs the HTML of both requests and returns null.
   * 
   * @param {string} embedUrl The URL of the MegaCloud embed
   * @returns {string|null} The extracted nonce, or null if it couldn't be found
   */
	async function getNonce(embedUrl) {
		const res = await fetch(embedUrl, { headers: { "referer": "https://anicrush.to/", "x-requested-with": "XMLHttpRequest" } });
		const html = await res.text();
		const match0 = html.match(/\<meta[\s\S]*?name="_gg_fb"[\s\S]*?content="([\s\S]*?)">/);
		if (match0?.[1]) {
			return match0[1];
		}
		const match1 = html.match(/_is_th:(\S*?)\s/);
		if (match1?.[1]) {
			return match1[1];
		}
		const match2 = html.match(/data-dpi="([\s\S]*?)"/);
		if (match2?.[1]) {
			return match2[1];
		}
		const match3 = html.match(/_lk_db[\s]?=[\s\S]*?x:[\s]"([\S]*?)"[\s\S]*?y:[\s]"([\S]*?)"[\s\S]*?z:[\s]"([\S]*?)"/);
		if (match3?.[1] && match3?.[2] && match3?.[3]) {
			return "" + match3[1] + match3[2] + match3[3];
		}
		const match4 = html.match(/nonce="([\s\S]*?)"/);
		if (match4?.[1]) {
			if (match4[1].length >= 32) return match4[1];
		}
		const match5 = html.match(/_xy_ws = "(\S*?)"/);
		if (match5?.[1]) {
			return match5[1];
		}
		const match6 = html.match(/[a-zA-Z0-9]{48}]/);
		if (match6?.[1]) {
			return match6[1];
		}
		return null;
	}
	async function getDecryptedSourceV3(encrypted, nonce) {
		let decrypted = null;
		const keys = await asyncGetKeys();
		for(let key in keys) {
			try {
				if (!encrypted) {
					console.log("Encrypted source missing in response")
					return null;
				}
				decrypted = decrypt(keys[key], nonce, encrypted);
				if(!Array.isArray(decrypted) || decrypted.length <= 0) {
					// Failed to decrypt source
					continue;
				}
				for(let source of decrypted) {
					if(source != null && source?.file?.startsWith('https://')) {
						// Malformed decrypted source
						continue;
					}
				}
				console.log("Functioning key:", key);
				return decrypted;
			} catch(error) {
				console.error('Error:', error);
				console.error(`[${ new Date().toLocaleString() }] Key did not work: ${ key }`);
				continue;
			}
		}
		return null;
	}
	async function asyncGetKeys() {
		const resolution = await Promise.allSettled([
			fetchKey("ofchaos", "https://ac-api.ofchaos.com/api/key"),
			fetchKey("yogesh", "https://raw.githubusercontent.com/yogesh-hacker/MegacloudKeys/refs/heads/main/keys.json"),
			fetchKey("esteven", "https://raw.githubusercontent.com/carlosesteven/e1-player-deobf/refs/heads/main/output/key.json")
		]);
		const keys = resolution.filter(r => r.status === 'fulfilled' && r.value != null).reduce((obj, r) => {
			let rKey = Object.keys(r.value)[0];
			let rValue = Object.values(r.value)[0];
			if (typeof rValue === 'string') {
				obj[rKey] = rValue.trim();
				return obj;
			}
			obj[rKey] = rValue?.mega ?? rValue?.decryptKey ?? rValue?.MegaCloud?.Anime?.Key ?? rValue?.megacloud?.key ?? rValue?.key ?? rValue?.megacloud?.anime?.key ?? rValue?.megacloud;
			return obj;
		}, {});
		if (keys.length === 0) {
			throw new Error("Failed to fetch any decryption key");
		}
		return keys;
	}
	function fetchKey(name, url, timeout = 1000) {
		return new Promise(async (resolve) => {
			try {
				const response = await fetch(url, { method: 'get', timeout: timeout });
				const key = await response.text();
				let trueKey = null;
				try {
					trueKey = JSON.parse(key);
				} catch (e) {
					trueKey = key;
				}
				resolve({ [name]: trueKey })
			} catch (error) {
				resolve(null);
			}
		});
	}
}


/* --- mp4upload --- */

/**
 * @name mp4uploadExtractor
 * @author Cufiy
 */
async function mp4uploadExtractor(html, url = null) {
    // src: "https://a4.mp4upload.com:183/d/xkx3b4etz3b4quuo66rbmyqtjjoivahfxp27f35pti45rzapbvj5xwb4wuqtlpewdz4dirfp/video.mp4"  
    const regex = /src:\s*"([^"]+)"/;
  const match = html.match(regex);
  if (match) {
    return match[1];
  } else {
    console.log("No match found for mp4upload extractor");
    return null;
  }
}


/* --- sibnet --- */

/**
 * @name sibnetExtractor
 * @author scigward
 */
async function sibnetExtractor(html, embedUrl) {
    try {
        const videoMatch = html.match(
            /player\.src\s*\(\s*\[\s*\{\s*src\s*:\s*["']([^"']+)["']/i
        );
        if (!videoMatch || !videoMatch[1]) {
            throw new Error("Sibnet video source not found");
        }
        const videoPath = videoMatch[1];
        const videoUrl = videoPath.startsWith("http")
            ? videoPath
            : `https://video.sibnet.ru${videoPath}`;
        return videoUrl;
    } catch (error) {
        console.log("SibNet extractor error: " + error.message);
        return null;
    }
}


/* --- uqload --- */

/**
 * @name uqloadExtractor
 * @author scigward
 */
async function uqloadExtractor(html, embedUrl) {
    try {
        const match = html.match(/sources:\s*\[\s*"([^"]+\.mp4)"\s*\]/);
        const videoSrc = match ? match[1] : "";
        return videoSrc;
    } catch (error) {
        console.log("uqloadExtractor error:", error.message);
        return null;
    }
}


/* --- vidmoly --- */

/**
 * @name vidmolyExtractor
 * @author Ibro
 */
async function vidmolyExtractor(html, url = null) {
  const regexSub = /<option value="([^"]+)"[^>]*>\s*SUB - Omega\s*<\/option>/;
  const regexFallback = /<option value="([^"]+)"[^>]*>\s*Omega\s*<\/option>/;
  const fallback =
    /<option value="([^"]+)"[^>]*>\s*SUB v2 - Omega\s*<\/option>/;
  let match =
    html.match(regexSub) || html.match(regexFallback) || html.match(fallback);
  if (match) {
    const decodedHtml = atob(match[1]); // Decode base64
    const iframeMatch = decodedHtml.match(/<iframe\s+src="([^"]+)"/);
    if (!iframeMatch) {
      console.log("Vidmoly extractor: No iframe match found");
      return null;
    }
    const streamUrl = iframeMatch[1].startsWith("//")
      ? "https:" + iframeMatch[1]
      : iframeMatch[1];
    const responseTwo = await fetchv2(streamUrl);
    const htmlTwo = await responseTwo.text();
    const m3u8Match = htmlTwo.match(/sources:\s*\[\{file:"([^"]+\.m3u8)"/);
    return m3u8Match ? m3u8Match[1] : null;
  } else {
    console.log("Vidmoly extractor: No match found, using fallback");
    //  regex the sources: [{file:"this_is_the_link"}]
    const sourcesRegex = /sources:\s*\[\{file:"(https?:\/\/[^"]+)"\}/;
    const sourcesMatch = html.match(sourcesRegex);
    let sourcesString = sourcesMatch
      ? sourcesMatch[1].replace(/'/g, '"')
      : null;
    return sourcesString;
  }
}


/* --- vidoza --- */

/**
 * @name vidozaExtractor
 * @author Cufiy
 */
async function vidozaExtractor(html, url = null) {
  const regex = /<source src="([^"]+)" type='video\/mp4'>/;
  const match = html.match(regex);
  if (match) {
    return match[1];
  } else {
    console.log("No match found for vidoza extractor");
    return null;
  }
}


/* --- voe --- */

/**
 * @name voeExtractor
 * @author Cufiy
 */
function voeExtractor(html, url = null) {
// Extract the first <script type="application/json">...</script>
    const jsonScriptMatch = html.match(
      /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i
    );
    if (!jsonScriptMatch) {
      console.log("No application/json script tag found");
      return null;
    }

    const obfuscatedJson = jsonScriptMatch[1].trim();
  let data;
  try {
    data = JSON.parse(obfuscatedJson);
  } catch (e) {
    throw new Error("Invalid JSON input.");
  }
  if (!Array.isArray(data) || typeof data[0] !== "string") {
    throw new Error("Input doesn't match expected format.");
  }
  let obfuscatedString = data[0];
  // Step 1: ROT13
  let step1 = voeRot13(obfuscatedString);
  // Step 2: Remove patterns
  let step2 = voeRemovePatterns(step1);
  // Step 3: Base64 decode
  let step3 = voeBase64Decode(step2);
  // Step 4: Subtract 3 from each char code
  let step4 = voeShiftChars(step3, 3);
  // Step 5: Reverse string
  let step5 = step4.split("").reverse().join("");
  // Step 6: Base64 decode again
  let step6 = voeBase64Decode(step5);
  // Step 7: Parse as JSON
  let result;
  try {
    result = JSON.parse(step6);
  } catch (e) {
    throw new Error("Final JSON parse error: " + e.message);
  }
  // console.log("Decoded JSON:", result);
  // check if direct_access_url is set, not null and starts with http
  if (result && typeof result === "object") {
    const streamUrl =
      result.direct_access_url ||
      result.source
        .map((source) => source.direct_access_url)
        .find((url) => url && url.startsWith("http"));
    if (streamUrl) {
      console.log("Voe Stream URL: " + streamUrl);
      return streamUrl;
    } else {
      console.log("No stream URL found in the decoded JSON");
    }
  }
  return result;
}
function voeRot13(str) {
  return str.replace(/[a-zA-Z]/g, function (c) {
    return String.fromCharCode(
      (c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13)
        ? c
        : c - 26
    );
  });
}
function voeRemovePatterns(str) {
  const patterns = ["@$", "^^", "~@", "%?", "*~", "!!", "#&"];
  let result = str;
  for (const pat of patterns) {
    result = result.split(pat).join("");
  }
  return result;
}
function voeBase64Decode(str) {
  // atob is available in browsers and Node >= 16
  if (typeof atob === "function") {
    return atob(str);
  }
  // Node.js fallback
  return Buffer.from(str, "base64").toString("utf-8");
}
function voeShiftChars(str, shift) {
  return str
    .split("")
    .map((c) => String.fromCharCode(c.charCodeAt(0) - shift))
    .join("");
}





////////////////////////////////////////////////
//                 PLUGINS                    //
////////////////////////////////////////////////

/**
 * Uses Sora's fetchv2 on ipad, fallbacks to regular fetch on Windows
 * @author ShadeOfChaos
 *
 * @param {string} url The URL to make the request to.
 * @param {object} [options] The options to use for the request.
 * @param {object} [options.headers] The headers to send with the request.
 * @param {string} [options.method='GET'] The method to use for the request.
 * @param {string} [options.body=null] The body of the request.
 *
 * @returns {Promise<Response|null>} The response from the server, or null if the
 * request failed.
 */
async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
    try {
        return await fetchv2(url, options.headers ?? {}, options.method ?? 'GET', options.body ?? null);
    } catch(e) {
        try {
            return await fetch(url, options);
        } catch(error) {
            await console.log('soraFetch error: ' + error.message);
            return null;
        }
    }
}

class Unbaser {
    constructor(base) {
        this.ALPHABET = {
            62: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
            95: "' !\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'",
        };
        this.dictionary = {};
        this.base = base;
        if (36 < base && base < 62) {
            this.ALPHABET[base] = this.ALPHABET[base] ||
                this.ALPHABET[62].substr(0, base);
        }
        if (2 <= base && base <= 36) {
            this.unbase = (value) => parseInt(value, base);
        }
        else {
            try {
                [...this.ALPHABET[base]].forEach((cipher, index) => {
                    this.dictionary[cipher] = index;
                });
            }
            catch (er) {
                throw Error("Unsupported base encoding.");
            }
            this.unbase = this._dictunbaser;
        }
    }
    _dictunbaser(value) {
        let ret = 0;
        [...value].reverse().forEach((cipher, index) => {
            ret = ret + ((Math.pow(this.base, index)) * this.dictionary[cipher]);
        });
        return ret;
    }
}


function unpack(source) {
    let { payload, symtab, radix, count } = _filterargs(source);
    if (count != symtab.length) {
        throw Error("Malformed p.a.c.k.e.r. symtab.");
    }
    let unbase;
    try {
        unbase = new Unbaser(radix);
    }
    catch (e) {
        throw Error("Unknown p.a.c.k.e.r. encoding.");
    }
    function lookup(match) {
        const word = match;
        let word2;
        if (radix == 1) {
            word2 = symtab[parseInt(word)];
        }
        else {
            word2 = symtab[unbase.unbase(word)];
        }
        return word2 || word;
    }
    source = payload.replace(/\b\w+\b/g, lookup);
    return _replacestrings(source);
    function _filterargs(source) {
        const juicers = [
            /}\('(.*)', *(\d+|\[\]), *(\d+), *'(.*)'\.split\('\|'\), *(\d+), *(.*)\)\)/,
            /}\('(.*)', *(\d+|\[\]), *(\d+), *'(.*)'\.split\('\|'\)/,
        ];
        for (const juicer of juicers) {
            const args = juicer.exec(source);
            if (args) {
                let a = args;
                if (a[2] == "[]") {
                }
                try {
                    return {
                        payload: a[1],
                        symtab: a[4].split("|"),
                        radix: parseInt(a[2]),
                        count: parseInt(a[3]),
                    };
                }
                catch (ValueError) {
                    throw Error("Corrupted p.a.c.k.e.r. data.");
                }
            }
        }
        throw Error("Could not make sense of p.a.c.k.e.r data (unexpected code structure)");
    }
    function _replacestrings(source) {
        return source;
    }
}

 

/* {GE END} */
