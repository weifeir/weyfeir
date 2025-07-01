const fs = require('fs');
const path = require('path');
const https = require('https');

// Make sure the category directory exists
const categoryDir = path.join(__dirname, 'public', 'images', 'categories');
if (!fs.existsSync(categoryDir)) {
  fs.mkdirSync(categoryDir, { recursive: true });
}

// List of images to download
const images = [
  {
    name: 'women-clothing.jpg',
    url: 'https://images.pexels.com/photos/1021693/pexels-photo-1021693.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    name: 'men-clothing.jpg',
    url: 'https://images.pexels.com/photos/2254065/pexels-photo-2254065.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    name: 'computers-cameras.jpg',
    url: 'https://images.pexels.com/photos/777001/pexels-photo-777001.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    name: 'kids-toys.jpg',
    url: 'https://images.pexels.com/photos/981588/pexels-photo-981588.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    name: 'sports-outdoor.jpg',
    url: 'https://images.pexels.com/photos/209977/pexels-photo-209977.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    name: 'automobile-motorcycle.jpg',
    url: 'https://images.pexels.com/photos/3422964/pexels-photo-3422964.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    name: 'jewelry-watches.jpg',
    url: 'https://images.pexels.com/photos/265906/pexels-photo-265906.jpeg?auto=compress&cs=tinysrgb&w=150'
  }
];

// Function to download an image
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filepath = path.join(categoryDir, filename);
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

// Download all images
async function downloadAllImages() {
  for (const image of images) {
    await downloadImage(image.url, image.name);
  }
  console.log('All images downloaded successfully');
}

downloadAllImages().catch(err => {
  console.error('Download process failed:', err);
}); 