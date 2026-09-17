package com.stagepfa.demo.services;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@acme.tn}")
    private String fromAddress;

    @Value("${app.mail.enabled:true}")
    private boolean mailEnabled;

    public void sendLeaveNotification(
            String toEmail,
            String recipientName,
            String subject,
            String eventTitle,
            String employeeName,
            String leaveType,
            String startDate,
            String endDate,
            double durationDays,
            String status,
            String comment
    ) {
        if (!mailEnabled) {
            log.info("Mail sending is disabled by configuration. Skipping notification to: {}", toEmail);
            return;
        }

        if (toEmail == null || toEmail.isBlank()) {
            log.warn("Recipient email is missing. Skipping email notification: {}", subject);
            return;
        }

        String htmlContent = buildHtmlTemplate(
                recipientName,
                eventTitle,
                employeeName,
                leaveType,
                startDate,
                endDate,
                durationDays,
                status,
                comment
        );

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        if (!mailEnabled) {
            log.info("Mail sending is disabled. Skipping email to {}: {}", to, subject);
            return;
        }

        if (to == null || to.isBlank()) {
            log.warn("Cannot send email: recipient address is null or empty.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Successfully dispatched email to {} with subject '{}'", to, subject);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage(), e);
            // Intentionally catch and suppress so business transactions never fail
        }
    }

    private String buildHtmlTemplate(
            String recipientName,
            String eventTitle,
            String employeeName,
            String leaveType,
            String startDate,
            String endDate,
            double durationDays,
            String status,
            String comment
    ) {
        String statusColor = switch (status.toUpperCase()) {
            case "APPROVED" -> "#059669";
            case "REJECTED" -> "#dc2626";
            case "PENDING" -> "#2563eb";
            case "CANCELLED" -> "#64748b";
            default -> "#475569";
        };

        String commentRow = (comment != null && !comment.isBlank())
                ? "<tr><td style=\"padding: 8px 12px; font-weight: bold; color: #475569;\">Note / Comment:</td>"
                + "<td style=\"padding: 8px 12px; color: #0f172a;\">" + escapeHtml(comment) + "</td></tr>"
                : "";

        return """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <title>Leave Management Notification</title>
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
                  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <!-- Header -->
                    <div style="background: #0f172a; padding: 20px 24px; color: #ffffff;">
                      <h2 style="margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.01em;">Platana Leave & Workforce</h2>
                    </div>
                    <!-- Body -->
                    <div style="padding: 24px;">
                      <p style="font-size: 15px; margin-top: 0; color: #334155;">Hello <strong>%s</strong>,</p>
                      <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">%s</p>
                      
                      <!-- Details Box -->
                      <table style="width: 100%%; border-collapse: collapse; font-size: 13px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                        <tbody>
                          <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 8px 12px; font-weight: bold; color: #475569; width: 35%%;">Employee:</td>
                            <td style="padding: 8px 12px; color: #0f172a;">%s</td>
                          </tr>
                          <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 8px 12px; font-weight: bold; color: #475569;">Leave Type:</td>
                            <td style="padding: 8px 12px; color: #0f172a;">%s</td>
                          </tr>
                          <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 8px 12px; font-weight: bold; color: #475569;">Period:</td>
                            <td style="padding: 8px 12px; color: #0f172a;">%s &rarr; %s</td>
                          </tr>
                          <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 8px 12px; font-weight: bold; color: #475569;">Duration:</td>
                            <td style="padding: 8px 12px; color: #0f172a;">%.1f day(s)</td>
                          </tr>
                          <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 8px 12px; font-weight: bold; color: #475569;">Status:</td>
                            <td style="padding: 8px 12px;">
                              <span style="display: inline-block; background-color: %s; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">
                                %s
                              </span>
                            </td>
                          </tr>
                          %s
                        </tbody>
                      </table>

                      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                        This is an automated notification from the Platana Leave Management system. Please log in to your dashboard to review or take action.
                      </p>
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(
                escapeHtml(recipientName != null ? recipientName : "there"),
                escapeHtml(eventTitle),
                escapeHtml(employeeName),
                escapeHtml(leaveType),
                escapeHtml(startDate),
                escapeHtml(endDate),
                durationDays,
                statusColor,
                escapeHtml(status),
                commentRow
        );
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
