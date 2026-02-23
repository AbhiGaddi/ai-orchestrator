import json
import re
from backend.agents.base_agent import BaseAgent, AgentResult
from backend.services.mailer_service import MailerService
from backend.services.gemini_service import GeminiService
from backend.core.logging import get_logger

logger = get_logger(__name__)

# --- EMAIL AGENT CONSTITUTION ---
SYSTEM_CONSTITUTION = """
<IDENTITY>
You are an Internal Communications and Privacy Officer. Your job is to summarize technical tasks for email notification while protecting PRIVACY.
</IDENTITY>

<PRIVACY_PROTOCOL>
Before generating the email body, you MUST:
1. PII CHECK: Ensure no customer names, emails, or phone numbers are in the body unless essential.
2. SECRET CHECK: Ensure NO API keys, internal IP addresses, or credentials are sent via email.
3. SANITIZATION: Replace sensitive details with generic placeholders if found.

Emails are often stored in unencrypted archives; security is paramount.
</PRIVACY_PROTOCOL>

<FORMATTING_GUIDELINES>
- Use clean HTML with inline styling.
- Keep the summary professional and concise.
</FORMATTING_GUIDELINES>

<OUTPUT_SCHEMA>
{{
  "privacy_scan": {{
    "sanitization_performed": bool,
    "confidence_rating": float (0-1)
  }},
  "email_subject": str,
  "email_html_body": str
}}
</OUTPUT_SCHEMA>
"""

USER_PROMPT = """
<TASK_DATA>
Title: {title}
Description: {description}
Deadline: {deadline}
Priority: {priority}
GitHub Link: {github_url}
</TASK_DATA>

Generate the sanitized email content in JSON format according to the <OUTPUT_SCHEMA>.
"""

class EmailAgent(BaseAgent):
    name = "EmailAgent"

    def __init__(self):
        self.mailer = MailerService()
        self.llm = GeminiService()

    async def run(self, context: dict) -> AgentResult:
        title = context.get("title", "Task")
        description = context.get("description", "")
        deadline = context.get("deadline", "Not specified")
        priority = context.get("priority", "MEDIUM")
        github_url = context.get("github_issue_url", "")

        # 1. Privacy Scan & Content Generation (Reasoning Step)
        prompt = f"{SYSTEM_CONSTITUTION}\n\n{USER_PROMPT.format(
            title=title,
            description=description,
            deadline=deadline,
            priority=priority,
            github_url=github_url
        )}"

        logger.info(f"[{self.name}] Performing privacy scan and generating email.")
        raw_response = await self.llm.complete(prompt)

        # Clean markdown formatting if present
        clean_response = raw_response
        match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if match:
            clean_response = match.group(0)

        try:
            data = json.loads(clean_response)
            privacy_info = data.get("privacy_scan", {})
            subject = data.get("email_subject", f"[AI Task] {title}")
            body = data.get("email_html_body", "")
            
            if privacy_info.get("sanitization_performed"):
                logger.info(f"[{self.name}] Privacy sanitization applied (Confidence: {privacy_info.get('confidence_rating')})")
        except Exception as e:
            logger.error(f"[{self.name}] Failed to parse email output: {e}")
            return AgentResult(success=False, error="Failed to verify privacy of email content")

        # 2. Action (Send Email)
        logger.info(f"[{self.name}] Sending email: {subject!r}")
        try:
            await self.mailer.send(subject=subject, body=body)
        except Exception as e:
            return AgentResult(success=False, error=str(e))

        logger.info(f"[{self.name}] Email sent successfully")
        return AgentResult(
            success=True,
            output={
                "email_sent": True, 
                "subject": subject,
                "privacy_scan_results": privacy_info
            },
        )
