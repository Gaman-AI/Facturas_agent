#!/usr/bin/env python3
"""
Database initialization script
Creates all database tables based on SQLAlchemy models
"""

from src.db.database import engine, Base
from src.db.models import Task, TaskStep

def init_db():
    """Initialize the database by creating all tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_db() 