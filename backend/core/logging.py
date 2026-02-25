import logging
import sys
from backend.config import get_settings

settings = get_settings()

class ColorFormatter(logging.Formatter):
    """Custom formatter to add colors to logs in the terminal."""
    
    grey = "\x1b[38;20m"
    blue = "\x1b[34;20m"
    yellow = "\x1b[33;20m"
    red = "\x1b[31;20m"
    bold_red = "\x1b[31;1m"
    cyan = "\x1b[36;20m"
    reset = "\x1b[0m"
    
    # Format string: time | level | name | message
    fmt = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"

    FORMATS = {
        logging.DEBUG: grey + fmt + reset,
        logging.INFO: cyan + fmt + reset,
        logging.WARNING: yellow + fmt + reset,
        logging.ERROR: red + fmt + reset,
        logging.CRITICAL: bold_red + fmt + reset,
    }

    def format(self, record):
        log_fmt = self.FORMATS.get(record.levelno)
        
        # Color coding by namespace
        if "backend.agents" in record.name:
            log_fmt = self.blue + self.fmt + self.reset
        elif "backend.api" in record.name:
            log_fmt = self.cyan + self.fmt + self.reset
        elif "backend.core" in record.name:
            # Magenta-ish for core orchestration
            log_fmt = "\x1b[35;20m" + self.fmt + self.reset
            
        formatter = logging.Formatter(log_fmt, datefmt="%H:%M:%S")
        return formatter.format(record)


def setup_logging():
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    
    # Root logger setup
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers to avoid duplicates
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
        
    # Terminal handler
    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setFormatter(ColorFormatter())
    root_logger.addHandler(stdout_handler)

    # Specific levels for third-party libraries
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    
    # Force DEBUG for backend components in dev
    if settings.DEBUG:
        logging.getLogger("backend").setLevel(logging.DEBUG)
    
    logging.info(f"🤖 Logging System Ready (Level: {logging.getLevelName(log_level)})")


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
