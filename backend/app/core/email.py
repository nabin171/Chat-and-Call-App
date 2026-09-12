import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings


def mail_configured() -> bool:
    """True when Brevo SMTP credentials are present."""
    return bool(settings.smtp_user and settings.smtp_password and settings.mail_from)


def send_email(to: str, subject: str, text_body: str, html_body: str | None = None) -> None:
    """
    Send one message through the Brevo SMTP relay.

    Runs in a background task, so it must never raise into the request path -
    a mail outage should not turn a successful password reset into a 500.
    """
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{settings.mail_from_name} <{settings.mail_from}>"
    msg["To"] = to
    msg.set_content(text_body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
            server.starttls(context=ssl.create_default_context())
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        print(f"[EMAIL SENT] {subject} -> {to}")
    except Exception as exc:
        # Log loudly and move on. The user already got their 200.
        print(f"[EMAIL FAILED] {to}: {type(exc).__name__}: {exc}")


def send_password_reset_email(to: str, reset_link: str, ttl_minutes: int) -> None:
    subject = "Reset your Chat & Call password"

    text_body = (
        "You asked to reset your Chat & Call password.\n\n"
        f"Open this link to choose a new one:\n{reset_link}\n\n"
        f"The link works once and expires in {ttl_minutes} minutes.\n"
        "If you did not request this, you can ignore this email - "
        "your password has not changed.\n"
    )

    html_body = f"""\
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f7;
               font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
           style="max-width:480px;margin:0 auto;background:#ffffff;
                  border-radius:12px;padding:32px;">
      <tr><td>
        <h1 style="margin:0 0 12px;font-size:20px;color:#111827;">
          Reset your password
        </h1>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#4b5563;">
          You asked to reset your Chat &amp; Call password. Click the button below
          to choose a new one.
        </p>
        <a href="{reset_link}"
           style="display:inline-block;background:#6366f1;color:#ffffff;
                  text-decoration:none;font-size:14px;font-weight:600;
                  padding:12px 22px;border-radius:10px;">
          Set a new password
        </a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
          This link works once and expires in {ttl_minutes} minutes.
        </p>
        <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
          Didn't request this? You can ignore this email - your password has not
          changed.
        </p>
        <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;word-break:break-all;">
          Button not working? Paste this into your browser:<br />{reset_link}
        </p>
      </td></tr>
    </table>
  </body>
</html>
"""

    send_email(to, subject, text_body, html_body)
