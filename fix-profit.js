
// Create a sample JavaScript file to manually fix the issue
const fs = require("fs");
const path = "e:/React projectts/Ecommerce 2 clone/src/components/AdminDashboard.js";

try {
  let content = fs.readFileSync(path, "utf8");
  
  // Find the position of the profit text
  const searchStr = "Profit: ${((product.price || 0) - (product.cost || 0)).toFixed(2)}";
  const pos = content.indexOf(searchStr);
  
  if (pos !== -1) {
    // Find the closing Typography tag
    const closingTag = "</Typography>";
    const closingPos = content.indexOf(closingTag, pos);
    
    if (closingPos !== -1) {
      // Replace with our enhanced version
      const updatedContent = 
        content.substring(0, pos) + 
        "Profit: ${((product.price || 0) - (product.cost || 0)).toFixed(2)}" +
        "{(product.price && product.cost && product.price > 0) ? ` (${(((product.price - product.cost) / product.price) * 100).toFixed(0)}%)` : \"\"}" +
        content.substring(closingPos);
      
      fs.writeFileSync(path, updatedContent, "utf8");
      console.log("Successfully updated profit display with percentage");
    } else {
      console.log("Could not find closing Typography tag");
    }
  } else {
    console.log("Could not find profit text");
  }
} catch (err) {
  console.error("Error:", err);
}

