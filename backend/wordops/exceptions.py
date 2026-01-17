"""Custom exceptions for WordOps CLI operations."""


class WordOpsError(Exception):
    """Base exception for WordOps operations."""

    def __init__(self, message: str, returncode: int | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.returncode = returncode


class CommandNotFoundError(WordOpsError):
    """Raised when the 'wo' binary is not found."""

    def __init__(self, message: str = "WordOps binary not found") -> None:
        super().__init__(message, returncode=None)


class CommandFailedError(WordOpsError):
    """Raised when a wo command exits with non-zero status."""

    def __init__(
        self, message: str, returncode: int, stderr: str | None = None
    ) -> None:
        super().__init__(message, returncode)
        self.stderr = stderr


class ParseError(WordOpsError):
    """Raised when output parsing fails."""

    def __init__(self, message: str, raw_output: str | None = None) -> None:
        super().__init__(message, returncode=None)
        self.raw_output = raw_output
