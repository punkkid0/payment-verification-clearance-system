// Certificate Generator
// Generates a styled PDF clearance certificate using PDFKit
// Institution: University of Cross River State (UNICROSS)

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const CERT_DIR = path.join(__dirname, '../../uploads/certificates');

// Ensure certificates directory exists
if (!fs.existsSync(CERT_DIR)) {
  fs.mkdirSync(CERT_DIR, { recursive: true });
}

const COLORS = {
  navy:       '#1a3a5c',
  blue:       '#2d6a9f',
  gold:       '#c9a227',
  lightGold:  '#f5e6a3',
  lightBlue:  '#e8f3fc',
  darkText:   '#1a1a2e',
  mutedText:  '#666677',
  white:      '#ffffff',
  green:      '#1a7a4a',
  lightGreen: '#e8f8ef',
};

function drawBorder(doc) {
  const m = 20;
  const w = doc.page.width;
  const h = doc.page.height;
  doc.rect(m, m, w - 2 * m, h - 2 * m).lineWidth(3).strokeColor(COLORS.navy).stroke();
  doc.rect(m + 8, m + 8, w - 2 * (m + 8), h - 2 * (m + 8)).lineWidth(1).strokeColor(COLORS.gold).stroke();
}

function drawHeader(doc) {
  const w = doc.page.width;
  doc.rect(40, 40, w - 80, 110).fill(COLORS.navy);
  doc.fontSize(18).fillColor(COLORS.white).font('Helvetica-Bold')
    .text('UNIVERSITY OF CROSS RIVER STATE', 40, 50, { width: w - 80, align: 'center' });
  doc.fontSize(11).fillColor(COLORS.lightGold).font('Helvetica')
    .text('(UNICROSS)', 40, 72, { width: w - 80, align: 'center' });
  doc.fontSize(10).fillColor(COLORS.gold)
    .text('Established by Edict No. 5 of 2004', 40, 90, { width: w - 80, align: 'center' });
  doc.fontSize(9).fillColor(COLORS.gold)
    .text('BURSARY DEPARTMENT — FINANCE & CLEARANCE OFFICE', 40, 130, { width: w - 80, align: 'center' });
}

function drawTitleRibbon(doc) {
  const w = doc.page.width;
  doc.rect(40, 165, w - 80, 36).fill(COLORS.gold);
  doc.fontSize(16).fillColor(COLORS.navy).font('Helvetica-Bold')
    .text('CLEARANCE CERTIFICATE', 40, 175, { width: w - 80, align: 'center' });
}

async function generateCertificate(studentData, requestData) {
  return new Promise((resolve, reject) => {
    const certId   = `CERT-${requestData.id}-${uuidv4().split('-')[0].toUpperCase()}`;
    const filename = `clearance-${requestData.id}-${Date.now()}.pdf`;
    const filepath = path.join(CERT_DIR, filename);
    const certUrl  = `/uploads/certificates/${filename}`;

    const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 } });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const w = doc.page.width;

    drawBorder(doc);
    drawHeader(doc);
    drawTitleRibbon(doc);

    // Sub-title
    doc.fontSize(11).fillColor(COLORS.mutedText).font('Helvetica-Oblique')
      .text('To Whom It May Concern', 40, 218, { width: w - 80, align: 'center' });

    // Intro paragraph
    const bodyX = 60;
    const bodyW = w - 120;
    doc.fontSize(12).fillColor(COLORS.darkText).font('Helvetica')
      .text(
        'This is to certify that the following student has been duly verified and granted financial clearance by the Bursary Department of the University of Cross River State.',
        bodyX, 248, { width: bodyW, align: 'justify', lineGap: 4 }
      );

    // Student details card
    const cardY = 310;
    const cardH = 130;
    doc.rect(bodyX, cardY, bodyW, cardH).fill(COLORS.lightBlue);
    doc.rect(bodyX, cardY, 4, cardH).fill(COLORS.blue);

    const col1 = bodyX + 16;
    const col2 = bodyX + bodyW / 2 + 10;

    const details = [
      ['Full Name',      studentData.full_name || '—',   col1],
      ['Username',       `@${studentData.username || '—'}`, col1],
      ['Email Address',  studentData.email || '—',        col1],
      ['Request ID',     `#${requestData.id}`,            col2],
      ['Clearance Date', new Date(requestData.reviewed_at || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), col2],
      ['Certificate No', certId,                          col2],
    ];

    details.forEach(([label, value, x], i) => {
      const row = i < 3 ? i : i - 3;
      const y   = cardY + 12 + row * 36;
      doc.fontSize(8).fillColor(COLORS.mutedText).font('Helvetica-Bold').text(label.toUpperCase(), x, y);
      doc.fontSize(10).fillColor(COLORS.darkText).font('Helvetica').text(value, x, y + 10, { width: bodyW / 2 - 20 });
    });

    // Cleared statement
    const statY = cardY + cardH + 20;
    doc.rect(bodyX, statY, bodyW, 44).fill(COLORS.lightGreen);
    doc.fontSize(11).fillColor(COLORS.green).font('Helvetica-Bold')
      .text('CLEARED — No Financial Obligations Outstanding', bodyX, statY + 8, { width: bodyW, align: 'center' });
    doc.fontSize(9).fillColor(COLORS.green).font('Helvetica')
      .text('This student has satisfied all financial requirements for the current academic session.', bodyX, statY + 26, { width: bodyW, align: 'center' });

    // Signatures
    const sigY = statY + 70;
    [[col1, 'BURSAR / FINANCE OFFICER'], [col2, 'REGISTRAR']].forEach(([x, title]) => {
      doc.moveTo(x, sigY + 30).lineTo(x + 140, sigY + 30).lineWidth(1).strokeColor(COLORS.navy).stroke();
      doc.fontSize(9).fillColor(COLORS.darkText).font('Helvetica-Bold').text(title, x, sigY + 35);
      doc.fontSize(8).fillColor(COLORS.mutedText).font('Helvetica').text('University of Cross River State', x, sigY + 48);
    });

    // Footer
    const footY = doc.page.height - 70;
    doc.rect(40, footY, w - 80, 1).fill(COLORS.gold);
    doc.fontSize(8).fillColor(COLORS.mutedText).font('Helvetica')
      .text(`Certificate No: ${certId}  ·  Generated: ${new Date().toLocaleString()}  ·  Valid only with official university stamp.`, 40, footY + 8, { width: w - 80, align: 'center' })
      .text('UNICROSS — Bursary Department, Ogoja Campus, Cross River State, Nigeria', 40, footY + 22, { width: w - 80, align: 'center' });

    // Corner dots
    [[28, 28], [w - 28, 28], [28, doc.page.height - 28], [w - 28, doc.page.height - 28]].forEach(([cx, cy]) => {
      doc.circle(cx, cy, 4).fill(COLORS.gold);
    });

    doc.end();

    stream.on('finish', () => resolve({ filename, filepath, url: certUrl, certId, size: fs.statSync(filepath).size, generated_at: new Date().toISOString() }));
    stream.on('error', reject);
  });
}

function getCertificateInfo(filename) {
  const filepath = path.join(CERT_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  return { filename, filepath, size: fs.statSync(filepath).size };
}

module.exports = { generateCertificate, getCertificateInfo };
