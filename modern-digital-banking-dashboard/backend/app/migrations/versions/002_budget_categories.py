"""Milestone 2: Budgets and Categories"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '002_budget_categories'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade():
    # ---------------- CATEGORIES ----------------
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('type', sa.String(20), nullable=False),  # income / expense
        sa.Column('created_at', sa.DateTime),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.UniqueConstraint('user_id', 'name', name='uq_user_category')
    )

    op.create_index('ix_categories_user_id', 'categories', ['user_id'])

    # ---------------- BUDGETS ----------------
    op.create_table(
        'budgets',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, nullable=False),
        sa.Column('category_id', sa.Integer, nullable=False),
        sa.Column('amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('month', sa.Integer, nullable=False),
        sa.Column('year', sa.Integer, nullable=False),
        sa.Column('created_at', sa.DateTime),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id']),
        sa.UniqueConstraint(
            'user_id', 'category_id', 'month', 'year',
            name='uq_user_budget_period'
        )
    )

    op.create_index('ix_budgets_user_id', 'budgets', ['user_id'])

    # ---------------- TRANSACTION ↔ CATEGORY ----------------
    op.create_table(
        'transaction_categories',
        sa.Column('transaction_id', sa.Integer, nullable=False),
        sa.Column('category_id', sa.Integer, nullable=False),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id']),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id']),
        sa.PrimaryKeyConstraint('transaction_id', 'category_id')
    )


def downgrade():
    op.drop_table('transaction_categories')
    op.drop_index('ix_budgets_user_id', table_name='budgets')
    op.drop_table('budgets')
    op.drop_index('ix_categories_user_id', table_name='categories')
    op.drop_table('categories')
