import fs from "fs";
import path from "path";

import { fileURLToPath } from "url";
// Directory where compiled JS files are stored

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, "dist");

// Function to recursively process files
const fixImports = (dir) => {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixImports(fullPath);
    } else if (file.endsWith(".js")) {
      let content = fs.readFileSync(fullPath, "utf8");
      const fixedContent = content.replace(
        /(\bfrom\s+["'].*?)(\.ts)(["'])/g,
        "$1.js$3",
      );

      if (fixedContent !== content) {
        fs.writeFileSync(fullPath, fixedContent, "utf8");
        console.log(`Fixed imports in: ${fullPath}`);
      }
    }
  });
};

// Start processing the dist directory
fixImports(distDir);
console.log("Import path fixing complete.");
