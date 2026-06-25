import json
from openai import OpenAI
from src.core.config import settings
from src.models import ScamAnalysisResult
import logging

logger = logging.getLogger(__name__)

class ScamDetector:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL

    async def analyze_message(self, text: str, platform: str) -> ScamAnalysisResult:
        if not settings.OPENAI_API_KEY:
            logger.warning("OpenAI API Key not set. Returning mock analysis.")
            return self._mock_analysis(text)

        system_prompt = """
        You are an expert AI Social Media Scam Detector. Your goal is to analyze messages from various social media platforms (WhatsApp, Telegram, Facebook, etc.) and identify potential scams, phishing attempts, social engineering tactics, or fraudulent investments.
        
        Analyze the provided text and provide a structured JSON response with the following fields:
        - is_scam: boolean
        - confidence_score: float (0.0 to 1.0)
        - scam_type: string (e.g., "Phishing", "Investment Fraud", "Romance Scam", "Job Scam", "Impersonation", "None")
        - reasoning: string (detailed explanation of why it is or isn't a scam)
        - risk_level: string ("Low", "Medium", "High", "Critical")
        - suggested_actions: list of strings (what the user should do)
        
        Be vigilant and look for common scam indicators like:
        - Urgent or threatening language
        - Requests for money or crypto
        - Suspicious links
        - Promises of unrealistic returns
        - Requests for personal information
        - Poor grammar or unusual phrasing
        """

        user_prompt = f"Platform: {platform}\nMessage: {text}"

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            result_data = json.loads(response.choices[0].message.content)
            return ScamAnalysisResult(**result_data)
        except Exception as e:
            logger.error(f"Error calling OpenAI: {e}")
            return self._error_analysis(str(e))

    def _mock_analysis(self, text: str) -> ScamAnalysisResult:
        # Simple rule-based mock for testing when API key is missing
        is_scam = any(word in text.lower() for word in ["crypto", "invest", "urgent", "win", "prize", "gift card"])
        return ScamAnalysisResult(
            is_scam=is_scam,
            confidence_score=0.8 if is_scam else 0.2,
            scam_type="Mock Analysis (API Key Missing)" if is_scam else "None",
            reasoning="This is a mock analysis because no OpenAI API key was provided.",
            risk_level="High" if is_scam else "Low",
            suggested_actions=["Verify the sender", "Do not click links"] if is_scam else ["Stay vigilant"]
        )

    def _error_analysis(self, error_msg: str) -> ScamAnalysisResult:
        return ScamAnalysisResult(
            is_scam=False,
            confidence_score=0.0,
            scam_type="Error",
            reasoning=f"An error occurred during analysis: {error_msg}",
            risk_level="Unknown",
            suggested_actions=["Try again later"]
        )

scam_detector = ScamDetector()
