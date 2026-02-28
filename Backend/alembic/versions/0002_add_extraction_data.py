"""Add extraction_data column to consultations

Revision ID: 0002
Revises: 0001
Create Date: 2026-02-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "consultations",
        sa.Column("extraction_data", postgresql.JSONB, server_default="{}", nullable=True),
    )


def downgrade() -> None:
    op.drop_column("consultations", "extraction_data")
