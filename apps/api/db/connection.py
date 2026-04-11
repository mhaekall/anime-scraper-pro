import os
import databases
import sqlalchemy
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Replace postgresql:// with postgresql+asyncpg:// if needed for async, 
# databases library does this automatically for postgresql, but explicitly using postgresql+asyncpg is sometimes safer.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

database = databases.Database(DATABASE_URL, min_size=1, max_size=5)
metadata = sqlalchemy.MetaData()
