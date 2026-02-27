"""Initial schema — all tables

Revision ID: 0001
Revises:
Create Date: 2026-02-27
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── doctors ──────────────────────────────────────────────────────────────
    op.create_table(
        "doctors",
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("specialization", sa.String(100), nullable=True),
        sa.Column("license_number", sa.String(50), nullable=False, unique=True),
        sa.Column("hospital_name", sa.String(200), nullable=True),
        sa.Column("avatar_url", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_doctors_email", "doctors", ["email"])

    # ── patients ──────────────────────────────────────────────────────────────
    op.create_table(
        "patients",
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("date_of_birth", sa.Date, nullable=True),
        sa.Column("gender", sa.String(10), nullable=True),
        sa.Column("blood_group", sa.String(5), nullable=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("emergency_contact", sa.String(20), nullable=True),
        sa.Column("avatar_url", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_patients_email", "patients", ["email"])

    # ── patient_onboarding ────────────────────────────────────────────────────
    op.create_table(
        "patient_onboarding",
        sa.Column("onboarding_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "patient_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("patients.patient_id", ondelete="CASCADE"),
            nullable=False,
        ),
        # Basic
        sa.Column("emergency_contact_name", sa.String(150), nullable=True),
        sa.Column("emergency_contact_phone", sa.String(20), nullable=True),
        # Diabetes
        sa.Column("has_diabetes", sa.Boolean, server_default=sa.text("false")),
        sa.Column("diabetes_type", sa.String(20), nullable=True),
        sa.Column("on_insulin", sa.Boolean, server_default=sa.text("false")),
        # Heart
        sa.Column("has_heart_disease", sa.Boolean, server_default=sa.text("false")),
        sa.Column("heart_conditions", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")),
        # Lung
        sa.Column("has_lung_disease", sa.Boolean, server_default=sa.text("false")),
        sa.Column("lung_conditions", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("uses_inhaler_daily", sa.Boolean, server_default=sa.text("false")),
        sa.Column("no_medical_conditions", sa.Boolean, server_default=sa.text("false")),
        # Medications & lifestyle
        sa.Column("taking_medications", sa.Boolean, server_default=sa.text("false")),
        sa.Column("medications_list", sa.Text, nullable=True),
        sa.Column("has_allergies", sa.Boolean, server_default=sa.text("false")),
        sa.Column("allergies_list", sa.Text, nullable=True),
        sa.Column("smoking_status", sa.String(20), nullable=True),
        sa.Column("alcohol_use", sa.String(20), nullable=True),
        sa.Column("had_major_surgeries", sa.Boolean, server_default=sa.text("false")),
        sa.Column("surgeries_details", sa.Text, nullable=True),
        # Consent
        sa.Column("consent_data_storage", sa.Boolean, server_default=sa.text("false"), nullable=False),
        sa.Column("consent_ai_assist", sa.Boolean, server_default=sa.text("false"), nullable=False),
        # Timestamps
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_patient_onboarding_patient_id", "patient_onboarding", ["patient_id"])

    # ── appointments ──────────────────────────────────────────────────────────
    op.create_table(
        "appointments",
        sa.Column("appointment_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "doctor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("doctors.doctor_id"),
            nullable=False,
        ),
        sa.Column(
            "patient_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("patients.patient_id"),
            nullable=False,
        ),
        sa.Column("appointment_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer, server_default=sa.text("30")),
        sa.Column("appointment_type", sa.String(50), server_default=sa.text("'in_person'")),
        sa.Column("status", sa.String(20), server_default=sa.text("'pending'")),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("cancelled_reason", sa.Text, nullable=True),
        # Soft link to consultation (not a FK — avoids circular dep)
        sa.Column("consultation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("meeting_room_id", sa.String(255), nullable=True),
        sa.Column("reminder_sent", sa.Boolean, server_default=sa.text("false")),
        sa.Column("reminder_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_appointments_doctor_id", "appointments", ["doctor_id"])
    op.create_index("ix_appointments_patient_id", "appointments", ["patient_id"])
    op.create_index("ix_appointments_appointment_date", "appointments", ["appointment_date"])
    op.create_index("ix_appointments_status", "appointments", ["status"])

    # ── consultations ─────────────────────────────────────────────────────────
    op.create_table(
        "consultations",
        sa.Column("consultation_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "doctor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("doctors.doctor_id"),
            nullable=False,
        ),
        sa.Column(
            "patient_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("patients.patient_id"),
            nullable=False,
        ),
        sa.Column(
            "appointment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("appointments.appointment_id"),
            nullable=True,
        ),
        sa.Column("transcription", sa.Text, nullable=True),
        sa.Column("soap_note", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("icd_codes", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("prescription", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("patient_summary", sa.Text, nullable=True),
        sa.Column("emr_data", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", sa.String(20), server_default=sa.text("'draft'")),
        sa.Column("consultation_date", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_consultations_doctor_id", "consultations", ["doctor_id"])
    op.create_index("ix_consultations_patient_id", "consultations", ["patient_id"])
    op.create_index("ix_consultations_appointment_id", "consultations", ["appointment_id"])
    op.create_index("ix_consultations_status", "consultations", ["status"])

    # ── documents ─────────────────────────────────────────────────────────────
    op.create_table(
        "documents",
        sa.Column("document_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "consultation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("consultations.consultation_id"),
            nullable=True,
        ),
        sa.Column(
            "patient_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("patients.patient_id"),
            nullable=False,
        ),
        sa.Column(
            "doctor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("doctors.doctor_id"),
            nullable=True,
        ),
        sa.Column("document_name", sa.String(255), nullable=False),
        sa.Column("document_type", sa.String(50), nullable=True),
        sa.Column("file_path", sa.Text, nullable=False),
        sa.Column("file_size_kb", sa.Integer, nullable=True),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("analysis_result", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_documents_patient_id", "documents", ["patient_id"])
    op.create_index("ix_documents_consultation_id", "documents", ["consultation_id"])
    op.create_index("ix_documents_document_type", "documents", ["document_type"])

    # ── chat_history ──────────────────────────────────────────────────────────
    op.create_table(
        "chat_history",
        sa.Column("chat_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_type", sa.String(20), nullable=False),
        sa.Column("session_id", sa.String(255), nullable=False),
        sa.Column("messages", postgresql.JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("context", postgresql.JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_chat_history_user_id", "chat_history", ["user_id"])
    op.create_index("ix_chat_history_session_id", "chat_history", ["session_id"])

    # ── notification_log ──────────────────────────────────────────────────────
    op.create_table(
        "notification_log",
        sa.Column("notification_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("appointment_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("consultation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("channel", sa.String(20), nullable=True),
        sa.Column("status", sa.String(20), server_default=sa.text("'pending'")),
        sa.Column("message_content", sa.Text, nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_notification_log_appointment_id", "notification_log", ["appointment_id"])
    op.create_index("ix_notification_log_consultation_id", "notification_log", ["consultation_id"])
    op.create_index("ix_notification_log_patient_id", "notification_log", ["patient_id"])
    op.create_index("ix_notification_log_status", "notification_log", ["status"])

    # ── audit_log ─────────────────────────────────────────────────────────────
    op.create_table(
        "audit_log",
        sa.Column("audit_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_type", sa.String(20), nullable=False),
        sa.Column("actor_name", sa.String(150), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("old_value", postgresql.JSONB, nullable=True),
        sa.Column("new_value", postgresql.JSONB, nullable=True),
        sa.Column("change_summary", sa.Text, nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text, nullable=True),
        sa.Column("session_id", sa.String(255), nullable=True),
        sa.Column("data_sensitivity", sa.String(20), server_default=sa.text("'high'")),
        sa.Column("is_phi_accessed", sa.Boolean, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_audit_log_actor_id", "audit_log", ["actor_id"])
    op.create_index("ix_audit_log_action", "audit_log", ["action"])
    op.create_index("ix_audit_log_entity_id", "audit_log", ["entity_id"])
    op.create_index("ix_audit_log_session_id", "audit_log", ["session_id"])
    op.create_index("ix_audit_log_is_phi_accessed", "audit_log", ["is_phi_accessed"])
    op.create_index("ix_audit_log_created_at", "audit_log", ["created_at"])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("notification_log")
    op.drop_table("chat_history")
    op.drop_table("documents")
    op.drop_table("consultations")
    op.drop_table("appointments")
    op.drop_table("patient_onboarding")
    op.drop_table("patients")
    op.drop_table("doctors")
