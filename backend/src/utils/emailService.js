const nodemailer = require('nodemailer');

let transporter = null;
let usesEthereal = false;

function fromAddress() {
  return process.env.SMTP_FROM || '"UNICROSS Clearance Office" <noreply@unicross.edu.ng>';
}

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    usesEthereal = false;
    console.log(`✓ Email transporter ready (SMTP ${process.env.SMTP_HOST}:${port})`);
    return transporter;
  }

  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  usesEthereal = true;
  console.log('✓ Email transporter ready (Ethereal fallback)');
  console.log(`  Ethereal user: ${testAccount.user}`);
  return transporter;
}

// ── Email templates ────────────────────────────────────────────

function approvalEmailHtml(studentName, requestId, certificateUrl) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1a3a5c, #2d6a9f); padding: 36px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px; }
    .body { padding: 40px; }
    .icon { text-align: center; font-size: 56px; margin-bottom: 20px; }
    .body h2 { color: #1a3a5c; font-size: 22px; margin: 0 0 16px; }
    .body p { color: #555; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
    .info-box { background: #f0f7ff; border-left: 4px solid #2d6a9f; border-radius: 4px; padding: 16px 20px; margin: 24px 0; }
    .info-box p { margin: 4px 0; color: #333; font-size: 14px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #1a3a5c, #2d6a9f); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: bold; margin: 16px 0; }
    .footer { background: #f4f6f9; padding: 20px 40px; text-align: center; }
    .footer p { color: #999; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>University of Cross River State</h1>
      <p>UNICROSS — Clearance Management System</p>
    </div>
    <div class="body">
      <div class="icon">✅</div>
      <h2>Clearance Approved!</h2>
      <p>Dear <strong>${studentName}</strong>,</p>
      <p>We are pleased to inform you that your clearance request has been <strong>reviewed and approved</strong> by the finance office.</p>
      <div class="info-box">
        <p><strong>Request ID:</strong> #${requestId}</p>
        <p><strong>Status:</strong> Approved ✅</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <p>Your official clearance certificate is attached to this email. You can also download it from the button below (link valid for 7 days) or from your student dashboard.</p>
      ${certificateUrl ? `<p style="text-align:center"><a class="btn" href="${certificateUrl}">⬇️ Download Certificate</a></p>` : ''}
      <p>Please keep this certificate safe as it may be required for academic or administrative processes.</p>
      <p>Congratulations and best wishes,<br><strong>UNICROSS Finance Office</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>© ${new Date().getFullYear()} University of Cross River State. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function rejectionEmailHtml(studentName, requestId, reason) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1a3a5c, #2d6a9f); padding: 36px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px; }
    .body { padding: 40px; }
    .icon { text-align: center; font-size: 56px; margin-bottom: 20px; }
    .body h2 { color: #c0392b; font-size: 22px; margin: 0 0 16px; }
    .body p { color: #555; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
    .reason-box { background: #fff5f5; border-left: 4px solid #e74c3c; border-radius: 4px; padding: 16px 20px; margin: 24px 0; }
    .reason-box p { margin: 4px 0; color: #333; font-size: 14px; }
    .info-box { background: #f0f7ff; border-left: 4px solid #2d6a9f; border-radius: 4px; padding: 16px 20px; margin: 24px 0; }
    .info-box p { margin: 4px 0; color: #333; font-size: 14px; }
    .footer { background: #f4f6f9; padding: 20px 40px; text-align: center; }
    .footer p { color: #999; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>University of Cross River State</h1>
      <p>UNICROSS — Clearance Management System</p>
    </div>
    <div class="body">
      <div class="icon">❌</div>
      <h2>Clearance Request Rejected</h2>
      <p>Dear <strong>${studentName}</strong>,</p>
      <p>Unfortunately, your clearance request has been <strong>reviewed and rejected</strong> by the finance office.</p>
      <div class="info-box">
        <p><strong>Request ID:</strong> #${requestId}</p>
        <p><strong>Status:</strong> Rejected ❌</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <div class="reason-box">
        <p><strong>Reason for Rejection:</strong></p>
        <p>${reason}</p>
      </div>
      <p>Please address the above reason and <strong>submit a new clearance request</strong> with the corrected information or a valid payment receipt.</p>
      <p>If you believe this is an error, please contact the finance office directly.</p>
      <p>Regards,<br><strong>UNICROSS Finance Office</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>© ${new Date().getFullYear()} University of Cross River State. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Send functions ─────────────────────────────────────────────

/**
 * Send approval email with optional certificate download link
 */
async function sendApprovalEmail(studentEmail, studentName, requestId, certificateUrl = null, certificatePath = null) {
  try {
    const t = await getTransporter();
    const mail = {
      from: fromAddress(),
      to: studentEmail,
      subject: `✅ Clearance Approved — Request #${requestId} | UNICROSS`,
      html: approvalEmailHtml(studentName, requestId, certificateUrl),
    };
    if (certificatePath) {
      mail.attachments = [{ filename: 'clearance-certificate.pdf', path: certificatePath }];
    }
    const info = await t.sendMail(mail);

    const previewUrl = usesEthereal ? nodemailer.getTestMessageUrl(info) : null;
    console.log(`✓ Approval email sent to ${studentEmail}`);
    if (previewUrl) console.log(`  Preview: ${previewUrl}`);
    return { success: true, previewUrl };
  } catch (err) {
    console.error('Email send error (approval):', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send rejection email with reason
 */
async function sendRejectionEmail(studentEmail, studentName, requestId, reason) {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: fromAddress(),
      to: studentEmail,
      subject: `❌ Clearance Request Update — Request #${requestId} | UNICROSS`,
      html: rejectionEmailHtml(studentName, requestId, reason),
    });

    const previewUrl = usesEthereal ? nodemailer.getTestMessageUrl(info) : null;
    console.log(`✓ Rejection email sent to ${studentEmail}`);
    if (previewUrl) console.log(`  Preview: ${previewUrl}`);
    return { success: true, previewUrl };
  } catch (err) {
    console.error('Email send error (rejection):', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendApprovalEmail, sendRejectionEmail };
