import { Resend } from "resend";
import fs from "fs";
import path from "path";

export interface ContactNotificationData {
  ticketId: string;
  name: string;
  email: string;
  category: string;
  rating?: number | null;
  message: string;
  clientIp?: string;
  submittedAt: string;
  utmData?: Record<string, unknown> | null;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

/**
 * Renders star rating for HTML emails (e.g. ★★★★☆ 4/5 Stars)
 */
function formatStarRatingHtml(rating?: number | null): string {
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return `<span style="color: #888888; font-size: 12px; font-style: italic;">Not specified</span>`;
  }
  const filled = "★".repeat(rating);
  const empty = "☆".repeat(5 - rating);
  return `
    <span style="color: #FFB800; font-size: 15px; letter-spacing: 2px;">${filled}</span><span style="color: #444444; font-size: 15px; letter-spacing: 2px;">${empty}</span>
    <span style="color: #E5E5E5; font-size: 12px; font-weight: 600; margin-left: 8px;">${rating} / 5</span>
  `.trim();
}

/**
 * Generates an executive dark-themed HTML template for MockMate AI notifications
 */
function generateFeedbackEmailHtml(data: ContactNotificationData): string {
  const ratingHtml = formatStarRatingHtml(data.rating);
  const utmRows = data.utmData && Object.keys(data.utmData).length > 0
    ? Object.entries(data.utmData)
        .map(
          ([k, v]) =>
            `<tr><td style="padding: 4px 8px; color: #888888; font-size: 12px;">${k}</td><td style="padding: 4px 8px; color: #F5F5F5; font-size: 12px; font-family: monospace;">${String(
              v
            )}</td></tr>`
        )
        .join("")
    : "<tr><td colspan='2' style='padding: 6px 10px; color: #666666; font-size: 12px;'>Direct / Organic Visit</td></tr>";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>[MockMate AI] New Feedback Received [${data.ticketId}]</title>
</head>
<body style="background-color: #0c0c0c; color: #F5F5F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #141414; border: 1px solid #262626; border-radius: 16px; overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="padding: 24px 32px; background: linear-gradient(135deg, #181818 0%, #111111 100%); border-bottom: 1px solid #262626;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <span style="font-size: 20px; font-weight: 800; color: #F5F5F5; letter-spacing: -0.5px;">MockMate<span style="color: #FF4D3D;">.AI</span></span>
              <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">User Feedback & Contact Dispatch</div>
            </td>
            <td align="right">
              <span style="background-color: rgba(255, 77, 61, 0.15); border: 1px solid rgba(255, 77, 61, 0.3); color: #FF4D3D; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; font-family: monospace;">
                ${data.ticketId}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- User & Feedback Details Table -->
    <tr>
      <td style="padding: 24px 32px 12px 32px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1a1a1a; border: 1px solid #262626; border-radius: 12px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #262626; width: 35%; color: #888888; font-size: 12px;">Submitter Name</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #262626; color: #FFFFFF; font-size: 13px; font-weight: 600;">${data.name}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #262626; color: #888888; font-size: 12px;">Submitter Email</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #262626; color: #FF4D3D; font-size: 13px; font-family: monospace;">
              <a href="mailto:${data.email}" style="color: #FF4D3D; text-decoration: none;">${data.email}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #262626; color: #888888; font-size: 12px;">Category</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #262626; color: #E5E5E5; font-size: 13px;">${data.category}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #262626; color: #888888; font-size: 12px;">Rating</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #262626; color: #E5E5E5; font-size: 13px;">${ratingHtml}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #888888; font-size: 12px;">Submission Time</td>
            <td style="padding: 12px 16px; color: #A0A0A0; font-size: 12px; font-family: monospace;">${data.submittedAt}</td>
          </tr>
        </table>

        <!-- Feedback Message Box -->
        <div style="font-size: 12px; font-weight: 700; color: #A0A0A0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Feedback Message</div>
        <div style="background-color: #0e0e0e; border: 1px solid #262626; border-left: 3px solid #FF4D3D; border-radius: 8px; padding: 16px; color: #F0F0F0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${data.message}</div>
      </td>
    </tr>

    <!-- Reply-To Callout -->
    <tr>
      <td style="padding: 8px 32px 12px 32px;">
        <div style="background-color: rgba(255, 77, 61, 0.08); border: 1px solid rgba(255, 77, 61, 0.2); border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #E0E0E0;">
          💡 <strong>Tip:</strong> Click <em>Reply</em> in Gmail to respond directly to <strong>${data.name}</strong> (<span style="color: #FF4D3D; font-family: monospace;">${data.email}</span>).
        </div>
      </td>
    </tr>

    <!-- Telemetry & Attribution -->
    <tr>
      <td style="padding: 12px 32px 24px 32px;">
        <div style="font-size: 11px; font-weight: 700; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Telemetry & Context</div>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #121212; border: 1px solid #222222; border-radius: 8px;">
          ${utmRows}
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 16px 32px; background-color: #0f0f0f; border-top: 1px solid #222222; text-align: center; font-size: 11px; color: #555555;">
        Automated Dispatcher &bull; Powered by Resend on MockMate AI
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generates a clean plain-text fallback for email clients without HTML support
 */
function generateFeedbackEmailText(data: ContactNotificationData): string {
  const ratingText = typeof data.rating === "number" ? `${data.rating}/5 Stars` : "Not specified";
  return `
[MockMate AI] New Feedback Received
Ticket: ${data.ticketId}
Date/Time: ${data.submittedAt}

Submitter Details:
- Name: ${data.name}
- Email: ${data.email}
- Category: ${data.category}
- Rating: ${ratingText}
- Client IP: ${data.clientIp || "127.0.0.1"}

Feedback Message:
${data.message}

Reply-To Note:
Replying to this email will deliver directly to ${data.name} <${data.email}>.
`.trim();
}

/**
 * Sends a notification email via Resend when a user submits feedback.
 * - Uses RESEND_API_KEY
 * - Recipient: FEEDBACK_TO_EMAIL (e.g. dragon768.901@gmail.com)
 * - Sender: FEEDBACK_FROM_EMAIL (e.g. MockMate AI <onboarding@resend.dev> or custom verified domain)
 * - Reply-To: Submitter's validated email address (so replying in Gmail replies directly to user)
 */
export async function sendFeedbackEmailNotification(
  data: ContactNotificationData
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO_EMAIL || "dragon768.901@gmail.com";
  const from = process.env.FEEDBACK_FROM_EMAIL || "MockMate AI <onboarding@resend.dev>";
  const ratingSummary = typeof data.rating === "number" ? ` (${data.rating}★)` : "";
  const emailSubject = `[MockMate AI] New Feedback Received: ${data.category}${ratingSummary} [${data.ticketId}]`;
  const emailHtml = generateFeedbackEmailHtml(data);
  const emailText = generateFeedbackEmailText(data);

  // If RESEND_API_KEY is configured, dispatch through Resend
  if (apiKey && apiKey.trim() && !apiKey.includes("your_resend_api_key_here")) {
    try {
      const resend = new Resend(apiKey.trim());

      const response = await resend.emails.send({
        from,
        to: [to],
        replyTo: data.email,
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
      });

      if (response.error) {
        console.error("[Resend Error]:", response.error.message);
        return {
          success: false,
          error: response.error.message,
        };
      }

      if (response.data && response.data.id) {
        return {
          success: true,
          messageId: response.data.id,
          simulated: false,
        };
      }

      return {
        success: true,
        messageId: "resend-accepted",
        simulated: false,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to dispatch email via Resend";
      console.error("[EmailService] Resend exception:", errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  // Development Fallback (when RESEND_API_KEY is not configured):
  // Persist notification log into data/email_notifications.jsonl so data is never silently dropped
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const logPath = path.join(dataDir, "email_notifications.jsonl");
    const logRecord = {
      ticketId: data.ticketId,
      recipient: to,
      subject: emailSubject,
      from,
      replyTo: data.email,
      submittedAt: data.submittedAt,
      name: data.name,
      email: data.email,
      category: data.category,
      rating: data.rating ?? null,
      message: data.message,
      simulated: true,
      deliveredAt: new Date().toISOString(),
    };
    fs.appendFileSync(logPath, JSON.stringify(logRecord) + "\n", "utf8");
    console.info(`[EmailService] Notification logged locally for ticket ${data.ticketId} -> ${to}`);
  } catch (err) {
    console.error("[EmailService] Local log error:", err);
  }

  return {
    success: true,
    messageId: `sim-${data.ticketId}`,
    simulated: true,
  };
}
