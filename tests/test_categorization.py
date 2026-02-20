import pytest
from datetime import date
from unittest.mock import Mock, patch

from ..models.budget import CategoryRule
from ..schemas.categorization import (
    CategoryRuleCreate,
    PatternType,
    AutoCategorizeRequest
)
from ..services.categorization import CategorizationService


class TestCategorizationService:
    def test_create_rule(self, db_session, test_user):
        """Test creating a categorization rule"""
        service = CategorizationService(db_session)
        
        rule_data = CategoryRuleCreate(
            rule_name="Starbucks Rule",
            pattern_type=PatternType.CONTAINS,
            pattern="starbucks",
            category="Food & Dining",
            subcategory="Coffee",
            priority=5,
            is_active=True
        )
        
        rule = service.create_rule(test_user.id, rule_data)
        
        assert rule.id is not None
        assert rule.user_id == test_user.id
        assert rule.rule_name == "Starbucks Rule"
        assert rule.pattern == "starbucks"
        assert rule.category == "Food & Dining"
        assert rule.subcategory == "Coffee"
        assert rule.priority == 5
    
    def test_match_rule_contains(self, db_session):
        """Test matching rules with CONTAINS pattern type"""
        service = CategorizationService(db_session)
        
        rule = Mock(spec=CategoryRule)
        rule.pattern_type = PatternType.CONTAINS
        rule.pattern = "amazon"
        
        # Test positive match
        assert service.match_rule("AMAZON PURCHASE", rule) is True
        assert service.match_rule("Purchase from Amazon.com", rule) is True
        
        # Test negative match
        assert service.match_rule("Grocery Store", rule) is False
    
    def test_match_rule_exact(self, db_session):
        """Test matching rules with EXACT pattern type"""
        service = CategorizationService(db_session)
        
        rule = Mock(spec=CategoryRule)
        rule.pattern_type = PatternType.EXACT
        rule.pattern = "netflix"
        
        # Test exact match (case insensitive)
        assert service.match_rule("NETFLIX", rule) is True
        assert service.match_rule("netflix", rule) is True
        
        # Test non-exact match
        assert service.match_rule("NETFLIX SUBSCRIPTION", rule) is False
    
    def test_match_rule_regex(self, db_session):
        """Test matching rules with REGEX pattern type"""
        service = CategorizationService(db_session)
        
        rule = Mock(spec=CategoryRule)
        rule.pattern_type = PatternType.REGEX
        rule.pattern = r"uber\s*(?:ride|eats|pool)?"
        
        # Test regex matches
        assert service.match_rule("UBER RIDE", rule) is True
        assert service.match_rule("Uber Eats Delivery", rule) is True
        assert service.match_rule("UberPool", rule) is True
        
        # Test non-match
        assert service.match_rule("Taxi Ride", rule) is False
    
    def test_categorize_transaction(self, db_session, test_user, test_transaction):
        """Test categorizing a transaction with rules"""
        service = CategorizationService(db_session)
        
        # Create a rule
        rule_data = CategoryRuleCreate(
            rule_name="Test Rule",
            pattern_type=PatternType.CONTAINS,
            pattern="test",
            category="Test Category",
            subcategory="Test Subcategory",
            priority=1
        )
        
        rule = service.create_rule(test_user.id, rule_data)
        rules = [rule]
        
        # Set transaction description to match rule
        test_transaction.description = "Test Transaction"
        test_transaction.category = None
        db_session.commit()
        
        # Categorize the transaction
        result = service.categorize_transaction(test_transaction, rules)
        
        assert result is True
        assert test_transaction.category == "Test Category"
        assert test_transaction.subcategory == "Test Subcategory"
    
    def test_categorize_transactions_batch(self, db_session, test_user, test_transactions):
        """Test batch categorization of transactions"""
        service = CategorizationService(db_session)
        
        # Create a rule
        rule_data = CategoryRuleCreate(
            rule_name="Amazon Rule",
            pattern_type=PatternType.CONTAINS,
            pattern="amazon",
            category="Shopping",
            subcategory="Online",
            priority=1
        )
        
        service.create_rule(test_user.id, rule_data)
        
        # Update some transactions to match the rule
        transaction_ids = []
        for i, transaction in enumerate(test_transactions[:3]):
            transaction.description = f"Amazon Purchase {i}"
            transaction.category = None
            transaction_ids.append(transaction.id)
        
        db_session.commit()
        
        # Categorize transactions
        result = service.categorize_transactions(test_user.id, transaction_ids)
        
        assert result["categorized_count"] == 3
        assert result["uncategorized_count"] == 0
        assert len(result["details"]) == 3
    
    def test_auto_categorize_all(self, db_session, test_user, test_transactions):
        """Test auto-categorizing all uncategorized transactions"""
        service = CategorizationService(db_session)
        
        # Create multiple rules
        rules = [
            CategoryRuleCreate(
                rule_name="Food Rule",
                pattern_type=PatternType.CONTAINS,
                pattern="mcdonald",
                category="Food",
                subcategory="Fast Food"
            ),
            CategoryRuleCreate(
                rule_name="Gas Rule",
                pattern_type=PatternType.CONTAINS,
                pattern="shell",
                category="Transportation",
                subcategory="Fuel"
            )
        ]
        
        for rule_data in rules:
            service.create_rule(test_user.id, rule_data)
        
        # Make some transactions match the rules
        for i, transaction in enumerate(test_transactions[:4]):
            if i % 2 == 0:
                transaction.description = f"MCDONALD'S #{i}"
            else:
                transaction.description = f"SHELL GAS STATION #{i}"
            transaction.category = None
        
        db_session.commit()
        
        # Auto-categorize
        result = service.auto_categorize_all(test_user.id)
        
        assert result["categorized_count"] == 4
        assert "details" in result
    
    def test_get_category_suggestions(self, db_session, test_user):
        """Test getting category suggestions for a description"""
        service = CategorizationService(db_session)
        
        # Create multiple rules that could match
        rules = [
            CategoryRuleCreate(
                rule_name="Starbucks Exact",
                pattern_type=PatternType.EXACT,
                pattern="starbucks",
                category="Food",
                subcategory="Coffee",
                priority=10
            ),
            CategoryRuleCreate(
                rule_name="Coffee Contains",
                pattern_type=PatternType.CONTAINS,
                pattern="coffee",
                category="Food",
                subcategory="Beverages",
                priority=5
            )
        ]
        
        for rule_data in rules:
            service.create_rule(test_user.id, rule_data)
        
        # Get suggestions
        suggestions = service.get_category_suggestions(
            test_user.id,
            "STARBUCKS COFFEE"
        )
        
        assert len(suggestions) > 0
        assert suggestions[0].category == "Food"
        assert suggestions[0].confidence > 0
    
    def test_get_category_statistics(self, db_session, test_user, test_transactions):
        """Test getting category statistics"""
        service = CategorizationService(db_session)
        
        # Categorize some transactions
        for i, transaction in enumerate(test_transactions[:5]):
            transaction.category = "Food"
            transaction.subcategory = "Groceries" if i % 2 == 0 else "Restaurants"
        
        db_session.commit()
        
        # Get statistics
        stats = service.get_category_statistics(test_user.id)
        
        assert "period" in stats
        assert "total_categories" in stats
        assert "total_spent" in stats
        assert "statistics" in stats
        
        if stats["statistics"]:
            stat = stats["statistics"][0]
            assert "category" in stat
            assert "total_amount" in stat
            assert "transaction_count" in stat
            assert "percentage_of_total" in stat
    
    def test_delete_rule(self, db_session, test_user):
        """Test deleting a categorization rule"""
        service = CategorizationService(db_session)
        
        # Create a rule
        rule_data = CategoryRuleCreate(
            rule_name="Test Rule",
            pattern_type=PatternType.CONTAINS,
            pattern="test",
            category="Test",
            subcategory=None
        )
        
        rule = service.create_rule(test_user.id, rule_data)
        
        # Delete the rule
        result = service.delete_rule(test_user.id, rule.id)
        
        assert result is True
        
        # Verify rule is deleted
        rules = service.get_user_rules(test_user.id)
        rule_ids = [r.id for r in rules]
        assert rule.id not in rule_ids


class TestCategorizationValidations:
    def test_invalid_regex_pattern(self):
        """Test that invalid regex patterns are rejected"""
        with pytest.raises(ValueError):
            CategoryRuleCreate(
                rule_name="Invalid Regex",
                pattern_type=PatternType.REGEX,
                pattern="[invalid",  # Invalid regex
                category="Test",
                subcategory=None
            )
    
    def test_end_date_after_start_date(self):
        """Test that end date must be after start date"""
        with pytest.raises(ValueError):
            AutoCategorizeRequest(
                start_date=date(2024, 1, 15),
                end_date=date(2024, 1, 10)  # Earlier than start
            )