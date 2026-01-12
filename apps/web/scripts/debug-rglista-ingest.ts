
import fs from 'fs';
import path from 'path';

const filePath = 'C:\\Dev\\DOCNEX AI\\DOCNEX_INICIO\\jm_normativa\\REGLAMENTO_LISTA.html';
const html = fs.readFileSync(filePath, 'utf8');

function cleanText(text: string): string {
    return text
        .replace(/&nbsp;/g, ' ')
        .replace(/&aacute;/g, 'á')
        .replace(/&eacute;/g, 'é')
        .replace(/&iacute;/g, 'í')
        .replace(/&oacute;/g, 'ó')
        .replace(/&uacute;/g, 'ú')
        .replace(/&Aacute;/g, 'Á')
        .replace(/&Eacute;/g, 'É')
        .replace(/&Iacute;/g, 'Í')
        .replace(/&Oacute;/g, 'Ó')
        .replace(/&Uacute;/g, 'Ú')
        .replace(/&ntilde;/g, 'ñ')
        .replace(/&Ntilde;/g, 'Ñ')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

const dTxTStart = html.indexOf('<div id="dTxT">');
const mainText = html.substring(dTxTStart);

const h3Regex = /<h3 class="ca">([\s\S]*?)<\/h3>/g;
let match;
console.log('--- Testing H3 Regex ---');
let count = 0;
while ((match = h3Regex.exec(mainText)) !== null && count < 10) {
    const text = cleanText(match[1]);
    console.log(`Match ${count}: "${text}" | Starts with TÍTULO: ${text.startsWith('TÍTULO')}`);
    count++;
}
