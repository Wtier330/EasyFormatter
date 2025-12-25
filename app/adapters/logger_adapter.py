import logging
import os

class LoggerAdapter:
    def __init__(self, name: str = "easyformatter"):
        self.logger = logging.getLogger(name)
        if not self.logger.handlers:
            self._setup()

    def _setup(self) -> None:
        self.logger.setLevel(logging.INFO)
        formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
        fh = logging.FileHandler(os.path.join(os.getcwd(), "easyformatter.log"), encoding="utf-8")
        fh.setFormatter(formatter)
        self.logger.addHandler(fh)

    def info(self, msg: str) -> None:
        self.logger.info(msg)

    def error(self, msg: str) -> None:
        self.logger.error(msg)

