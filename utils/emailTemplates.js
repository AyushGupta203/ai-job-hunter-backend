export const getVerificationEmailTemplate = (name, link) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your Email - AI Job Hunter</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f6fa; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580px" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; width: 100%; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);">
          <!-- Header Banner with smooth gradient -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 40px 20px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">🤖 AI Job Hunter</h1>
              <p style="color: rgba(255, 255, 255, 0.85); margin: 8px 0 0 0; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Land your dream job</p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 22px; font-weight: 700; text-align: center;">Welcome, ${name}!</h2>
              <p style="color: #475569; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; text-align: center;">
                We are excited to help you automate your job search. Please verify your email address to unlock AI resume reviews, smart suggestions, and start applying to matched opportunities.
              </p>
              
              <!-- Call to Action -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${link}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); transition: all 0.2s ease;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; text-align: center;">
                This link will expire in <strong>1 hour</strong>. If you did not create a Job Hunter account, you can safely ignore this email.
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

              <!-- Troubleshooting -->
              <p style="color: #94a3b8; margin: 0; font-size: 12px; line-height: 1.5; text-align: center;">
                If you're having trouble clicking the button, copy and paste this link into your browser:<br>
                <a href="${link}" target="_blank" style="color: #2563eb; text-decoration: none; word-break: break-all;">${link}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f8fafc; padding: 24px 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; margin: 0; font-size: 12px; font-weight: 500;">&copy; 2026 AI Job Hunter. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};
