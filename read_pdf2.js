const fs = require('fs');
const PDFExtract = require('pdf.js-extract').PDFExtract;
const pdfExtract = new PDFExtract();
const options = {};
pdfExtract.extract('Meet Maestro File System Integration.pdf', options, (err, data) => {
    if (err) return console.log(err);
    let text = '';
    data.pages.forEach(page => {
        page.content.forEach(item => { text += item.str + ' '; });
        text += '\n';
    });
    fs.writeFileSync('pdf_text.txt', text);
    console.log('Done');
});
