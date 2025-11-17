"""
PostgreSQL RDS Database Configuration
"""

import os

# PostgreSQL RDS Configuration
DB_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

# Connection String
CONNECTION_STRING = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"

def get_connection():
    """
    Get a PostgreSQL database connection
    
    Returns:
        psycopg2.connection: Database connection object
    """
    import psycopg2
    return psycopg2.connect(**DB_CONFIG)

def get_connection_string():
    """
    Get the PostgreSQL connection string
    
    Returns:
        str: Connection string
    """
    return CONNECTION_STRING

