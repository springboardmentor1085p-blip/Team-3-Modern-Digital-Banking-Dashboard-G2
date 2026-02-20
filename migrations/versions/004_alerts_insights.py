"""Alerts & insights schema migration

Revision ID: 004_alerts_insights
Revises: 003_transactions_accounts
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004_alerts_insights'
down_revision = '003_bills_rewards'
branch_labels = None
depends_on = None

def upgrade():
    # Create enum types
    op.execute("CREATE TYPE alerttype AS ENUM ('budget_exceeded', 'large_transaction', 'unusual_spending', 'low_balance', 'high_balance', 'income_received', 'bill_due', 'subscription_renewal', 'savings_goal', 'cash_flow_warning', 'system', 'info', 'warning', 'critical')")
    op.execute("CREATE TYPE alertstatus AS ENUM ('active', 'resolved', 'dismissed', 'archived')")
    op.execute("CREATE TYPE entitytype AS ENUM ('transaction', 'account', 'budget', 'category', 'bill', 'goal', 'user')")
    op.execute("CREATE TYPE adminaction AS ENUM ('create', 'update', 'delete', 'export', 'view', 'login', 'logout', 'suspend', 'activate', 'reset_password', 'change_role', 'bulk_action')")
    op.execute("CREATE TYPE resourcetype AS ENUM ('user', 'transaction', 'account', 'category', 'budget', 'alert', 'report', 'export', 'system')")
    
    # Create alerts table
    op.create_table('alerts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('alert_type', sa.Enum('budget_exceeded', 'large_transaction', 'unusual_spending', 'low_balance', 'high_balance', 'income_received', 'bill_due', 'subscription_renewal', 'savings_goal', 'cash_flow_warning', 'system', 'info', 'warning', 'critical', name='alerttype'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=True),
        sa.Column('entity_type', sa.Enum('transaction', 'account', 'budget', 'category', 'bill', 'goal', 'user', name='entitytype'), nullable=True),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('entity_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('amount', sa.Float(), nullable=True),
        sa.Column('threshold', sa.Float(), nullable=True),
        sa.Column('status', sa.Enum('active', 'resolved', 'dismissed', 'archived', name='alertstatus'), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=True),
        sa.Column('is_actionable', sa.Boolean(), nullable=True),
        sa.Column('action_taken', sa.Boolean(), nullable=True),
        sa.Column('action_taken_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('acknowledged_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for alerts table
    op.create_index('idx_alerts_user_status', 'alerts', ['user_id', 'status'], unique=False)
    op.create_index('idx_alerts_user_read', 'alerts', ['user_id', 'is_read'], unique=False)
    op.create_index('idx_alerts_entity', 'alerts', ['entity_type', 'entity_id'], unique=False)
    op.create_index('idx_alerts_created', 'alerts', ['created_at'], unique=False)
    op.create_index('idx_alerts_expires', 'alerts', ['expires_at'], unique=False)
    op.create_index(op.f('ix_alerts_id'), 'alerts', ['id'], unique=False)
    op.create_index('idx_alerts_alert_type', 'alerts', ['alert_type'], unique=False)
    
    # Create admin_logs table
    op.create_table('admin_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('admin_id', sa.Integer(), nullable=True),
        sa.Column('admin_email', sa.String(length=255), nullable=False),
        sa.Column('action', sa.Enum('create', 'update', 'delete', 'export', 'view', 'login', 'logout', 'suspend', 'activate', 'reset_password', 'change_role', 'bulk_action', name='adminaction'), nullable=False),
        sa.Column('resource_type', sa.Enum('user', 'transaction', 'account', 'category', 'budget', 'alert', 'report', 'export', 'system', name='resourcetype'), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=True),
        sa.Column('resource_name', sa.String(length=255), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('changes', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('target_user_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['admin_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for admin_logs table
    op.create_index('idx_admin_logs_admin_date', 'admin_logs', ['admin_id', 'created_at'], unique=False)
    op.create_index('idx_admin_logs_resource', 'admin_logs', ['resource_type', 'resource_id'], unique=False)
    op.create_index('idx_admin_logs_target_user', 'admin_logs', ['target_user_id', 'created_at'], unique=False)
    op.create_index('idx_admin_logs_action_date', 'admin_logs', ['action', 'created_at'], unique=False)
    op.create_index(op.f('ix_admin_logs_id'), 'admin_logs', ['id'], unique=False)
    
    # Add columns to transactions table for insights
    op.add_column('transactions', sa.Column('is_recurring', sa.Boolean(), server_default=sa.text('false'), nullable=True))
    op.add_column('transactions', sa.Column('recurrence_frequency', sa.String(length=50), nullable=True))
    op.add_column('transactions', sa.Column('recurrence_next_date', sa.Date(), nullable=True))
    op.add_column('transactions', sa.Column('recurrence_end_date', sa.Date(), nullable=True))
    op.add_column('transactions', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('transactions', sa.Column('longitude', sa.Float(), nullable=True))
    op.add_column('transactions', sa.Column('merchant_name', sa.String(length=255), nullable=True))
    op.add_column('transactions', sa.Column('payment_method', sa.String(length=100), nullable=True))
    
    # Create indexes for transaction insights
    op.create_index('idx_transactions_recurring', 'transactions', ['is_recurring', 'recurrence_next_date'], unique=False)
    op.create_index('idx_transactions_location', 'transactions', ['latitude', 'longitude'], unique=False)
    op.create_index('idx_transactions_merchant', 'transactions', ['merchant_name'], unique=False)
    
    # Add columns to users table for analytics
    op.add_column('users', sa.Column('last_insights_generation', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('insights_preferences', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('users', sa.Column('alert_preferences', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('users', sa.Column('export_history', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    
    # Create user_insights table for cached insights
    op.create_table('user_insights',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('insight_type', sa.String(length=50), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('calculated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'insight_type', 'period_start', 'period_end', name='unique_user_insight')
    )
    
    op.create_index('idx_user_insights_user', 'user_insights', ['user_id', 'insight_type'], unique=False)
    op.create_index('idx_user_insights_period', 'user_insights', ['period_start', 'period_end'], unique=False)
    op.create_index(op.f('ix_user_insights_id'), 'user_insights', ['id'], unique=False)
    
    # Create export_history table
    op.create_table('export_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('export_id', sa.String(length=100), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('export_type', sa.String(length=50), nullable=False),
        sa.Column('format', sa.String(length=20), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('download_count', sa.Integer(), server_default=sa.text('0'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('storage_path', sa.String(length=500), nullable=True),
        sa.Column('checksum', sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('export_id')
    )
    
    op.create_index('idx_export_history_user', 'export_history', ['user_id', 'created_at'], unique=False)
    op.create_index('idx_export_history_type', 'export_history', ['export_type', 'format'], unique=False)
    op.create_index(op.f('ix_export_history_id'), 'export_history', ['id'], unique=False)

def downgrade():
    # Drop tables in reverse order
    op.drop_index(op.f('ix_export_history_id'), table_name='export_history')
    op.drop_index('idx_export_history_type', table_name='export_history')
    op.drop_index('idx_export_history_user', table_name='export_history')
    op.drop_table('export_history')
    
    op.drop_index(op.f('ix_user_insights_id'), table_name='user_insights')
    op.drop_index('idx_user_insights_period', table_name='user_insights')
    op.drop_index('idx_user_insights_user', table_name='user_insights')
    op.drop_table('user_insights')
    
    # Remove columns from users table
    op.drop_column('users', 'export_history')
    op.drop_column('users', 'alert_preferences')
    op.drop_column('users', 'insights_preferences')
    op.drop_column('users', 'last_insights_generation')
    
    # Remove indexes and columns from transactions table
    op.drop_index('idx_transactions_merchant', table_name='transactions')
    op.drop_index('idx_transactions_location', table_name='transactions')
    op.drop_index('idx_transactions_recurring', table_name='transactions')
    op.drop_column('transactions', 'payment_method')
    op.drop_column('transactions', 'merchant_name')
    op.drop_column('transactions', 'longitude')
    op.drop_column('transactions', 'latitude')
    op.drop_column('transactions', 'recurrence_end_date')
    op.drop_column('transactions', 'recurrence_next_date')
    op.drop_column('transactions', 'recurrence_frequency')
    op.drop_column('transactions', 'is_recurring')
    
    # Drop admin_logs table
    op.drop_index(op.f('ix_admin_logs_id'), table_name='admin_logs')
    op.drop_index('idx_admin_logs_action_date', table_name='admin_logs')
    op.drop_index('idx_admin_logs_target_user', table_name='admin_logs')
    op.drop_index('idx_admin_logs_resource', table_name='admin_logs')
    op.drop_index('idx_admin_logs_admin_date', table_name='admin_logs')
    op.drop_table('admin_logs')
    
    # Drop alerts table
    op.drop_index('idx_alerts_alert_type', table_name='alerts')
    op.drop_index(op.f('ix_alerts_id'), table_name='alerts')
    op.drop_index('idx_alerts_expires', table_name='alerts')
    op.drop_index('idx_alerts_created', table_name='alerts')
    op.drop_index('idx_alerts_entity', table_name='alerts')
    op.drop_index('idx_alerts_user_read', table_name='alerts')
    op.drop_index('idx_alerts_user_status', table_name='alerts')
    op.drop_table('alerts')
    
    # Drop enum types
    op.execute("DROP TYPE resourcetype")
    op.execute("DROP TYPE adminaction")
    op.execute("DROP TYPE entitytype")
    op.execute("DROP TYPE alertstatus")
    op.execute("DROP TYPE alerttype")