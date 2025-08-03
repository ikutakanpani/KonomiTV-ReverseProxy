
import Message from '@/message';
import APIClient from '@/services/APIClient';


/** ユーザーアカウントの情報を表すインターフェイス */
export interface IUser {
    id: number;
    name: string;
    is_admin: boolean;
    niconico_user_id: number | null;
    niconico_user_name: string | null;
    niconico_user_premium: boolean | null;
    twitter_accounts: ITwitterAccount[];
    created_at: string;
    updated_at: string;
}

/** ユーザーアカウントに紐づく Twitter アカウントの情報を表すインターフェイス */
export interface ITwitterAccount {
    id: number;
    name: string;
    screen_name: string;
    icon_url: string;
    created_at: string;
    updated_at: string;
}

/** ユーザーアカウントのアクセストークンを表すインターフェイス */
export interface IUserAccessToken {
    access_token: string;
    token_type: string;
}

export interface IUserCreateRequest {
    username: string;
    password: string;
}
export interface IUserUpdateRequest {
    username?: string;
    password?: string;
}
export interface IUserUpdateRequestForAdmin {
    username?: string;
    password?: string;
    is_admin?: boolean;
}


class Users {

    /**
     * ユーザーアカウントを作成する
     * @param user_create_request ユーザー名とパスワード
     * @returns 作成したユーザーアカウントの情報 or アカウント作成に失敗した場合は null
     */
    static async createUser(user_create_request: IUserCreateRequest): Promise<IUser | null> {
        return null;
    }


    /**
     * ユーザーアカウントのアクセストークンを発行する
     * @param username ユーザー名
     * @param password パスワード
     * @returns 発行したアクセストークン or ログインに失敗した場合は null
     */
    static async createUserAccessToken(username: string, password: string): Promise<IUserAccessToken | null> {
        return null;
    }


    /**
     * 現在ログイン中のユーザーアカウントの情報を取得する
     * @returns ログイン中のユーザーアカウントの情報 or ログインしていない場合は null
     */
    static async fetchUser(): Promise<IUser | null> {

        // API リクエストを実行
        const response = await APIClient.get<IUser>('/users/me');

        if (response.type === 'error') {
            APIClient.showGenericError(response, 'アカウント情報を取得できませんでした。');
            return null;
        }

        // ヘッダから取得
        const headers = response.headers;
        const userId = Number(headers['x-webauth-id']);
        const isAdmin = headers['x-webauth-admin'] === '1';
        const username = headers['x-webauth-user'];

        if (!username || isNaN(userId)) {
            Message.error('ユーザー情報の取得に失敗しました。');
            return null;
        }

        // 必要な項目のみ設定して返す（残りは null または初期値）
        const user: IUser = {
            id: userId,
            name: username,
            is_admin: isAdmin,
            niconico_user_id: null,
            niconico_user_name: null,
            niconico_user_premium: null,
            twitter_accounts: [],
            created_at: '', // サーバが返していないので空に
            updated_at: ''
        };

        return user;
    }


    /**
     * 現在ログイン中のユーザーアカウントのアイコンを取得する
     * @returns ログイン中のユーザーアカウントのアイコンの Blob URL or ログインしていない場合は null
     */
    static async fetchUserIcon(): Promise<string | null> {
        return null;
    }


    /**
     * 現在ログイン中のユーザーアカウントの情報を更新する
     * @param user_update_request ユーザー名 or パスワード
     * @returns 更新に成功した場合は true
     */
    static async updateUser(user_update_request: IUserUpdateRequest): Promise<boolean> {
        return false;
    }


    /**
     * 現在ログイン中のユーザーアカウントのアイコン画像を更新する
     * @param icon アイコンの File オブジェクト
     */
    static async updateUserIcon(icon: File): Promise<void> {
        return;
    }


    /**
     * 現在ログイン中のユーザーアカウントを削除する
     */
    static async deleteUser(): Promise<void> {
        return;
    }


    /**
     * すべてのユーザーアカウントのリストを取得する
     * @returns すべてのユーザーアカウントのリスト
     */
    static async fetchAllUsers(): Promise<IUser[] | null> {

        // API リクエストを実行
        const response = await APIClient.get<IUser[]>('/users');

        // エラー処理
        if (response.type === 'error') {
            APIClient.showGenericError(response, 'ユーザー情報リストを取得できませんでした。');
            return null;
        }

        return response.data;
    }


    /**
     * 指定されたユーザー名のユーザーアカウントの情報を取得する
     * @param username ユーザー名
     * @returns 指定されたユーザーアカウントの情報
     */
    static async fetchSpecifiedUser(username: string): Promise<IUser | null> {

        // API リクエストを実行
        const response = await APIClient.get<IUser>(`/users/${username}`);

        // エラー処理
        if (response.type === 'error') {
            switch (response.data.detail) {
                case 'Specified user was not found': {
                    Message.error(`${username} のユーザーが見つかりませんでした。`);
                    break;
                }
                default: {
                    APIClient.showGenericError(response, `${username} のユーザー情報を取得できませんでした。`);
                    break;
                }
            }
            return null;
        }

        return response.data;
    }


    /**
     * 指定されたユーザー名のユーザーアカウントの情報を更新する
     * @param username ユーザー名
     * @param is_admin 管理者権限の付与/剥奪
     */
    static async updateSpecifiedUser(username: string, is_admin: boolean | null): Promise<boolean> {

        // API リクエストを実行
        const response = await APIClient.put(`/users/${username}`, { is_admin });

        // エラー処理
        if (response.type === 'error') {
            APIClient.showGenericError(response, `${username} のユーザー情報を更新できませんでした。`);
            return false;
        }

        return true;
    }


    /**
     * 指定されたユーザー名のユーザーアカウントのアイコン画像を取得する
     * @param username ユーザー名
     * @returns 指定されたユーザーアカウントのアイコン画像の Blob URL
     */
    static async fetchSpecifiedUserIcon(username: string): Promise<string> {

        // API リクエストを実行
        const response = await APIClient.get(`/users/${username}/icon`, { responseType: 'blob' });

        // エラー処理
        if (response.type === 'error') {
            APIClient.showGenericError(response, `${username} のユーザーアイコン画像を取得できませんでした。`);
            throw new Error('Failed to get specified user icon');
        }

        // Blob を Blob URL に変換して返す
        const blob_url = URL.createObjectURL(response.data);
        return blob_url;
    }


    /**
     * 指定されたユーザー名のユーザーアカウントを削除する
     * @param username ユーザー名
     * @returns 削除に成功した場合は true
     */
    static async deleteSpecifiedUser(username: string): Promise<boolean> {

        // API リクエストを実行
        const response = await APIClient.delete(`/users/${username}`);

        // エラー処理
        if (response.type === 'error') {
            APIClient.showGenericError(response, `${username} のユーザーアカウントを削除できませんでした。`);
            return false;
        }

        return true;
    }
}

export default Users;
