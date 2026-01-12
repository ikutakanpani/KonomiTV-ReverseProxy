
import asyncio
import pathlib
import uuid
from datetime import datetime, timedelta
from typing import Annotated, BinaryIO
from zoneinfo import ZoneInfo

import anyio
from fastapi import (
    APIRouter,
    Body,
    Depends,
    File,
    HTTPException,
    Path,
    Response,
    UploadFile,
    status,
    Request,
)
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from PIL import Image

from app import logging, schemas
from app.constants import (
    ACCOUNT_ICON_DEFAULT_DIR,
    ACCOUNT_ICON_DIR,
    JWT_SECRET_KEY,
    PASSWORD_CONTEXT,
)
#from app.models.TwitterAccount import TwitterAccount
from app.models.User import User


# ルーター
router = APIRouter(
    tags = ['Users'],
    prefix = '/api/users',
)

async def GetCurrentUserFromHeaders(request: Request) -> User:
    headers = request.headers

    try:
        user_id = int(headers.get("x-webauth-id"))
        user_name = headers.get("x-webauth-user")
        is_admin = int(headers.get("x-webauth-admin")) == 1
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication headers",
        )

    user = User(id=user_id, name=user_name, is_admin=is_admin)

    return user


async def GetCurrentAdminUser(current_user: Annotated[User, Depends(GetCurrentUserFromHeaders)]) -> User:
    """ 現在ログイン中の管理者ユーザーを取得する """

    # 取得したユーザーが管理者ではない
    if current_user.is_admin is False:
        logging.warning(f'[GetCurrentAdminUser] Don\'t have permission to access this resource. [user_id: {current_user.id}]')
        raise HTTPException(
            status_code = status.HTTP_403_FORBIDDEN,
            detail = 'Don\'t have permission to access this resource',
            headers = {'WWW-Authenticate': 'Bearer'},
        )

    return current_user


@router.get(
    '',
    summary = 'アカウント一覧 API',
    response_description = 'すべてのユーザーアカウントの情報。',
    response_model = schemas.Users,
)
async def UsersAPI(
    current_user: Annotated[User, Depends(GetCurrentAdminUser)],
):
    """
    すべてのユーザーアカウントのリストを取得する。<br>
    JWT エンコードされたアクセストークンがリクエストの Authorization: Bearer に設定されていて、かつ管理者アカウントでないとアクセスできない。
    """

    return []


# ***** ログイン中ユーザーアカウント情報 API *****


@router.get(
    '/me',
    summary = 'アカウント情報 API (ログイン中のユーザー)',
    response_description = 'ログイン中のユーザーアカウントの情報。',
    response_model = schemas.User,
)
async def UserAPI(
    current_user: Annotated[User, Depends(GetCurrentUserFromHeaders)],
):
    """
    現在ログイン中のユーザーアカウントの情報を取得する。<br>
    JWT エンコードされたアクセストークンがリクエストの Authorization: Bearer に設定されていないとアクセスできない。
    """

    return current_user
