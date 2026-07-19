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
        // Match mangled style objects: style={{ ... }}', or style={{ ... }} className=...>',
        const match = line.match(/(.*style=\{\{\s*[\w]+:\s*)'([^']*)',$/);
        if (match) {
            let before = match[1];
            let inner = match[2]; 
            
            let afterStyleMatch = inner.match(/(\}\}\s*.*?)$/);
            let afterStyle = "";
            let styleContent = inner;
            if (afterStyleMatch) {
                afterStyle = afterStyleMatch[1];
                styleContent = inner.substring(0, inner.length - afterStyle.length);
            }
            
            // Fix style properties
            let props = styleContent.split(/,\s*(?=[a-zA-Z]+:)/);
            let fixedProps = props.map(p => {
                let pSplit = p.split(':');
                if (pSplit.length >= 2) {
                    let k = pSplit[0].trim();
                    let v = pSplit.slice(1).join(':').trim();
                    if (!v.startsWith("'") && !v.startsWith('"')) {
                        v = `'${v}'`;
                    }
                    return `${k}: ${v}`;
                }
                return p;
            });
            
            // Fix afterStyle
            if (afterStyle.includes('className=')) {
                afterStyle = afterStyle.replace(/className=([\w-]+)/, 'className="$1"');
            }
            // Remove trailing `>` if it was part of a tag closing but got mangled
            // Actually, the original line had `>`, and we appended `',`. So the `>` was before `',`.
            // Wait! The regex `([^']*)',$` matches up to `',`. So `inner` contains `>`.
            // `afterStyle` might contain `>`. We want to restore it properly.
            // My mangling logic: `valNoQuotes` replaced `"` and `'` with nothing.
            // If the original line ended with `>`, it ended up as `}>',` or `className=fade-in>',`.
            // So `afterStyle` will have `>`. We just put it back. But the `',` at the end of the line was REMOVED by the `.match(/(.*)'([^']*)',$/)`!
            // Wait, does the original line NEED a comma? Only if it was in a list of props (e.g. trailing comma in an object). But these are JSX tags! `<div style={{...}}>`.
            // There shouldn't be a comma after `<div ... >`.
            // What if the line was `<div style={{ padding: '12px' }}>`? My script turned it into `<div style={{ padding: ' 12px }}>',`.
            // So `before` = `<div style={{ padding: `, `inner` = ` 12px }}>`.
            // We just need to piece it together: `before` + `fixedProps` + `afterStyle`.
            // The `',` at the end is DROPPED.
            // What if it really needed a comma? e.g. a style object inside an array: `[style={{ padding: '12px' }}, ...]` - not possible, it's JSX.
            
            let newLine = before + fixedProps.join(', ') + afterStyle;
            lines[i] = newLine;
            changed = true;
        } else {
             // Another mangled case: style={{ padding: '24px 32px, fontSize: 1rem, borderRadius: 14px }}',
             // (When the whole style object was passed without HTML tags)
             const match2 = line.match(/(.*style=\{\{\s*[\w]+:\s*)'([^']*)',$/);
             if (match2) {
                 // handled by above
             }
        }
    }
    
    if (changed) {
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        console.log(`Fixed ${filePath}`);
    }
}

processDir(path.join(__dirname, 'src'));
