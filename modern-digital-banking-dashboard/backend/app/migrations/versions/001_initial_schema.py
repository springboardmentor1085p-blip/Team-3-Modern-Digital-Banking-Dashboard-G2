"""Initial schema"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


# ✅ DEFINE ENUMS ONCE (POSTGRES ONLY)
transactiontype_enum = postgresql.ENUM(
    'deposit',
    'withdrawal',
    'transfer',
    'payment',
    name='transactiontype',
    create_type=False
)

transactionstatus_enum = postgresql.ENUM(
    'pending',
    'completed',
    'failed',
    'cancelled',
    name='transactionstatus',
    create_type=False
)


def upgrade():
    bind = op.get_bind()

    # ✅ CREATE ENUMS MANUALLY (ONLY ONCE)
    postgresql.ENUM(
        'deposit',
        'withdrawal',
        'transfer',
        'payment',
        name='transactiontype'
    ).create(bind, checkfirst=True)

    postgresql.ENUM(
        'pending',
        'completed',
        'failed',
        'cancelled',
        name='transactionstatus'
    ).create(bind, checkfirst=True)

    # ---------------- USERS ----------------
    op.create_table(
        'users',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('username', sa.String(50), nullable=False),
        sa.Column('email', sa.String(100), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(100)),
        sa.Column('is_active', sa.Boolean),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime)
    )

    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_username', 'users', ['username'], unique=True)

    # ---------------- ACCOUNTS ----------------
    op.create_table(
        'accounts',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, nullable=False),
        sa.Column('account_number', sa.String(20), nullable=False),
        sa.Column('account_type', sa.String(20), nullable=False),
        sa.Column('balance', sa.Numeric(15, 2)),
        sa.Column('currency', sa.String(3)),
        sa.Column('status', sa.String(20)),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'])
    )

    op.create_index(
        'ix_accounts_account_number',
        'accounts',
        ['account_number'],
        unique=True
    )

    # ---------------- TRANSACTIONS ----------------
    op.create_table(
        'transactions',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('account_id', sa.Integer, nullable=False),
        sa.Column('transaction_type', transactiontype_enum, nullable=False),
        sa.Column('amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('description', sa.String(200)),
        sa.Column('status', transactionstatus_enum),
        sa.Column('recipient_account', sa.String(20)),
        sa.Column('reference_number', sa.String(50), nullable=False),
        sa.Column('transaction_date', sa.DateTime),
        sa.Column('created_at', sa.DateTime),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'])
    )

    op.create_index(
        'ix_transactions_reference_number',
        'transactions',
        ['reference_number'],
        unique=True
    )


def downgrade():
    op.drop_index('ix_transactions_reference_number', table_name='transactions')
    op.drop_table('transactions')

    op.drop_index('ix_accounts_account_number', table_name='accounts')
    op.drop_table('accounts')

    op.drop_index('ix_users_username', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')

    bind = op.get_bind()
    postgresql.ENUM(name='transactionstatus').drop(bind, checkfirst=True)
    postgresql.ENUM(name='transactiontype').drop(bind, checkfirst=True)
