const fs = require('fs');
const path = require('path');

const CONTENT_DIR = 'content/products';
const IMAGES_DIR = 'public/images/uploads';
const PUBLIC_DIR = 'public';

// Helper to sanitize strings for filenames
function sanitize(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/\//g, '-')   // Replace slashes with hyphens
    .replace(/\s+/g, '-')  // Replace spaces with hyphens
    .replace(/[^a-z0-9\-]/g, '') // Remove other special chars
    .replace(/-+/g, '-')   // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Trim hyphens
}

async function main() {
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  
  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Simple frontmatter parsing
    const titleMatch = content.match(/^title:\s*(.+)$/m);
    const partNumberMatch = content.match(/^part_number:\s*(.+)$/m);
    const imageMatch = content.match(/^image:\s*(.+)$/m);
    
    if (!titleMatch || !imageMatch) {
      console.log(`Skipping ${file}: Missing title or image`);
      continue;
    }

    const title = titleMatch[1].trim();
    // Handle part number: taking everything, replacing / with - in sanitize
    const partNumberRaw = partNumberMatch ? partNumberMatch[1].trim() : ''; 
    const currentImagePath = imageMatch[1].trim();
    
    // Check if image exists
    const absoluteOldPath = path.join(process.cwd(), PUBLIC_DIR, currentImagePath);

    if (!fs.existsSync(absoluteOldPath)) {
      console.log(`Skipping ${file}: Image not found at ${absoluteOldPath}`);
      continue;
    }

    const ext = path.extname(currentImagePath);
    
    let newFilenameBase = '';
    const sanitizedTitle = sanitize(title);
    const sanitizedPartNumber = sanitize(partNumberRaw);

    if (sanitizedPartNumber) {
        newFilenameBase = `${sanitizedPartNumber}-${sanitizedTitle}`;
    } else {
        newFilenameBase = sanitizedTitle;
    }

    const newFilename = `${newFilenameBase}${ext}`;
    const newImagePath = `/images/uploads/${newFilename}`;
    const absoluteNewPath = path.join(process.cwd(), PUBLIC_DIR, 'images', 'uploads', newFilename);

    if (currentImagePath === newImagePath) {
        console.log(`Skipping ${file}: Already named correctly`);
        continue;
    }

    console.log(`Renaming:`);
    console.log(`  Old: ${currentImagePath}`);
    console.log(`  New: ${newImagePath}`);

    try {
        // Prevent overwriting existing files if not intended (though here we want to rename)
        // If target exists and is not the same file, we have a collision.
        if (fs.existsSync(absoluteNewPath) && absoluteNewPath !== absoluteOldPath) {
             console.log(`  Target exists! Overwriting.`);
             // In Windows, renameSync can fail if target exists, but we want to overwrite/unify
             // Actually, if target exists, we should probably update MD to point to target and delete old?
             // Or just move and overwrite.
             try {
                fs.unlinkSync(absoluteNewPath);
             } catch(e) {}
        }

        // Rename file
        fs.renameSync(absoluteOldPath, absoluteNewPath);
        
        // Update content
        const newContent = content.replace(currentImagePath, newImagePath);
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`  Updated ${file}`);
    } catch (err) {
        console.error(`  Error processing ${file}:`, err);
    }
  }
}

main();
