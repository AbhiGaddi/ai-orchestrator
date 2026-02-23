from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select, update
from backend.db.database import AsyncSessionLocal
from backend.db.models import Project
from backend.services.sonar_service import SonarService
from backend.core.logging import get_logger

logger = get_logger(__name__)

async def sync_all_sonar_projects():
    """Iterate through all projects and sync Sonar metrics if configured."""
    logger.info("Starting scheduled SonarCloud sync...")
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Project))
        projects = result.scalars().all()
        
        for project in projects:
            if not project.sonar_project_key or not project.sonar_token:
                logger.debug(f"Skipping Sonar sync for project {project.name} (Not configured)")
                continue
                
            logger.info(f"Syncing Sonar metrics for project: {project.name}")
            sonar = SonarService(project.sonar_project_key, project.sonar_token)
            metrics = await sonar.get_metrics()
            
            if metrics:
                await db.execute(
                    update(Project)
                    .where(Project.id == project.id)
                    .values(sonar_metrics=metrics)
                )
                logger.info(f"Successfully synced metrics for {project.name}: {metrics}")
        
        await db.commit()
    
    logger.info("SonarCloud sync complete.")

def start_scheduler():
    scheduler = AsyncIOScheduler()
    # Run sync every hour
    scheduler.add_job(sync_all_sonar_projects, 'interval', hours=1)
    scheduler.start()
    logger.info("🚀 APScheduler started (Sonar Sync: every 1 hour)")
    return scheduler
