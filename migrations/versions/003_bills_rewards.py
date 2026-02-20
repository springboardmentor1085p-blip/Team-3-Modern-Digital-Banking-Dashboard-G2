"""Bills and rewards schema migration

Revision ID: 003_bills_rewards
Revises: 002_budget_categories
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_bills_rewards'
down_revision = '002_budget_categories'
branch_labels = None
depends_on = None

def upgrade():
    # Create enum types for Milestone 3
    op.execute("CREATE TYPE billfrequency AS ENUM ('monthly', 'quarterly', 'biannually', 'annually', 'one_time')")
    op.execute("CREATE TYPE currencycode AS ENUM ('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR', 'SGD')")
    op.execute("CREATE TYPE rewardtier AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond')")
    
    # Create bills table
    op.create_table('bills',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', sa.Enum('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR', 'SGD', name='currencycode'), nullable=False, server_default='USD'),
        sa.Column('amount_usd', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('is_paid', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('paid_date', sa.Date(), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('frequency', sa.Enum('monthly', 'quarterly', 'biannually', 'annually', 'one_time', name='billfrequency'), nullable=False, server_default='monthly'),
        sa.Column('reminder_days', sa.Integer(), nullable=False, server_default=sa.text('3')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for bills table
    op.create_index('idx_bills_user_id', 'bills', ['user_id'])
    op.create_index('idx_bills_due_date', 'bills', ['due_date'])
    op.create_index('idx_bills_is_paid', 'bills', ['is_paid'])
    op.create_index('idx_bills_category', 'bills', ['category'])
    
    # Create rewards table
    op.create_table('rewards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('bill_id', sa.Integer(), nullable=True),
        sa.Column('points', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('bill_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('on_time_payment', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('earned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['bill_id'], ['bills.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for rewards table
    op.create_index('idx_rewards_user_id', 'rewards', ['user_id'])
    op.create_index('idx_rewards_bill_id', 'rewards', ['bill_id'])
    op.create_index('idx_rewards_earned_at', 'rewards', ['earned_at'])
    
    # Add reward-related columns to users table
    op.add_column('users', sa.Column('points', sa.Integer(), nullable=False, server_default=sa.text('0')))
    op.add_column('users', sa.Column('current_tier', sa.Enum('bronze', 'silver', 'gold', 'platinum', 'diamond', name='rewardtier'), nullable=True))
    op.add_column('users', sa.Column('streak_days', sa.Integer(), nullable=False, server_default=sa.text('0')))
    op.add_column('users', sa.Column('last_bill_paid_date', sa.Date(), nullable=True))
    
    # Create indexes for users points
    op.create_index('idx_users_points', 'users', ['points'])
    
    # Create notifications table for bill reminders
    op.create_table('notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('bill_id', sa.Integer(), nullable=True),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['bill_id'], ['bills.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for notifications
    op.create_index('idx_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('idx_notifications_is_read', 'notifications', ['is_read'])

def downgrade():
    # Drop notifications table
    op.drop_index('idx_notifications_is_read', table_name='notifications')
    op.drop_index('idx_notifications_user_id', table_name='notifications')
    op.drop_table('notifications')
    
    # Drop columns from users table
    op.drop_index('idx_users_points', table_name='users')
    op.drop_column('users', 'last_bill_paid_date')
    op.drop_column('users', 'streak_days')
    op.drop_column('users', 'current_tier')
    op.drop_column('users', 'points')
    
    # Drop rewards table
    op.drop_index('idx_rewards_earned_at', table_name='rewards')
    op.drop_index('idx_rewards_bill_id', table_name='rewards')
    op.drop_index('idx_rewards_user_id', table_name='rewards')
    op.drop_table('rewards')
    
    # Drop bills table
    op.drop_index('idx_bills_category', table_name='bills')
    op.drop_index('idx_bills_is_paid', table_name='bills')
    op.drop_index('idx_bills_due_date', table_name='bills')
    op.drop_index('idx_bills_user_id', table_name='bills')
    op.drop_table('bills')
    
    # Drop enum types
    op.execute("DROP TYPE rewardtier")
    op.execute("DROP TYPE currencycode")
    op.execute("DROP TYPE billfrequency")