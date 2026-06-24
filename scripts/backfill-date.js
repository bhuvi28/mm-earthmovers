const fs = require('fs');
const path = require('path');

const contentDir = path.join(__dirname, '../content/products');
const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));

let updated = 0;

files.forEach(file => {
  const filePath = path.join(contentDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('date:')) {
    const stat = fs.statSync(filePath);
    const dateStr = stat.mtime.toISOString();
    
    content = content.replace(/^---\r?\n/, `---\ndate: "${dateStr}"\n`);
    fs.writeFileSync(filePath, content);
    updated++;
  }
});

console.log(`Successfully backfilled date to ${updated} product files.`);
