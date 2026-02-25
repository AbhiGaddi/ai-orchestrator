import httpx
from backend.services.interfaces import NotificationProvider
from backend.config import get_settings

settings = get_settings()

class DiscordNotificationProvider(NotificationProvider):
    """Sends notifications to a Discord channel via Webhook"""
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or getattr(settings, "DISCORD_WEBHOOK_URL", None)

    async def send_message(self, target: str, subject: str, body: str) -> bool:
        if not self.webhook_url:
            return False
            
        payload = {
            "content": f"**{subject}**\n{body}"
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(self.webhook_url, json=payload)
            return resp.status_code in (200, 204)

class EmailNotificationProvider(NotificationProvider):
    """SMTP Implementation"""
    async def send_message(self, target: str, subject: str, body: str) -> bool:
        # Implement standard aiosmtplib logic here
        pass
