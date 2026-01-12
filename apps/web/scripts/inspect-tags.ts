
import fs from 'fs';
const content = fs.readFileSync('C:\\Dev\\DOCNEX AI\\DOCNEX_INICIO\\jm_normativa\\REGLAMENTO_LISTA.html', 'utf8');
const search = 'DEROGATORIAS';
const idx = content.indexOf(search, 300000);
if (idx !== -1) {
    console.log(content.substring(idx - 50, idx + 150));
} else {
    console.log('Not found after 300000');
}
