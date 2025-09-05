const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const AES_KEY_HEX = "afd68119f7afc868797124fd1941f6e0d04e6dcef9e9fc41f858e2a0ba33d4fb";
const IV_HEX = "00000000000000000000000000000000";

const key = Buffer.from(AES_KEY_HEX, 'hex');
const iv = Buffer.from(IV_HEX, 'hex');

// Get all directories in the current directory
const dirs = fs.readdirSync('.', { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

dirs.forEach(dir => {
  const soraFile = path.join(dir, `${dir}.sora`);
  const jsFile = path.join(dir, `${dir}.js`);
  const jsonFile = path.join(dir, `${dir}.json`);

  if (fs.existsSync(soraFile)) {
    // Decrypt .sora file
    const encrypted = fs.readFileSync(soraFile);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    // Save as .js file
    fs.writeFileSync(jsFile, decrypted);

    // Update .json file
    if (fs.existsSync(jsonFile)) {
      const jsonContent = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      if (jsonContent.scriptUrl) {
        jsonContent.scriptUrl = jsonContent.scriptUrl.replace('.sora', '.js').replace('50n50/sources', 'tamocruz/ssources');
      }
      if (jsonContent.encrypted !== undefined) {
        jsonContent.encrypted = false;
      }
      fs.writeFileSync(jsonFile, JSON.stringify(jsonContent, null, 2));
    }
  }
});

console.log('Decryption and update completed.');
