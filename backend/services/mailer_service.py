"""
MailerService — SMTP email sender.
Uses Gmail SMTP with TLS. EmailAgent uses this service.
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from backend.config import get_settings
from backend.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class MailerService:
    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.target_email = settings.TARGET_EMAIL

    async def send(self, subject: str, body: str, is_html: bool = True) -> None:
        """
        Send an email to the configured TARGET_EMAIL.
        Phase 1: single hardcoded recipient.
        Phase 2+: extend signature to accept recipients list.
        """
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.user
        msg["To"] = self.target_email

        content_type = "html" if is_html else "plain"
        msg.attach(MIMEText(body, content_type))

        logger.info(f"[MailerService] Sending email to={self.target_email} subject={subject!r}")
        try:
            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                server.login(self.user, self.password)
                server.sendmail(self.user, self.target_email, msg.as_string())
            logger.info("[MailerService] Email sent successfully")
        except Exception as e:
            logger.error(f"[MailerService] Failed to send email: {e}")
            raise
