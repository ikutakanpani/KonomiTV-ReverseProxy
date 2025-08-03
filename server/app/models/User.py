from __future__ import annotations

import json
from typing import Any, Optional
from datetime import datetime

import httpx

from app.constants import API_REQUEST_HEADERS, HTTPX_CLIENT, NICONICO_OAUTH_CLIENT_ID
from app.utils import Interlaced


class User:
    def __init__(
        self,
        id: int,
        name: str,
        is_admin: bool,
        client_settings: Optional[dict[str, Any]] = None,
    ):
        self.id = id
        self.name = name
        self.is_admin = is_admin
        self.client_settings = client_settings or {}
