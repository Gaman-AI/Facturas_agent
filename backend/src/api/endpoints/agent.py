from fastapi import APIRouter, HTTPException, status
from src.schemas.agent import AgentTaskRequest, AgentTaskResponse
from src.services.browser_use_service import browser_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/execute", response_model=AgentTaskResponse, status_code=status.HTTP_200_OK)
async def execute_agent_task(request: AgentTaskRequest):
    """
    Execute a browser automation task directly.
    This endpoint is for direct execution and does not persist tasks in the database.
    """
    logger.info(f"Received direct execution request for prompt: {request.prompt}")
    try:
        # Use a simplified browser config for visible automation
        browser_config = {
            "headless": False, # Make browser visible
            "slow_mo": 500, # Slow down for observation
            "use_vision": True,
        }

        result = await browser_service.execute_task(
            task_description=request.prompt,
            llm_provider=request.llm_provider,
            model=request.model,
            browser_config=browser_config
        )
        
        return AgentTaskResponse(
            success=result["success"],
            result=result.get("result"),
            error=result.get("error"),
            task_id="temporary-id" # Not persisted
        )
        
    except Exception as e:
        logger.error(f"Error during direct task execution: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        ) 