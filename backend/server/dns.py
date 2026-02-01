"""DNS API credentials reading from acme.sh account.conf."""

import asyncio
import logging

from backend.server.models import DnsCredential

logger = logging.getLogger(__name__)

# acme.sh account.conf file path
ACME_ACCOUNT_CONF = "/etc/letsencrypt/config/account.conf"

# Map of acme.sh environment variable names to provider names
# Format: {env_key: (provider_name, email_key)}
DNS_PROVIDERS = {
    "CF_Key": ("cloudflare", "CF_Email"),
    "DO_API_KEY": ("digitalocean", None),
    "GD_Key": ("godaddy", "GD_Email"),
    "LINODE_API_KEY": ("linode", None),
    "AWS_ACCESS_KEY_ID": ("aws", None),
    "GCE_SERVICE_ACCOUNT_FILE": ("google", None),
    "VULTR_API_KEY": ("vultr", None),
    "HETZNER_API_KEY": ("hetzner", None),
    "OVH_API_KEY": ("ovh", None),
    "Ali_Key": ("aliyun", None),
    "Namecom_Key": ("namecom", None),
    "Lexicon_Key": ("lexicon", None),
    "ACME_Depends_On": ("lexicon", None),  # Lexicon uses this pattern
}

# Provider display names for UI
PROVIDER_DISPLAY_NAMES = {
    "cloudflare": "Cloudflare",
    "digitalocean": "DigitalOcean",
    "godaddy": "GoDaddy",
    "linode": "Linode",
    "aws": "Amazon Web Services",
    "google": "Google Cloud",
    "vultr": "Vultr",
    "hetzner": "Hetzner",
    "ovh": "OVH",
    "aliyun": "Aliyun",
    "namecom": "Name.com",
    "lexicon": "Lexicon",
}


def mask_api_key(key: str) -> str:
    """Mask an API key for display.

    Args:
        key: The API key to mask

    Returns:
        Masked key preview (first 8 chars + "..." or "***" if too short)
    """
    if not key:
        return "***"
    if len(key) <= 8:
        return "***"
    return key[:8] + "..."


async def get_dns_credentials() -> list[DnsCredential]:
    """Read acme.sh account.conf and parse DNS provider credentials.

    Reads the acme.sh account configuration file to find configured DNS API
    credentials for Let's Encrypt DNS challenge validation. Returns a list of
    detected providers with masked credentials.

    Returns:
        List of DnsCredential objects for configured DNS providers.
        Returns empty list if file not found or no credentials configured.

    Raises:
        asyncio.TimeoutError: If reading the config file times out
    """
    credentials = []

    try:
        # Read the acme.sh account.conf file via sudo
        process = await asyncio.create_subprocess_exec(
            "sudo",
            "cat",
            ACME_ACCOUNT_CONF,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=5.0)

        if process.returncode != 0:
            # File not found or permission error - return empty list
            stderr_str = stderr.decode("utf-8", errors="replace").strip()
            logger.debug(f"Could not read acme.sh account.conf: {stderr_str}")
            return []

        # Parse the config file
        content = stdout.decode("utf-8", errors="replace")
        lines = content.splitlines()

        # Store found credentials
        found_providers = {}

        for line in lines:
            line = line.strip()

            # Skip comments and empty lines
            if not line or line.startswith("#"):
                continue

            # Parse KEY=VALUE format
            if "=" in line:
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip()

                # Remove quotes if present
                if value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                elif value.startswith("'") and value.endswith("'"):
                    value = value[1:-1]

                # Check if this is a DNS provider key
                # Try both the key and SAVED_ version of the key
                for provider_key, (provider_name, email_key) in DNS_PROVIDERS.items():
                    if key == provider_key or key == f"SAVED_{provider_key}":
                        # Initialize provider entry if not exists
                        if provider_name not in found_providers:
                            found_providers[provider_name] = {"key": None, "email": None}

                        # Store the API key (masked)
                        if value:
                            found_providers[provider_name]["key"] = mask_api_key(value)

                    # Check for email
                    if email_key and (key == email_key or key == f"SAVED_{email_key}"):
                        if provider_name not in found_providers:
                            found_providers[provider_name] = {"key": None, "email": None}
                        found_providers[provider_name]["email"] = value

        # Convert to DnsCredential objects
        for provider_name, data in found_providers.items():
            # Only include if we have a key
            if data["key"]:
                credentials.append(
                    DnsCredential(
                        provider=provider_name,
                        email=data.get("email"),
                        key_preview=data["key"],
                        configured=True,
                    )
                )

    except asyncio.TimeoutError:
        logger.error("Timeout reading acme.sh account.conf")
        raise
    except FileNotFoundError:
        # File doesn't exist - not an error, just no credentials
        logger.debug(f"acme.sh account.conf not found at {ACME_ACCOUNT_CONF}")
        return []
    except Exception as e:
        logger.error(f"Error reading DNS credentials: {e}")
        return []

    return credentials
