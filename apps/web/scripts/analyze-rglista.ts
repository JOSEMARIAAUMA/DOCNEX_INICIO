
import fs from 'fs';
import path from 'path';

const filePath = 'C:\\Dev\\DOCNEX AI\\DOCNEX_INICIO\\jm_normativa\\REGLAMENTO_LISTA.html';
const content = fs.readFileSync(filePath, 'utf8');

console.log('Total length:', content.length);

// Find the main text container
const containerStart = content.indexOf('<div id="dTxT">');
console.log('Container <div id="dTxT"> found at:', containerStart);

if (containerStart !== -1) {
    const mainText = content.substring(containerStart);

    const markers = [
        'TÍTULO PRELIMINAR',
        'TÍTULO I',
        'CAPÍTULO I',
        'Artículo 1',
        'DISPOSICIÓN ADICIONAL'
    ];

    markers.forEach(m => {
        const idx = mainText.indexOf(m);
        console.log(`In dTxT, marker "${m}" found at offset: ${idx}`);
        if (idx !== -1) {
            console.log(` Snippet: ${mainText.substring(idx, idx + 150)}`);
        }
    });
}
