const fs = require('fs');
const path = require('path');

const CONTENT_DIR = 'content/products';

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
  
  let renamed = 0;
  let skipped = 0;
  
  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Simple frontmatter parsing
    const titleMatch = content.match(/^title:\s*(.+)$/m);
    const partNumberMatch = content.match(/^part_number:\s*(.+)$/m);
    
    if (!titleMatch) {
      console.log(`Skipping ${file}: Missing title`);
      skipped++;
      continue;
    }

    const title = titleMatch[1].trim();
    const partNumberRaw = partNumberMatch ? partNumberMatch[1].trim() : '';
    
    // Sanitize components
    const sanitizedTitle = sanitize(title);
    const sanitizedPartNumber = sanitize(partNumberRaw);
    
    // Build new filename: {all-part-numbers-hyphenated}-{title}.md
    let newFilename = '';
    if (sanitizedPartNumber) {
      newFilename = `${sanitizedPartNumber}-${sanitizedTitle}.md`;
    } else {
      newFilename = `${sanitizedTitle}.md`;
    }
    
    // Skip if already named correctly
    if (file === newFilename) {
      console.log(`✓ ${file}: Already named correctly`);
      skipped++;
      continue;
    }
    
    const newFilePath = path.join(CONTENT_DIR, newFilename);
    
    console.log(`Renaming:`);
    console.log(`  Old: ${file}`);
    console.log(`  New: ${newFilename}`);

    try {
      // Check if target already exists (collision) - append suffix
      let finalNewFilename = newFilename;
      let finalNewFilePath = newFilePath;
      let suffix = 1;
      
      while (fs.existsSync(finalNewFilePath) && finalNewFilePath !== filePath) {
        const baseName = newFilename.replace('.md', '');
        finalNewFilename = `${baseName}-${suffix}.md`;
        finalNewFilePath = path.join(CONTENT_DIR, finalNewFilename);
        suffix++;
      }
      
      // Skip if already named correctly (including with suffix)
      if (filePath === finalNewFilePath) {
        console.log(`✓ ${file}: Already named correctly`);
        skipped++;
        continue;
      }

      console.log(`Renaming:`);
      console.log(`  Old: ${file}`);
      console.log(`  New: ${finalNewFilename}`);
      
      // Rename file
      fs.renameSync(filePath, finalNewFilePath);
      console.log(`  ✓ Renamed successfully`);
      renamed++;
    } catch (err) {
      console.error(`  ✗ Error processing ${file}:`, err.message);
      skipped++;
    }
  }
  
  console.log(`\n--- Summary ---`);
  console.log(`Renamed: ${renamed}`);
  console.log(`Skipped: ${skipped}`);
}

main();
