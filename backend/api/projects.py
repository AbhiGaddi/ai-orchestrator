from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from uuid import UUID

from backend.db.database import get_db
from backend.db.models import Project
from backend.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter(prefix="/projects", tags=["Projects"])

PROJECT_NOT_FOUND_MSG = "Project not found"

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(req: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = Project(**req.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("", response_model=List[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    return result.scalars().all()


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: UUID, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail=PROJECT_NOT_FOUND_MSG)
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: UUID, req: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail=PROJECT_NOT_FOUND_MSG)

    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    
    await db.commit()
    await db.refresh(project)
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: UUID, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail=PROJECT_NOT_FOUND_MSG)
    
    await db.delete(project)
    await db.commit()
    return None
from backend.services.sonar_service import SonarService

@router.get("/{project_id}/sonar/issues")
async def get_sonar_issues(project_id: UUID, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail=PROJECT_NOT_FOUND_MSG)
    
    if not project.sonar_project_key or not project.sonar_token:
        return []
        
    sonar = SonarService(project.sonar_project_key, project.sonar_token)
    issues = await sonar.get_issues()
    return issues

@router.post("/{project_id}/sonar/sync")
async def sync_sonar_metrics(project_id: UUID, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail=PROJECT_NOT_FOUND_MSG)
    
    if not project.sonar_project_key or not project.sonar_token:
        raise HTTPException(status_code=400, detail="Sonar not configured for this project")
        
    sonar = SonarService(project.sonar_project_key, project.sonar_token)
    metrics = await sonar.get_metrics()
    
    if metrics:
        project.sonar_metrics = metrics
        await db.commit()
        
    return metrics
