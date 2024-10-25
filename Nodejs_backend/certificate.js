require('dotenv').config();
const getStream = require('get-stream');
const PDFDocument = require('pdfkit');
const { PassThrough } = require('stream');
const path = require('path');

async function createCertificate(name, course_name) {
    try {
        console.log("Creating certificate for ", name, course_name);

        // Create a new PDF document
        const doc = new PDFDocument({
            layout: 'landscape',
            size: 'A4',
        });

        // Create a PassThrough stream to capture the PDF output
        const stream = new PassThrough();
        doc.pipe(stream);

        // Add content to the PDF
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#fff');
        
        // Log page dimensions for debugging
        console.log("Page width:", doc.page.width, "Page height:", doc.page.height);
        
        const cornersImagePath = path.join(__dirname, 'assets', 'corners.png');
        console.log("Corners image path:", cornersImagePath);
        doc.image(cornersImagePath, 0, 0, { width: doc.page.width, height: doc.page.height }); // Use fixed size for testing

        const fontPath = path.join(__dirname, 'fonts', 'RozhaOne-Regular.ttf');
        console.log("Font path:", fontPath);
        doc.font(fontPath).fontSize(60).fill('#292929').text('CERTIFICATE', 80, 30, { align: 'center' });
        doc.font(fontPath).fontSize(35).fill('#292929').text('OF COMPLETION', 100, 105, { align: 'center' });

        const rufinaFontPath = path.join(__dirname, 'fonts', 'Rufina-Regular.ttf');
        const pinyonFontPath = path.join(__dirname, 'fonts', 'Pinyon Script 400.ttf');

        doc.font(rufinaFontPath).fontSize(23).fill('#125951').text('This certificate is awarded to', 100, 185, { align: 'center' });
        doc.font(pinyonFontPath).fontSize(65).fill('#125951').text(`${name}`, 0, 250, { align: 'center' });

        const ekatraLogoPath = path.join(__dirname, 'assets', 'ekatra logo.png');
        console.log("Ekatra logo path:", ekatraLogoPath);
        doc.image(ekatraLogoPath, 725, 490, { fit: [75, 75] });

        doc.lineWidth(2).moveTo(200, 320).lineTo(700, 320).fillAndStroke('#125951');
        doc.font(rufinaFontPath).fontSize(25).fill('#292929').text('For Completing The Topic on ' + course_name, 140, 343, { align: 'center' });

        const signPath = path.join(__dirname, 'assets', 'Sign.png');
        console.log("Sign path:", signPath);
        doc.image(signPath, 560, 405, { fit: [120, 120] });

        doc.font(rufinaFontPath).fontSize(20).fill('#292929').text('Abhijeet K.', 490, 460, { align: 'center' });
        doc.lineWidth(2).moveTo(560, 490).lineTo(690, 490).fillAndStroke('#125951');
        doc.font(rufinaFontPath).fontSize(20).fill('#292929').text('Founder, Ekatra', 490, 497, { align: 'center' });

        doc.end(); // Finalize the PDF document

        // Convert the PassThrough stream into a buffer
        const pdfBuffer = await getStream.buffer(stream);

        console.log("Certificate created! Returning the buffer.");
        return pdfBuffer;
    } catch (error) {
        console.error("Error in creating certificate", error);
        throw error; // Rethrow the error to handle it in the calling code
    }
}

module.exports = { createCertificate };