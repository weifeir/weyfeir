const fs = require('fs');
const path = require('path');
const https = require('https');

// Make sure the banner directory exists
const bannerDir = path.join(__dirname, 'public', 'images', 'banners');
if (!fs.existsSync(bannerDir)) {
  fs.mkdirSync(bannerDir, { recursive: true });
}

// Banner image to download
const bannerImage = {
  name: 'one-day-special.jpg',
  url: 'https://images.pexels.com/photos/4792720/pexels-photo-4792720.jpeg?auto=compress&cs=tinysrgb&w=1000'
};

// Function to download an image
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filepath = path.join(bannerDir, filename);
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete the file if download failed
      console.error(`Error downloading ${filename}:`, err.message);
      reject(err);
    });
  });
}

// Download the banner image
downloadImage(bannerImage.url, bannerImage.name)
  .then(() => {
    console.log('Banner image downloaded successfully');
  })
  .catch((err) => {
    console.error('Failed to download banner image:', err);
  }); 