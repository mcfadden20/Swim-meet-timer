const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('Meet Maestro File System Integration.pdf');

pdf(dataBuffer).then(function (data) {
    fs.writeFileSync('pdf_text.txt', data.text);
}).catch(function (error) {
    console.error("Error reading PDF:", error);
});
