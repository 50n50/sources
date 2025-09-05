async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2("https://toonitalia.xyz/?s=" + encodeURIComponent(keyword));
        const html = await response.text();

        const regex = /<article[\s\S]*?<h2 class="entry-title heading-size-1"><a href="([^"]+)">([\s\S]*?)<\/a><\/h2>[\s\S]*?(?:<img[^>]+src="([^"]+)")?/gi;
        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[2].trim(),
                image: match[3] ? match[3].trim() : "",
                href: match[1].trim()
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

        const regex = /<h3><span[^>]*>Trama:<\/span><\/h3>\s*<p>([\s\S]*?)<\/p>/i;
        const match = regex.exec(html);
        const description = match ? match[1].replace(/<[^>]+>/g, "").trim() : "N/A";

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

        const episodeRegex = /(\d+)\s*(?:&#8211;|–)[^<]*<a href="(https:\/\/voe\.sx\/[^"]+)"/g;
        let match;
        while ((match = episodeRegex.exec(html)) !== null) {
            const voeUrl = match[2].trim().replace('https://voe.sx/', 'https://jilliandescribecompany.com/e/');
            results.push({
                href: voeUrl,
                number: parseInt(match[1], 10)
            });
        }

        if (results.length === 0) {
            const movieMatch = html.match(/<a href="(https:\/\/voe\.sx\/[^"]+)"/);
            if (movieMatch) {
                const voeUrl = movieMatch[1].trim().replace('https://voe.sx/', 'https://jilliandescribecompany.com/e/');
                results.push({
                    href: voeUrl,
                    number: 1
                });
            }
        }

        return JSON.stringify(results);
    } catch (err) {
        return JSON.stringify([{
            href: "Error",
            number: "Error"
        }]);
    }
}

async function extractStreamUrl(url) {

    const response = await fetchv2(url);
    const html = await response.text();
    let streamData = null;

    streamData = voeExtractor(html);
    console.log("Voe Stream Data: " + streamData);
    return streamData;
}

/* SCHEME START */

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
            (c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ?
            c :
            c - 26
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
/* SCHEME END */