"""AI Chatbot Service using Groq"""
import re
from typing import List, Dict, Any, Optional
from groq import Groq
from config import settings
from utils.logger import logger


class AIService:
    """Service for AI-powered trading advisor"""

    def __init__(self):
        self.client = Groq(api_key=settings.groq_api_key)
        self.model = "llama-3.3-70b-versatile"

        # Company name to symbol mapping
        self.company_map = {
            'apple': 'AAPL', 'microsoft': 'MSFT', 'google': 'GOOGL', 'alphabet': 'GOOGL',
            'amazon': 'AMZN', 'meta': 'META', 'facebook': 'META', 'tesla': 'TSLA',
            'nvidia': 'NVDA', 'amd': 'AMD', 'netflix': 'NFLX', 'disney': 'DIS',
            'paypal': 'PYPL', 'intel': 'INTC', 'cisco': 'CSCO', 'adobe': 'ADBE',
            'salesforce': 'CRM', 'oracle': 'ORCL', 'ibm': 'IBM', 'sp500': 'SPY',
            's&p 500': 'SPY', 's&p500': 'SPY', 'dow': 'DIA', 'nasdaq': 'QQQ'
        }

    def extract_stock_symbols(self, message: str) -> List[str]:
        """Extract stock symbols from user message"""
        symbols = []
        lower_message = message.lower()

        # Check for company names
        for company, symbol in self.company_map.items():
            if company in lower_message:
                symbols.append(symbol)

        # Check for uppercase symbols (e.g., AAPL, MSFT)
        symbol_pattern = r'\b[A-Z]{1,5}\b'
        matches = re.findall(symbol_pattern, message)
        symbols.extend(matches)

        # Remove duplicates
        return list(set(symbols))

    def generate_portfolio_context(self, portfolio: List[Dict[str, Any]]) -> str:
        """Generate portfolio summary for context"""
        if not portfolio:
            return 'The user has no holdings in their portfolio yet.'

        total_value = sum(stock['price'] * stock['quantity'] for stock in portfolio)

        holdings = []
        for stock in portfolio:
            position_value = stock['price'] * stock['quantity']
            allocation = (position_value / total_value) * 100 if total_value > 0 else 0
            holdings.append(
                f"{stock['symbol']}: {stock['quantity']} shares @ ${stock['price']:.2f} "
                f"({allocation:.1f}% of portfolio)"
            )

        return f"Portfolio Summary:\n" + "\n".join(holdings) + f"\nTotal Portfolio Value: ${total_value:.2f}"

    def build_system_prompt(
        self,
        portfolio_context: str,
        ml_predictions: Optional[Dict[str, Any]] = None,
        selected_stock: Optional[str] = None
    ) -> str:
        """Build system prompt with context"""
        prompt = f"""You are an expert financial advisor and trading assistant for QuantPilot, a professional stock analysis platform.

Your role:
- Provide clear, actionable investment advice
- Analyze portfolio allocations and risk
- Explain technical indicators and market trends
- Help users make informed trading decisions

Current Context:
{portfolio_context}
"""

        if selected_stock:
            prompt += f"\nCurrently viewing: {selected_stock}"

        if ml_predictions:
            pred_data = ml_predictions.get('predictions', {})
            next_day = pred_data.get('nextDay', {})
            next_week = pred_data.get('nextWeek', {})

            if next_day:
                prompt += f"""

ML Predictions for {ml_predictions.get('symbol', 'stock')}:
- Current Price: ${pred_data.get('currentPrice', 0):.2f}
- Next Day: ${next_day.get('predictedPrice', 0):.2f} ({next_day.get('predictedReturn', 0):.1f}%)
- Next Week: ${next_week.get('predictedPrice', 0):.2f} ({next_week.get('predictedReturn', 0):.1f}%)
- Recommendation: {pred_data.get('recommendation', 'N/A')}
- Analysis: {pred_data.get('analysis', 'N/A')}
"""

        prompt += """

Guidelines:
- Be concise and practical
- Cite specific data when making recommendations
- Acknowledge market risks and uncertainties
- Suggest diversification when appropriate
- Never guarantee returns or outcomes
"""

        return prompt

    async def generate_response(
        self,
        message: str,
        portfolio: List[Dict[str, Any]],
        selected_stock: Optional[str] = None,
        conversation_history: List[Dict[str, str]] = None,
        ml_predictions: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate AI chatbot response

        Args:
            message: User's message
            portfolio: User's portfolio holdings
            selected_stock: Currently selected stock symbol
            conversation_history: Previous conversation messages
            ml_predictions: ML prediction data if available

        Returns:
            AI-generated response
        """
        try:
            logger.info("Generating AI chat response")

            # Build context
            portfolio_context = self.generate_portfolio_context(portfolio)
            system_prompt = self.build_system_prompt(
                portfolio_context,
                ml_predictions,
                selected_stock
            )

            # Build conversation messages
            messages = [{"role": "system", "content": system_prompt}]

            # Add conversation history (last 10 messages)
            if conversation_history:
                for msg in conversation_history[-10:]:
                    messages.append({
                        "role": msg.get('role', 'user'),
                        "content": msg.get('content', '')
                    })

            # Add current message
            messages.append({"role": "user", "content": message})

            # Call Groq API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1500
            )

            ai_response = response.choices[0].message.content

            logger.info("AI chat response generated successfully")
            return ai_response

        except Exception as e:
            logger.error("Error generating AI response", e)
            return "I apologize, but I'm having trouble processing your request right now. Please try again."
