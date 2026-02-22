"""
BaseAgent — abstract contract that every agent must implement.
New agents just inherit this and implement `run()`.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class AgentResult:
    success: bool
    output: Optional[dict] = field(default_factory=dict)
    error: Optional[str] = None


class BaseAgent(ABC):
    name: str = "BaseAgent"

    @abstractmethod
    async def run(self, context: dict) -> AgentResult:
        """
        Execute the agent's primary logic.

        Args:
            context: dict carrying task data, previous agent outputs,
                     config references, etc.

        Returns:
            AgentResult with success flag, output dict saved to agent_runs,
            and optional error string.
        """
        raise NotImplementedError
