import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const categories = {
  electronics: {
    items: [
      { name: "Smart LED TV", price: 499.99, image: "https://images.samsung.com/is/image/samsung/p6pim/in/ua43t5450akxxl/gallery/in-crystal-4k-ua43t5450akxxl-front-black-531161912?$650_519_PNG$" },
      { name: "Wireless Headphones", price: 89.99, image: "https://m.media-amazon.com/images/I/61kV3qWxT+L._AC_UF1000,1000_QL80_.jpg" },
      { name: "Smartphone", price: 699.99, image: "https://images.samsung.com/is/image/samsung/p6pim/in/sm-a546elva/gallery/in-galaxy-a54-5g-sm-a546-sm-a546elva-535688778?$650_519_PNG$" },
      { name: "Laptop", price: 899.99, image: "https://m.media-amazon.com/images/I/71TPda7cwUL._AC_UF1000,1000_QL80_.jpg" },
      { name: "Smartwatch", price: 199.99, image: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/MKU93_VW_34FR+watch-41-alum-midnight-nc-8s_VW_34FR_WF_CO_GEO_IN?wid=1400&hei=1400&trim=1%2C0&fmt=p-jpg&qlt=95&.v=1632171038000%2C1661969977361" },
      { name: "Gaming Console", price: 399.99, image: "https://m.media-amazon.com/images/I/51tbWVPtckL._AC_UF1000,1000_QL80_.jpg" },
      { name: "Bluetooth Speaker", price: 79.99, image: "https://m.media-amazon.com/images/I/61N2sHHdRbL._AC_UF1000,1000_QL80_.jpg" },
      { name: "Tablet", price: 299.99, image: "https://m.media-amazon.com/images/I/61f2jX+y6PL._AC_UF1000,1000_QL80_.jpg" }
    ]
  },
  toys: {
    items: [
      { name: "LEGO Set", price: 49.99, image: "https://m.media-amazon.com/images/I/81nL+h7+AlL._AC_UF1000,1000_QL80_.jpg" },
      { name: "Remote Control Car", price: 39.99, image: "https://m.media-amazon.com/images/I/71IqhwHY4HL._AC_UF1000,1000_QL80_.jpg" },
      { name: "Barbie Doll", price: 19.99, image: "https://m.media-amazon.com/images/I/71RzCy+iJ9L._AC_UF1000,1000_QL80_.jpg" },
      { name: "Board Game", price: 24.99, image: "https://m.media-amazon.com/images/I/81RdtqJwvhL._AC_UF1000,1000_QL80_.jpg" },
      { name: "Stuffed Animal", price: 14.99, image: "https://m.media-amazon.com/images/I/61+mBINt0SL._AC_UF1000,1000_QL80_.jpg" },
      { name: "Play-Doh Set", price: 9.99, image: "https://m.media-amazon.com/images/I/81RckoGqjOL._AC_UF1000,1000_QL80_.jpg" },
      { name: "Puzzle", price: 12.99, image: "https://m.media-amazon.com/images/I/81RXoX5XQUL._AC_UF1000,1000_QL80_.jpg" },
      { name: "Action Figure", price: 15.99, image: "https://m.media-amazon.com/images/I/71E+KUvqnYL._AC_UF1000,1000_QL80_.jpg" }
    ]
  },
  menClothing: {
    items: [
      { name: "Men's T-Shirt", price: 19.99, image: "https://m.media-amazon.com/images/I/61GFUxNRbRL._AC_UY1000_.jpg" },
      { name: "Men's Jeans", price: 49.99, image: "https://m.media-amazon.com/images/I/61G1ZLzdTQL._AC_UY1000_.jpg" },
      { name: "Men's Hoodie", price: 39.99, image: "https://m.media-amazon.com/images/I/61U+jbQhqGL._AC_UY1000_.jpg" },
      { name: "Men's Jacket", price: 79.99, image: "https://m.media-amazon.com/images/I/71O1QaI-sbL._AC_UY1000_.jpg" },
      { name: "Men's Shorts", price: 24.99, image: "https://m.media-amazon.com/images/I/71acy5+o8pL._AC_UY1000_.jpg" },
      { name: "Men's Polo Shirt", price: 29.99, image: "https://m.media-amazon.com/images/I/61X-L9EfBhL._AC_UY1000_.jpg" },
      { name: "Men's Sweater", price: 44.99, image: "https://m.media-amazon.com/images/I/71f-Yb1u0jL._AC_UY1000_.jpg" },
      { name: "Men's Formal Shirt", price: 34.99, image: "https://m.media-amazon.com/images/I/61N6OjJ+5qL._AC_UY1000_.jpg" }
    ]
  },
  womenClothing: {
    items: [
      { name: "Women's Dress", price: 59.99, image: "https://m.media-amazon.com/images/I/61qMt9LnGQL._AC_UY1000_.jpg" },
      { name: "Women's Blouse", price: 29.99, image: "https://m.media-amazon.com/images/I/71cFpnm0D6L._AC_UY1000_.jpg" },
      { name: "Women's Jeans", price: 54.99, image: "https://m.media-amazon.com/images/I/71crd6ywOEL._AC_UY1000_.jpg" },
      { name: "Women's Skirt", price: 34.99, image: "https://m.media-amazon.com/images/I/61X3GlXk72L._AC_UY1000_.jpg" },
      { name: "Women's Sweater", price: 49.99, image: "https://m.media-amazon.com/images/I/71Hk0pGz-4L._AC_UY1000_.jpg" },
      { name: "Women's Jacket", price: 84.99, image: "https://m.media-amazon.com/images/I/61k6hq1EVIL._AC_UY1000_.jpg" },
      { name: "Women's T-Shirt", price: 24.99, image: "https://m.media-amazon.com/images/I/61K5QWS7rRL._AC_UY1000_.jpg" },
      { name: "Women's Hoodie", price: 44.99, image: "https://m.media-amazon.com/images/I/71CDyQtyh5L._AC_UY1000_.jpg" }
    ]
  },
  childrenClothing: {
    items: [
      { name: "Kids T-Shirt", price: 14.99, image: "https://m.media-amazon.com/images/I/61+Om+g+8SL._AC_UY1000_.jpg" },
      { name: "Kids Jeans", price: 29.99, image: "https://m.media-amazon.com/images/I/61v3q6oXKBL._AC_UY1000_.jpg" },
      { name: "Kids Dress", price: 34.99, image: "https://m.media-amazon.com/images/I/61qd1wOh8kL._AC_UY1000_.jpg" },
      { name: "Kids Pajamas", price: 19.99, image: "https://m.media-amazon.com/images/I/81Od5PHdXbL._AC_UY1000_.jpg" },
      { name: "Kids Sweater", price: 24.99, image: "https://m.media-amazon.com/images/I/71E+KkY9+fL._AC_UY1000_.jpg" },
      { name: "Kids Shorts", price: 16.99, image: "https://m.media-amazon.com/images/I/61Ow3S0GnOL._AC_UY1000_.jpg" },
      { name: "Kids Jacket", price: 39.99, image: "https://m.media-amazon.com/images/I/71cp9yGHuNL._AC_UY1000_.jpg" },
      { name: "Kids Hoodie", price: 29.99, image: "https://m.media-amazon.com/images/I/71cp9yGHuNL._AC_UY1000_.jpg" }
    ]
  }
};

const generateDescription = (name, category) => {
  return `High-quality ${name.toLowerCase()} from our ${category} collection. Perfect for any occasion. Made with premium materials and attention to detail.`;
};

const generateRandomStock = () => {
  return Math.floor(Math.random() * 50) + 10; // Random stock between 10 and 60
};

const generateRandomDiscount = () => {
  const discounts = [0, 0, 0, 5, 10, 15, 20]; // More zeros to make discounts less frequent
  return discounts[Math.floor(Math.random() * discounts.length)];
};

export const addDummyProducts = async () => {
  try {
    // Check if products already exist
    const productsRef = collection(db, 'products');
    const existingProducts = await getDocs(query(productsRef, where('isDummy', '==', true)));
    
    if (!existingProducts.empty) {
      console.log('Dummy products already exist');
      return;
    }

    const allProducts = [];

    // Generate products for each category
    Object.entries(categories).forEach(([category, data]) => {
      data.items.forEach((item) => {
        // Create multiple variations of each item
        for (let i = 1; i <= 5; i++) {
          const variation = i > 1 ? ` - Style ${i}` : '';
          allProducts.push({
            name: item.name + variation,
            price: item.price,
            description: generateDescription(item.name, category),
            category: category,
            imageUrl: item.image,
            stock: generateRandomStock(),
            discount: generateRandomDiscount(),
            createdAt: new Date(),
            isDummy: true // Flag to identify dummy products
          });
        }
      });
    });

    // Shuffle array to randomize products
    for (let i = allProducts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allProducts[i], allProducts[j]] = [allProducts[j], allProducts[i]];
    }

    // Add products to Firebase
    const batch = [];
    for (const product of allProducts) {
      batch.push(addDoc(productsRef, product));
    }

    await Promise.all(batch);
    console.log('Successfully added dummy products');
    return true;
  } catch (error) {
    console.error('Error adding dummy products:', error);
    return false;
  }
}; 