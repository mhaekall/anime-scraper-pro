import os
import databases
import sqlalchemy

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_0Kb4mhkYXIOd@ep-red-star-a19jjtnh.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")

# Replace postgresql:// with postgresql+asyncpg:// if needed for async, 
# databases library does this automatically for postgresql, but explicitly using postgresql+asyncpg is sometimes safer.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

database = databases.Database(DATABASE_URL)
metadata = sqlalchemy.MetaData()
