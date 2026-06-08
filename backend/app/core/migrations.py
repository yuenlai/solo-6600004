import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)

async def migrate_focus_session_columns(engine: AsyncEngine):
    required_columns = [
        ('is_paused', 'BOOLEAN DEFAULT FALSE'),
        ('paused_at', 'DATETIME'),
        ('accumulated_seconds', 'VARCHAR(10) DEFAULT \'0\'')
    ]
    
    try:
        async with engine.connect() as conn:
            db_url = str(engine.url)
            is_sqlite = 'sqlite' in db_url
            
            if is_sqlite:
                result = await conn.execute(text("PRAGMA table_info(focus_sessions)"))
                existing_columns = [row[1] for row in result.all()]
            else:
                result = await conn.execute(text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'focus_sessions'"
                ))
                existing_columns = [row[0] for row in result.all()]
            
            for col_name, col_def in required_columns:
                if col_name not in existing_columns:
                    logger.info(f"Adding column {col_name} to focus_sessions...")
                    if is_sqlite:
                        await conn.execute(text(
                            f'ALTER TABLE focus_sessions ADD COLUMN {col_name} {col_def}'
                        ))
                    else:
                        await conn.execute(text(
                            f'ALTER TABLE focus_sessions ADD COLUMN IF NOT EXISTS {col_name} {col_def}'
                        ))
                    logger.info(f"Successfully added column {col_name}")
            
            await conn.commit()
            logger.info("Focus session migration completed successfully")
            
    except Exception as e:
        logger.warning(f"Focus session migration skipped or failed: {e}")
