const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            fixFile(fullPath);
        }
    }
}

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let lines = content.split('\n');
    let changed = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        // Match mangled style objects
        const match = line.match(/(.*style=\{\{\s*[\w]+:\s*)'([^']*)',$/);
        if (match) {
            let before = match[1];
            let inner = match[2]; // e.g. " flex, gap: 15px }} className=fade-in>"
            
            // Re-add quotes around values
            // Split by comma outside of parens (rgba etc)
            // But since our values lost quotes, we can just look for "key: value"
            let restoredInner = inner;
            
            // If we have something like "}}>", let's extract it
            let afterStyleMatch = inner.match(/(\}\}\s*.*?)$/);
            let afterStyle = "";
            let styleContent = inner;
            if (afterStyleMatch) {
                afterStyle = afterStyleMatch[1];
                styleContent = inner.substring(0, inner.length - afterStyle.length);
            }
            
            // Fix style content: it's comma separated, but some commas might be in rgba
            // Since it's hard, let's just use a regex to wrap values in quotes if they aren't numbers
            let props = styleContent.split(/,\s*(?=[a-zA-Z]+:)/);
            let fixedProps = props.map(p => {
                let pSplit = p.split(':');
                if (pSplit.length >= 2) {
                    let k = pSplit[0].trim();
                    let v = pSplit.slice(1).join(':').trim();
                    if (!v.startsWith("'") && !v.startsWith('"')) {
                        // don't quote numbers without units if they shouldn't be, but usually in style we can quote everything
                        // except variables
                        if (v.includes('var(') || v.startsWith('rgba') || v.endsWith('px') || v.endsWith('rem') || v.endsWith('%') || isNaN(Number(v))) {
                            v = `'${v}'`;
                        } else {
                            v = `'${v}'`; // Just quote everything for safety in React inline styles
                        }
                    }
                    return `${k}: ${v}`;
                }
                return p;
            });
            
            // Fix afterStyle
            if (afterStyle.includes('className=')) {
                afterStyle = afterStyle.replace(/className=([\w-]+)/, 'className="$1"');
            }
            
            let newLine = before + fixedProps.join(', ') + afterStyle;
            lines[i] = newLine;
            changed = true;
        }
    }
    
    if (changed) {
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        console.log(`Fixed ${filePath}`);
    }
}

processDir(path.join(__dirname, 'src'));
