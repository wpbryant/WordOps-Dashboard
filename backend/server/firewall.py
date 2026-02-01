"""UFW firewall rule management module."""

import asyncio
import logging
import re

from backend.server.models import FirewallRule, FirewallRuleCreate

logger = logging.getLogger(__name__)

# Timeout for UFW commands
UFW_TIMEOUT = 10  # seconds


async def get_ufw_rules() -> list[FirewallRule]:
    """Get list of UFW firewall rules.

    Runs `sudo ufw status numbered` and parses the output to extract
    firewall rules with their numbers, ports, protocols, actions, and
    source addresses.

    Returns:
        List of FirewallRule objects representing current UFW rules.
        Returns empty list if UFW is not active or command fails.

    Raises:
        RuntimeError: If command execution fails
        asyncio.TimeoutError: If command times out
    """
    rules = []

    try:
        process = await asyncio.create_subprocess_exec(
            "sudo",
            "ufw",
            "status",
            "numbered",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=UFW_TIMEOUT
        )

        if process.returncode != 0:
            stderr_str = stderr.decode("utf-8", errors="replace").strip()
            # UFW inactive is not an error - just return empty list
            if "inactive" in stderr_str.lower():
                logger.debug("UFW is inactive")
                return []
            raise RuntimeError(f"Failed to get UFW rules: {stderr_str}")

        output = stdout.decode("utf-8", errors="replace")
        lines = output.splitlines()

        # Parse the output
        # Format:
        #     Status: active
        #
        #      To                         Action      From
        #      --                         ------      ----
        # [ 1] 22/tcp                     ALLOW IN    192.168.1.0/24
        # [ 2] 80/tcp                     ALLOW IN    Anywhere
        # [ 3] 443/tcp                    ALLOW IN    Anywhere

        parsing_started = False

        for line in lines:
            line = line.strip()

            # Start parsing after we see the header separator
            if not parsing_started:
                if line.startswith("--") or "Action" in line:
                    parsing_started = True
                continue

            # Parse rule line: [ 1] 22/tcp    ALLOW IN    192.168.1.0/24
            if line.startswith("["):
                rule = _parse_rule_line(line)
                if rule:
                    rules.append(rule)

        return rules

    except asyncio.TimeoutError:
        logger.error("Timeout getting UFW rules")
        raise
    except FileNotFoundError:
        raise RuntimeError("ufw command not found")
    except Exception as e:
        logger.error(f"Error getting UFW rules: {e}")
        raise RuntimeError(f"Failed to get UFW rules: {str(e)}")


def _parse_rule_line(line: str) -> FirewallRule | None:
    """Parse a single UFW rule line.

    Args:
        line: A line from `ufw status numbered` output

    Returns:
        FirewallRule object or None if parsing fails
    """
    try:
        # Extract rule number: [ 1] -> "1"
        rule_match = re.search(r"\[\s*(\d+)\]", line)
        if not rule_match:
            return None

        rule_id = rule_match.group(1)

        # Remove the rule number prefix
        remaining = line[rule_match.end():].strip()

        # Split by whitespace
        parts = remaining.split()

        if len(parts) < 3:
            return None

        # First part is port/protocol: "22/tcp" or "80"
        port_proto = parts[0]
        if "/" in port_proto:
            port, protocol = port_proto.split("/", 1)
        else:
            port = port_proto
            protocol = "any"

        # Second part is action: "ALLOW"
        action = parts[1].lower()

        # Rest is from address (could be multi-part like "Anywhere (v6)")
        from_addr = " ".join(parts[3:]) if len(parts) > 3 else "Anywhere"

        # Clean up from_addr
        from_addr = from_addr.replace("(v6)", "").strip()

        return FirewallRule(
            id=rule_id,
            port=port,
            protocol=protocol,
            action=action,
            from_addr=from_addr,
            enabled=True,  # UFW numbered output only shows enabled rules
        )

    except Exception as e:
        logger.debug(f"Failed to parse rule line '{line}': {e}")
        return None


async def add_ufw_rule(request: FirewallRuleCreate) -> dict:
    """Add a new UFW firewall rule.

    Creates a new firewall rule using `ufw allow` or `ufw deny` command.

    Args:
        request: FirewallRuleCreate with action, port, protocol, and from_addr

    Returns:
        Dict with success status and message

    Raises:
        RuntimeError: If rule creation fails
        asyncio.TimeoutError: If command times out
    """
    try:
        # Build the UFW command
        # Format: ufw allow/deny from <addr> to any port <port> proto <protocol>

        cmd = ["sudo", "ufw", request.action]

        # Add from clause if not "Anywhere"
        if request.from_addr and request.from_addr.lower() != "anywhere":
            cmd.extend(["from", request.from_addr])

        # Add to clause and port
        cmd.extend(["to", "any", "port", request.port])

        # Add protocol if not "any"
        if request.protocol and request.protocol.lower() != "any":
            cmd.extend(["proto", request.protocol])

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=UFW_TIMEOUT
        )

        if process.returncode != 0:
            stderr_str = stderr.decode("utf-8", errors="replace").strip()
            raise RuntimeError(f"Failed to add UFW rule: {stderr_str}")

        return {"success": True, "message": "Firewall rule added successfully"}

    except asyncio.TimeoutError:
        logger.error("Timeout adding UFW rule")
        raise
    except FileNotFoundError:
        raise RuntimeError("ufw command not found")
    except Exception as e:
        logger.error(f"Error adding UFW rule: {e}")
        raise RuntimeError(f"Failed to add UFW rule: {str(e)}")


async def delete_ufw_rule(rule_id: str) -> dict:
    """Delete a UFW firewall rule by number.

    Deletes a firewall rule using `ufw delete <number>` command.

    Args:
        rule_id: The rule number from ufw status numbered output

    Returns:
        Dict with success status and message

    Raises:
        RuntimeError: If rule deletion fails
        asyncio.TimeoutError: If command times out
    """
    try:
        # UFW delete requires interactive confirmation in some cases
        # We use 'yes' command to auto-confirm
        process = await asyncio.create_subprocess_exec(
            "sudo",
            "ufw",
            "delete",
            rule_id,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=UFW_TIMEOUT
        )

        # UFW delete returns 0 even if it needs confirmation and we didn't provide it
        # Check output for prompts
        stdout_str = stdout.decode("utf-8", errors="replace")
        stderr_str = stderr.decode("utf-8", errors="replace")

        if "Deleting:" in stdout_str or "delete" in stdout_str.lower():
            # Rule was deleted
            return {"success": True, "message": "Firewall rule deleted successfully"}

        if process.returncode != 0:
            error_msg = stderr_str or stdout_str
            raise RuntimeError(f"Failed to delete UFW rule: {error_msg}")

        return {"success": True, "message": "Firewall rule deleted successfully"}

    except asyncio.TimeoutError:
        logger.error("Timeout deleting UFW rule")
        raise
    except FileNotFoundError:
        raise RuntimeError("ufw command not found")
    except Exception as e:
        logger.error(f"Error deleting UFW rule: {e}")
        raise RuntimeError(f"Failed to delete UFW rule: {str(e)}")
