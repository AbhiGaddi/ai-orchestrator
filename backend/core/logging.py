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
    fmt = "%(asctime)s | %(levelname)-8s| %(name)s | %(message)s"

    FORMATS = {
        logging.DEBUG: grey + fmt + reset,
        logging.INFO: cyan + fmt + reset,
        logging.WARNING: yellow + fmt + reset,
        logging.ERROR: red + fmt + reset,
        logging.CRITICAL: bold_red + fmt + reset,
    }

    def format(self, record):
        log_fmt = self.FORMATS.get(record.levelno)
        # Highlight our own agents/services specifically
        if "backend.agents" in record.name:
            log_fmt = self.blue + self.fmt + self.reset
            
        formatter = logging.Formatter(log_fmt, datefmt="%H:%M:%S")
        return formatter.format(record)


def setup_logging():
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    
    # Root logger setup
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
        
    # Terminal handler
    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setFormatter(ColorFormatter())
    root_logger.addHandler(stdout_handler)

    # SILENCE NOISE
    # SQLAlchemy: Only show warnings/errors unless we are truly doing DB debugging
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    # HTTPX: Very noisy in debug, silence it
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    
    logging.info(f"🚀 Logging initialized (Level: {logging.getLevelName(log_level)})")


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
