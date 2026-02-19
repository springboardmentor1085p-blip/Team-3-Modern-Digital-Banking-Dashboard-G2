from typing import Dict, Optional, Tuple, List
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
import logging
import requests
import json
from functools import lru_cache

from app.core.config import settings
from app.schemas.bill import CurrencyCode

logger = logging.getLogger(__name__)

class CurrencyService:
    def __init__(self):
        self.base_currency = CurrencyCode.USD
        self.cache_duration = timedelta(hours=1)  # Cache exchange rates for 1 hour
        self.exchange_rates: Dict[str, Dict] = {}
        self.last_update: Optional[datetime] = None
        
        # Fallback rates (updated periodically)
        self.fallback_rates = {
            CurrencyCode.EUR: Decimal('0.92'),
            CurrencyCode.GBP: Decimal('0.79'),
            CurrencyCode.JPY: Decimal('150.25'),
            CurrencyCode.CAD: Decimal('1.35'),
            CurrencyCode.AUD: Decimal('1.52'),
            CurrencyCode.INR: Decimal('83.10'),
            CurrencyCode.SGD: Decimal('1.34'),
            CurrencyCode.USD: Decimal('1.00')
        }
    
    def convert_currency(
        self, 
        amount: Decimal, 
        from_currency: CurrencyCode, 
        to_currency: CurrencyCode = CurrencyCode.USD
    ) -> Decimal:
        """
        Convert amount from one currency to another
        
        Args:
            amount: Amount to convert
            from_currency: Source currency code
            to_currency: Target currency code (default: USD)
        
        Returns:
            Converted amount as Decimal
        """
        try:
            # If same currency, no conversion needed
            if from_currency == to_currency:
                return amount
            
            # Get exchange rates
            rates = self._get_exchange_rates()
            
            # Convert to USD first (our base currency)
            if from_currency != self.base_currency:
                if from_currency.value not in rates:
                    logger.warning(f"Exchange rate not found for {from_currency}, using fallback")
                    usd_amount = amount / self.fallback_rates[from_currency]
                else:
                    usd_amount = amount / rates[from_currency.value]
            else:
                usd_amount = amount
            
            # Convert from USD to target currency
            if to_currency != self.base_currency:
                if to_currency.value not in rates:
                    logger.warning(f"Exchange rate not found for {to_currency}, using fallback")
                    converted_amount = usd_amount * self.fallback_rates[to_currency]
                else:
                    converted_amount = usd_amount * rates[to_currency.value]
            else:
                converted_amount = usd_amount
            
            # Round to 2 decimal places
            converted_amount = converted_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            logger.debug(
                f"Converted {amount} {from_currency} to {converted_amount} {to_currency}"
            )
            
            return converted_amount
            
        except Exception as e:
            logger.error(f"Currency conversion error: {str(e)}")
            # Fallback: use approximate conversion
            return self._fallback_conversion(amount, from_currency, to_currency)
    
    def _get_exchange_rates(self) -> Dict[str, Decimal]:
        """Get current exchange rates, using cache if available"""
        # Check if cache is still valid
        if (self.last_update and 
            datetime.now() - self.last_update < self.cache_duration and 
            self.exchange_rates):
            return self.exchange_rates
        
        try:
            # Try to get rates from external API
            rates = self._fetch_exchange_rates()
            
            if rates:
                self.exchange_rates = rates
                self.last_update = datetime.now()
                logger.info("Exchange rates updated successfully")
                return rates
            else:
                # Use fallback rates if API fails
                logger.warning("Using fallback exchange rates")
                return {code.value: rate for code, rate in self.fallback_rates.items()}
                
        except Exception as e:
            logger.error(f"Failed to fetch exchange rates: {str(e)}")
            # Return fallback rates
            return {code.value: rate for code, rate in self.fallback_rates.items()}
    
    def _fetch_exchange_rates(self) -> Optional[Dict[str, Decimal]]:
        """Fetch exchange rates from external API"""
        try:
            # Using ExchangeRate-API (free tier)
            api_key = settings.EXCHANGE_RATE_API_KEY
            if not api_key:
                logger.warning("No exchange rate API key configured")
                return None
            
            url = f"https://v6.exchangerate-api.com/v6/{api_key}/latest/USD"
            
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get("result") == "success":
                rates = data.get("conversion_rates", {})
                
                # Convert to Decimal and filter to supported currencies
                exchange_rates = {}
                for currency in CurrencyCode:
                    if currency.value in rates:
                        exchange_rates[currency.value] = Decimal(str(rates[currency.value]))
                
                return exchange_rates
            else:
                logger.error(f"Exchange rate API error: {data.get('error-type', 'Unknown')}")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error fetching exchange rates: {str(e)}")
            return None
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Error parsing exchange rate response: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching exchange rates: {str(e)}")
            return None
    
    def _fallback_conversion(
        self, 
        amount: Decimal, 
        from_currency: CurrencyCode, 
        to_currency: CurrencyCode
    ) -> Decimal:
        """Fallback conversion using hardcoded rates"""
        # Convert to USD first
        if from_currency in self.fallback_rates:
            usd_amount = amount / self.fallback_rates[from_currency]
        else:
            usd_amount = amount  # Assume it's USD if not in fallback
        
        # Convert from USD to target
        if to_currency in self.fallback_rates:
            converted_amount = usd_amount * self.fallback_rates[to_currency]
        else:
            converted_amount = usd_amount
        
        # Round to 2 decimal places
        return converted_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    @lru_cache(maxsize=128)
    def get_conversion_rate(self, from_currency: CurrencyCode, to_currency: CurrencyCode) -> Decimal:
        """Get conversion rate between two currencies (cached)"""
        if from_currency == to_currency:
            return Decimal('1.00')
        
        # Convert 1 unit of from_currency to to_currency
        one_unit = Decimal('1.00')
        converted = self.convert_currency(one_unit, from_currency, to_currency)
        
        return converted
    
    def format_currency(self, amount: Decimal, currency: CurrencyCode) -> str:
        """Format currency amount according to locale"""
        # Basic formatting based on currency
        if currency == CurrencyCode.USD:
            return f"${amount:,.2f}"
        elif currency == CurrencyCode.EUR:
            return f"€{amount:,.2f}"
        elif currency == CurrencyCode.GBP:
            return f"£{amount:,.2f}"
        elif currency == CurrencyCode.JPY:
            return f"¥{amount:,.0f}"  # JPY typically doesn't use decimals
        elif currency == CurrencyCode.INR:
            return f"₹{amount:,.2f}"
        else:
            return f"{amount:,.2f} {currency.value}"
    
    def get_supported_currencies(self) -> Dict[str, str]:
        """Get list of supported currencies with names"""
        currency_names = {
            CurrencyCode.USD: "US Dollar",
            CurrencyCode.EUR: "Euro",
            CurrencyCode.GBP: "British Pound",
            CurrencyCode.JPY: "Japanese Yen",
            CurrencyCode.CAD: "Canadian Dollar",
            CurrencyCode.AUD: "Australian Dollar",
            CurrencyCode.INR: "Indian Rupee",
            CurrencyCode.SGD: "Singapore Dollar"
        }
        
        return {code.value: name for code, name in currency_names.items()}
    
    def get_currency_symbol(self, currency: CurrencyCode) -> str:
        """Get currency symbol"""
        symbols = {
            CurrencyCode.USD: "$",
            CurrencyCode.EUR: "€",
            CurrencyCode.GBP: "£",
            CurrencyCode.JPY: "¥",
            CurrencyCode.CAD: "C$",
            CurrencyCode.AUD: "A$",
            CurrencyCode.INR: "₹",
            CurrencyCode.SGD: "S$"
        }
        
        return symbols.get(currency, currency.value)
    
    def batch_convert(
        self, 
        amounts: Dict[CurrencyCode, Decimal], 
        target_currency: CurrencyCode = CurrencyCode.USD
    ) -> Dict[CurrencyCode, Decimal]:
        """Convert multiple amounts to target currency"""
        results = {}
        
        for currency, amount in amounts.items():
            if amount:
                converted = self.convert_currency(amount, currency, target_currency)
                results[currency] = converted
        
        return results
    
    def get_currency_analytics(self, transactions: List[Dict]) -> Dict:
        """Analyze currency usage in transactions"""
        currency_totals = {}
        currency_counts = {}
        
        for transaction in transactions:
            currency = transaction.get('currency')
            amount = transaction.get('amount')
            
            if currency and amount:
                if currency not in currency_totals:
                    currency_totals[currency] = Decimal('0')
                    currency_counts[currency] = 0
                
                currency_totals[currency] += Decimal(str(amount))
                currency_counts[currency] += 1
        
        # Convert all totals to USD for comparison
        usd_totals = {}
        for currency_code, total in currency_totals.items():
            try:
                currency = CurrencyCode(currency_code)
                usd_amount = self.convert_currency(total, currency, CurrencyCode.USD)
                usd_totals[currency_code] = usd_amount
            except:
                # Skip invalid currency codes
                continue
        
        # Calculate percentages
        total_usd = sum(usd_totals.values())
        percentages = {}
        if total_usd > 0:
            for currency_code, usd_amount in usd_totals.items():
                percentages[currency_code] = (usd_amount / total_usd) * 100
        
        return {
            "by_currency": currency_totals,
            "in_usd": usd_totals,
            "counts": currency_counts,
            "percentages": percentages,
            "total_usd": total_usd,
            "primary_currency": max(usd_totals.items(), key=lambda x: x[1])[0] if usd_totals else None
        }

# Global instance
currency_service = CurrencyService()

# Convenience function for API use
def convert_currency(amount: Decimal, from_currency: CurrencyCode, to_currency: CurrencyCode) -> Decimal:
    """Convert currency (convenience wrapper)"""
    return currency_service.convert_currency(amount, from_currency, to_currency)