

import DPlayer from 'dplayer';
import { watch } from 'vue';

import router from '@/router';
import PlayerManager from '@/services/player/PlayerManager';
import useChannelsStore from '@/stores/ChannelsStore';
import usePlayerStore from '@/stores/PlayerStore';
import useSettingsStore from '@/stores/SettingsStore';
import Utils from '@/utils';


/**
 * キーボードショートカットの定義
 * 一部の特殊なキーコンビネーションは表現しきれないため、キーボードイベント発生時の条件分岐で直接実装している
 */
interface ShortcutDefinition {
    // 適用対象の再生モード (Live: ライブ視聴のみ, Video: ビデオ視聴のみ, Both: 両方に適用)
    mode: 'Live' | 'Video' | 'Both';
    // トリガー対象のキー (KeyboardEvent.code)
    key: string;
    // キーリピートを許可するかどうか
    repeat: boolean;
    // Ctrl キーの同時押しが必要かどうか
    // Mac では Ctrl キーではなく Cmd キーで判定される
    ctrl: boolean;
    // Shift キーの同時押しが必要かどうか
    shift: boolean;
    // Alt キーの同時押しが必要かどうか
    // Mac では Alt キーではなく Option キーで判定される
    alt: boolean;
    // キーが押されたときに実行する関数
    handler: () => void;
}


/**
 * 視聴画面全体のキーボードショートカットイベントを管理する PlayerManager
 */
class KeyboardShortcutManager implements PlayerManager {

    // ユーザー操作により DPlayer 側で画質が切り替わった際、この PlayerManager の再起動が必要かどうかを PlayerController に示す値
    public readonly restart_required_when_quality_switched = false;

    // DPlayer のインスタンス
    // 設計上コンストラクタ以降で変更すべきでないため readonly にしている
    private readonly player: DPlayer;

    // 再生モード (Live: ライブ視聴, Video: ビデオ視聴)
    private readonly playback_mode: 'Live' | 'Video';

    // キーボードショートカットをバインドする Document オブジェクト
    private readonly document: Document;

    // キーボードショートカットイベントをキャンセルする AbortController
    private abort_controller: AbortController | null = null;

    /**
     * コンストラクタ
     * @param player DPlayer のインスタンス
     * @param playback_mode 再生モード (Live: ライブ視聴, Video: ビデオ視聴)
     * @param document キーボードショートカットをバインドする Document オブジェクト
     */
    constructor(player: DPlayer, playback_mode: 'Live' | 'Video', document: Document = window.document) {
        this.player = player;
        this.playback_mode = playback_mode;
        this.document = document;
    }


    /**
     * キーボードショートカットイベントをブラウザに登録する
     */
    public async init(): Promise<void> {
        const channels_store = useChannelsStore();
        const player_store = usePlayerStore();
        const settings_store = useSettingsStore();

        // キーボードショートカットイベントをキャンセルする AbortController を生成
        this.abort_controller = new AbortController();

        // 視聴画面のルート要素を取得
        const route_container_element = document.querySelector<HTMLDivElement>('.route-container')!;

        // キャプチャボタンの HTML 要素を取得
        // KeyboardShortcutManager より先に CaptureManager が初期化されていることが前提
        //const capture_button_element = this.player.container.querySelector<HTMLDivElement>('.dplayer-capture-icon')!;
        //const comment_capture_button_element = this.player.container.querySelector<HTMLDivElement>('.dplayer-comment-capture-icon')!;

        // ツイート送信フォーム / ツイート送信ボタンの HTML 要素を取得
        // Twitter パネルコンポーネントが視聴画面に追加されていることが前提
        const tweet_form_element = document.querySelector<HTMLDivElement>('.tweet-form__textarea')!;
        const tweet_button_element = document.querySelector<HTMLButtonElement>('.tweet-button')!;

        // 検索結果更新ボタンの HTML 要素を取得
        // Twitter パネルコンポーネントが視聴画面に追加されていることが前提
        const search_update_button_element = document.querySelector<HTMLButtonElement>('.search-header__refresh')!;
        // タイムライン更新ボタンの HTML 要素を取得
        // Twitter パネルコンポーネントが視聴画面に追加されていることが前提
        const timeline_update_button_element = document.querySelector<HTMLButtonElement>('.timeline-header__refresh')!;

        // データ放送リモコンの各ボタンの HTML 要素を取得
        // データ放送リモコンコンポーネントが視聴画面に追加されていることが前提
        // ビデオ視聴時はデータ放送リモコンコンポーネントが表示されないためすべて null になる
        const remocon_data_button = document.querySelector<HTMLDivElement>('.remote-control-button-data');
        const remocon_back_button = document.querySelector<HTMLDivElement>('.remote-control-button-back');
        const remocon_select_button = document.querySelector<HTMLDivElement>('.remote-control-button-select');
        const remocon_up_button = document.querySelector<HTMLDivElement>('.remote-control-button-up');
        const remocon_left_button = document.querySelector<HTMLDivElement>('.remote-control-button-left');
        const remocon_right_button = document.querySelector<HTMLDivElement>('.remote-control-button-right');
        const remocon_down_button = document.querySelector<HTMLDivElement>('.remote-control-button-down');
        const remocon_blue_button = document.querySelector<HTMLDivElement>('.remote-control-button-blue');
        const remocon_red_button = document.querySelector<HTMLDivElement>('.remote-control-button-red');
        const remocon_green_button = document.querySelector<HTMLDivElement>('.remote-control-button-green');
        const remocon_yellow_button = document.querySelector<HTMLDivElement>('.remote-control-button-yellow');

        // 一般的なキーボードショートカットの定義
        // 一部の特殊なキーコンビネーションは表現しきれないため、キーボードイベント発生時の条件分岐で直接実装している
        const shortcuts: ShortcutDefinition[] = [

            // ***** 全般 *****

            // ↑: ライブ視聴: 前のチャンネルに切り替える
            {mode: 'Live', key: 'ArrowUp', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                player_store.is_zapping = true;  // ザッピング状態にする
                router.push({path: `/tv/watch/${channels_store.channel.previous.display_channel_id}`});
            }},

            // ↓: ライブ視聴: 次のチャンネルに切り替える
            {mode: 'Live', key: 'ArrowDown', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                player_store.is_zapping = true;  // ザッピング状態にする
                router.push({path: `/tv/watch/${channels_store.channel.next.display_channel_id}`});
            }},

            // /(？): キーボードショートカットの一覧を表示する
            {mode: 'Both', key: 'Slash', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                player_store.shortcut_key_modal = !player_store.shortcut_key_modal;  // 表示状態を反転
            }},

            // ***** プレイヤー *****

            // Space: 再生 / 一時停止の切り替え
            {mode: 'Both', key: 'Space', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                this.player.toggle();
            }},

            // Shift + Space: 再生 / 一時停止の切り替え
            // キャプチャタブではツイート対象のキャプチャを選択する際に Space キーを使っているため、再生 / 一時停止の切り替えのショートカットが使えない
            // そこでキャプチャタブ表示中でも、Shift + Space キーを押せば再生 / 一時停止の切り替えを行えるようにしている
            // 以前はキャプチャタブ表示中のみ使えるショートカットだったが、キャプチャタブ以外を開いた際にキーが効かずに混乱することが分かったため、
            // 現在は常時 Space と Shift + Space 両方のショートカットを使えるようにしている
            {mode: 'Both', key: 'Space', repeat: false, ctrl: false, shift: true, alt: false, handler: () => {
                this.player.toggle();
            }},

            // Ctrl + ←: ライブ視聴: 停止して0.5秒早戻し
            {mode: 'Live', key: 'ArrowLeft', repeat: true, ctrl: true, shift: false, alt: false, handler: () => {
                if (this.player.video.paused === false) {
                    this.player.video.pause();
                }
                this.player.video.currentTime = this.player.video.currentTime - 0.5;
            }},

            // Ctrl + →: ライブ視聴: 停止して0.5秒早送り
            {mode: 'Live', key: 'ArrowRight', repeat: true, ctrl: true, shift: false, alt: false, handler: () => {
                if (this.player.video.paused === false) {
                    this.player.video.pause();
                }
                this.player.video.currentTime = this.player.video.currentTime + 0.5;
            }},

            // ←: ビデオ視聴: 5秒早戻し
            {mode: 'Video', key: 'ArrowLeft', repeat: true, ctrl: false, shift: false, alt: false, handler: () => {
                this.player.seek(this.player.video.currentTime - 5);
            }},

            // →: ビデオ視聴: 5秒早送り
            {mode: 'Video', key: 'ArrowRight', repeat: true, ctrl: false, shift: false, alt: false, handler: () => {
                this.player.seek(this.player.video.currentTime + 5);
            }},

            // Ctrl + ←: ビデオ視聴: 15秒早戻し
            {mode: 'Video', key: 'ArrowLeft', repeat: true, ctrl: true, shift: false, alt: false, handler: () => {
                this.player.seek(this.player.video.currentTime - 15);
            }},

            // Ctrl + →: ビデオ視聴: 15秒早送り
            {mode: 'Video', key: 'ArrowRight', repeat: true, ctrl: true, shift: false, alt: false, handler: () => {
                this.player.seek(this.player.video.currentTime + 15);
            }},

            // Shift + ←: ビデオ視聴: 30秒早戻し
            {mode: 'Video', key: 'ArrowLeft', repeat: true, ctrl: false, shift: true, alt: false, handler: () => {
                this.player.seek(this.player.video.currentTime - 30);
            }},

            // Shift + →: ビデオ視聴: 30秒早送り
            {mode: 'Video', key: 'ArrowRight', repeat: true, ctrl: false, shift: true, alt: false, handler: () => {
                this.player.seek(this.player.video.currentTime + 30);
            }},

            // Alt + ←: ビデオ視聴: 60秒早戻し
            {mode: 'Video', key: 'ArrowLeft', repeat: true, ctrl: false, shift: false, alt: true, handler: () => {
                this.player.seek(this.player.video.currentTime - 60);
            }},

            // Alt + →: ビデオ視聴: 60秒早送り
            {mode: 'Video', key: 'ArrowRight', repeat: true, ctrl: false, shift: false, alt: true, handler: () => {
                this.player.seek(this.player.video.currentTime + 60);
            }},

            // Ctrl + ↑: プレイヤーの音量を上げる
            {mode: 'Both', key: 'ArrowUp', repeat: true, ctrl: true, shift: false, alt: false, handler: () => {
                this.player.volume(this.player.volume() + 0.05);
            }},

            // Ctrl + ↓: プレイヤーの音量を下げる
            {mode: 'Both', key: 'ArrowDown', repeat: true, ctrl: true, shift: false, alt: false, handler: () => {
                this.player.volume(this.player.volume() - 0.05);
            }},

            // Q: プレイヤーの音量をミュートする
            {mode: 'Both', key: 'KeyQ', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                if (this.player.container.classList.contains('dplayer-mobile')) {
                    this.player.video.muted = !this.player.video.muted;
                } else {
                    this.player.template.volumeButtonIcon.click();
                }
                if (this.player.video.muted === true) {
                    this.player.notice('音量をミュート中');
                } else {
                    this.player.notice('音量をミュート解除');
                }
            }},

            // W: ライブ視聴: ライブストリームの同期
            {mode: 'Live', key: 'KeyW', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                this.player.sync();
            }},

            // R: プレイヤーを再起動する
            {mode: 'Both', key: 'KeyR', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                player_store.event_emitter.emit('PlayerRestartRequired', {
                    message: 'プレイヤーを再起動しました。',
                    is_error_message: false,  // 明示的に上記メッセージがエラーメッセージではないことを示す (通知時の色がデフォルトになる)
                });
            }},

            // F: フルスクリーンの切り替え
            {mode: 'Both', key: 'KeyF', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                this.player.fullScreen.toggle();
            }},

            // E: Picture-in-Picture の表示切り替え
            {mode: 'Both', key: 'KeyE', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                if (document.pictureInPictureEnabled) {
                    this.player.template.pipButton.click();
                }
            }},

            // S: 字幕の表示切り替え
            {mode: 'Both', key: 'KeyS', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                this.player.subtitle!.toggle();
                if (!this.player.subtitle!.container.classList.contains('dplayer-subtitle-hide')) {
                    this.player.notice(`${this.player.tran('Show subtitle')}`);
                } else {
                    this.player.notice(`${this.player.tran('Hide subtitle')}`);
                }
            }},

            // D: コメントの表示切り替え
            {mode: 'Both', key: 'KeyD', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                this.player.template.showDanmaku.click();
                if (this.player.template.showDanmakuToggle.checked) {
                    this.player.notice(`${this.player.tran('Show comment')}`);
                } else {
                    this.player.notice(`${this.player.tran('Hide comment')}`);
                }
            }},

            // M: ライブ視聴: コメント入力フォームにフォーカスする
            // ビデオ視聴ではコメント送信自体ができないため有効化しない
            {mode: 'Live', key: 'KeyM', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                this.player.controller.show();
                this.player.comment!.show();
                player_store.event_emitter.emit('SetControlDisplayTimer', {});
                window.setTimeout(() => this.player.template.commentInput.focus(), 100);
            }},

            // ***** パネル *****

            // P: パネルの表示切り替え
            {mode: 'Both', key: 'KeyP', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                player_store.is_panel_display = !player_store.is_panel_display;  // 表示状態を反転
            }},

            // K: ライブ視聴: 番組情報タブを表示する
            {mode: 'Live', key: 'KeyK', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                player_store.tv_panel_active_tab = 'Program';
            }},

            // K: ビデオ視聴: 録画番組情報タブを表示する
            {mode: 'Video', key: 'KeyK', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                player_store.video_panel_active_tab = 'RecordedProgram';
            }},

            // L: ライブ視聴: チャンネルタブを表示する
            {mode: 'Live', key: 'KeyL', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                player_store.tv_panel_active_tab = 'Channel';
            }},

            // L: ビデオ視聴: シリーズタブを表示する
            {mode: 'Video', key: 'KeyL', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                player_store.video_panel_active_tab = 'Series';
            }},

            // ;(＋): コメントタブを表示する
            {mode: 'Both', key: 'Semicolon', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                if (this.playback_mode === 'Live') {
                    player_store.tv_panel_active_tab = 'Comment';
                } else {
                    player_store.video_panel_active_tab = 'Comment';
                }
            }},

            // :(＊): Twitter タブを表示する
            {mode: 'Both', key: 'Quote', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                if (this.playback_mode === 'Live') {
                    player_store.tv_panel_active_tab = 'Twitter';
                } else {
                    player_store.video_panel_active_tab = 'Twitter';
                }
            }},

            // ***** Twitter *****

            // [(「): ツイート検索タブを表示する
            {mode: 'Both', key: 'BracketRight', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                player_store.twitter_active_tab = 'Search';
            }},

            // ](」): タイムラインタブを表示する
            {mode: 'Both', key: 'Backslash', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                player_store.twitter_active_tab = 'Timeline';
            }},

            // \(￥)キー: キャプチャタブを表示する
            {mode: 'Both', key: 'IntlRo', repeat: false, ctrl: false, shift: false, alt: false, handler: () => {
                player_store.twitter_active_tab = 'Capture';
            }},

            // ***** データ放送 *****

            // Alt + D: ライブ視聴: リモコンの d ボタンを押す
            {mode: 'Live', key: 'KeyD', repeat: false, ctrl: false, shift: false, alt: true, handler: () => {
                remocon_data_button?.click();
            }},

            // Alt + Backspace: ライブ視聴: リモコンの戻るボタンを押す
            {mode: 'Live', key: 'Backspace', repeat: false, ctrl: false, shift: false, alt: true, handler: () => {
                remocon_back_button?.click();
            }},

            // Alt + Enter: ライブ視聴: リモコンの決定ボタンを押す
            {mode: 'Live', key: 'Enter', repeat: false, ctrl: false, shift: false, alt: true, handler: () => {
                remocon_select_button?.click();
            }},

            // Alt + ↑: ライブ視聴: リモコンの ↑ ボタンを押す
            {mode: 'Live', key: 'ArrowUp', repeat: false, ctrl: false, shift: false, alt: true, handler: () => {
                remocon_up_button?.click();
            }},

            // Alt + ←: ライブ視聴: リモコンの ← ボタンを押す
            {mode: 'Live', key: 'ArrowLeft', repeat: false, ctrl: false, shift: false, alt: true, handler: () => {
                remocon_left_button?.click();
            }},

            // Alt + →: ライブ視聴: リモコンの → ボタンを押す
            {mode: 'Live', key: 'ArrowRight', repeat: false, ctrl: false, shift: false, alt: true, handler: () => {
                remocon_right_button?.click();
            }},

            // Alt + ↓: ライブ視聴: リモコンの ↓ ボタンを押す
            {mode: 'Live', key: 'ArrowDown', repeat: false, ctrl: false, shift: false, alt: true, handler: () => {
                remocon_down_button?.click();
            }},

            // Alt + F9: ライブ視聴: リモコンの青ボタンを押す
            {mode: 'Live', key: 'F9', repeat: false, ctrl: false, shift: false, alt: true, handler: () => {
                remocon_blue_button?.click();
            }},

            // Alt + F10: ライブ視聴: リモコンの赤ボタンを押す
            {mode: 'Live', key: 'F10', repeat: false, ctrl: false, shift: false, alt: true, handler: () => {
                remocon_red_button?.click();
            }},

            // Alt + F11: ライブ視聴: リモコンの緑ボタンを押す
            {mode: 'Live', key: 'F11', repeat: false, ctrl: false, shift: false, alt: true, handler: () => {
                remocon_green_button?.click();
            }},

            // Alt + F12: ライブ視聴: リモコンの黄ボタンを押す
            {mode: 'Live', key: 'F12', repeat: false, ctrl: false, shift: false, alt: true, handler: () => {
                remocon_yellow_button?.click();
            }},
        ];

        // ドキュメント全体のキーボードショートカットイベント
        // this.document に対してイベントを登録することで、メインウインドウ配下以外の Document にも対応できる
        let last_key_pressed_at = 0;  // 最終押下時刻
        this.document.addEventListener('keydown', (event: KeyboardEvent) => {

            // 日本語 IME による入力中は無視
            // event.keyCode === 229 は日本語 IME 変換確定時に発火するらしい (謎のテクニック)
            if (event.isComposing === true || event.keyCode === 229) {
                return;
            }

            // キーリピート (押しっぱなし) 状態かを検知
            let is_repeat = false;
            if (event.repeat) {
                is_repeat = true;
            }
            // キーリピート状態は event.repeat を見る事でだいたい検知できるが、最初の何回かは検知できないこともある
            // そこで、0.05 秒以内に連続して発火したキーイベントをキーリピートとみなす
            const now = Utils.time();
            if (now - last_key_pressed_at < 0.05) {
                is_repeat = true;
            }
            last_key_pressed_at = now;  // 最終押下時刻を更新

            // Ctrl or Cmd (Mac) キーが押されているかどうか
            // Mac では Ctrl キーではなく Cmd キーで判定される
            const is_ctrl_or_cmd_pressed = (Utils.isMacOS() === true ? event.metaKey : event.ctrlKey);
            // Shift キーが押されているかどうか
            const is_shift_pressed = event.shiftKey;
            // Alt or Option キーが押されているかどうか
            // Mac では Alt キーではなく Option キーで判定される
            const is_alt_pressed = event.altKey;

            // 現在パネル上でアクティブなタブ
            const panel_active_tab = this.playback_mode === 'Live' ? player_store.tv_panel_active_tab : player_store.video_panel_active_tab;

            // 現在フォーム (input or textarea) にフォーカスがあるかどうか
            const is_form_focused = (document.activeElement instanceof HTMLInputElement ||
                                     document.activeElement instanceof HTMLTextAreaElement);

            // ***** 特殊な処理を行うキーボードショートカットの処理 *****

            // 1~9, 0, -(=), ^(~): (ライブ視聴のみ) 押されたキーに対応するチャンネルに切り替える
            // チャンネル選局のキーボードショートカットを Alt or Option + 数字キー/テンキーに変更する設定が有効なときは、
            // Alt or Option キーが押されていることを条件に追加する
            // フォーカスが input or textarea にあるときは誤動作防止のため無効化
            if ((this.playback_mode === 'Live') &&
                (is_repeat === false) &&
                (is_ctrl_or_cmd_pressed === false) &&
                (is_alt_pressed === (settings_store.settings.tv_channel_selection_requires_alt_key === true)) &&
                (is_form_focused === false)) {

                // ***** 数字キーでチャンネルを切り替える *****

                // Shift キーが同時押しされていたら BS チャンネルの方を選局する
                const switch_channel_type = is_shift_pressed ? 'BS' : 'GR';

                // 切り替えるチャンネルのリモコン ID
                // リモコン ID に当てはまるキーが押下していなければ null のままになる
                let switch_remocon_id: number | null = null;

                // 1～9キー
                if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'].includes(event.code)) {
                    switch_remocon_id = Number(event.code.replace('Digit', ''));
                }
                // 0キー: 10に割り当て
                if (event.code === 'Digit0') switch_remocon_id = 10;
                // -キー: 11に割り当て
                if (event.code === 'Minus') switch_remocon_id = 11;
                // ^キー: 12に割り当て
                if (event.code === 'Equal') switch_remocon_id = 12;
                // 1～9キー (テンキー)
                if (['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9'].includes(event.code)) {
                    switch_remocon_id = Number(event.code.replace('Numpad', ''));
                }
                // 0キー (テンキー): 10に割り当て
                if (event.code === 'Numpad0') switch_remocon_id = 10;

                // この時点でリモコン ID が取得できている場合のみ実行
                if (switch_remocon_id !== null) {

                    // 切り替え先のチャンネルを取得する
                    const switch_channel = channels_store.getChannelByRemoconID(switch_channel_type, switch_remocon_id);

                    // チャンネルが取得できていれば、ルーティングをそのチャンネルに置き換える
                    // 押されたキーに対応するリモコン ID のチャンネルがない場合や、現在と同じチャンネル ID の場合は何も起こらない
                    if (switch_channel !== null && switch_channel.display_channel_id !== channels_store.display_channel_id) {
                        router.push({path: `/tv/watch/${switch_channel.display_channel_id}`});

                        // 既定のキーボードショートカットイベントをキャンセルして終了
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                    }
                }
            }

            // Ctrl + M: (ライブ視聴のみ) コメント入力フォームを閉じる
            // コメント入力フォームが表示されているときのみ有効
            // コメント入力フォームにフォーカスが当たっている場合も実行する
            if ((this.playback_mode === 'Live') &&
                (event.code === 'KeyM') &&
                (is_repeat === false) &&
                (is_ctrl_or_cmd_pressed === true) &&
                (is_shift_pressed === false) &&
                (is_alt_pressed === false) &&
                (this.player.template.controller.classList.contains('dplayer-controller-comment')) &&
                (is_form_focused === false || document.activeElement === this.player.template.commentInput)) {

                // コメント入力フォームを閉じる
                this.player.comment!.hide();

                // 既定のキーボードショートカットイベントをキャンセルして終了
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            // Ctrl + Enter: ツイートを送信する (Shift + Enter は間違えたとき用の隠し機能)
            // パネルが表示されていて、かつパネルで Twitter タブが表示されているときのみ有効
            // ツイート入力フォームにフォーカスが当たっている場合も実行する
            if ((event.code === 'Enter') &&
                (is_repeat === false) &&
                (is_ctrl_or_cmd_pressed === true || is_shift_pressed === true) &&
                (is_alt_pressed === false) &&
                (player_store.is_panel_display === true) &&
                (panel_active_tab === 'Twitter') &&
                (is_form_focused === false || document.activeElement === tweet_form_element)) {

                // ツイートを送信する
                tweet_button_element.click();

                // 既定のキーボードショートカットイベントをキャンセルして終了
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            // Tab: ツイート入力フォームにフォーカスを当てる/フォーカスを外す
            // ツイート入力フォームにフォーカスが当たっていても実行する
            if ((event.code === 'Tab') &&
                (is_repeat === false) &&
                (is_ctrl_or_cmd_pressed === false) &&
                (is_shift_pressed === false) &&
                (is_alt_pressed === false) &&
                (is_form_focused === false || document.activeElement === tweet_form_element)) {

                // ツイート入力フォームにフォーカスがすでに当たっていたら、フォーカスを外す
                if (document.activeElement === tweet_form_element) {
                    tweet_form_element.blur();

                // ツイート入力フォームにフォーカスが当たっていなかったら、フォーカスを当てる
                } else {

                    // パネルを開く
                    player_store.is_panel_display = true;

                    // どのタブを開いていたかに関係なく Twitter タブに切り替える
                    // この時点でパネルで他のタブが表示されていた場合は、Twitter タブに切り替わる
                    if (this.playback_mode === 'Live') {
                        player_store.tv_panel_active_tab = 'Twitter';
                    } else {
                        player_store.video_panel_active_tab = 'Twitter';
                    }

                    // 現在 Document Picture-in-Picture 表示状態の場合のみ、まずメインウインドウにフォーカスを当てる
                    if (player_store.is_document_pip === true) {
                        window.focus();
                    }

                    // ツイート入力フォームの textarea 要素にフォーカスを当てる
                    tweet_form_element.focus();

                    // フォーカスを当てると画面全体が勝手に横方向にスクロールされてしまうので、元に戻す
                    route_container_element.scrollLeft = 0;

                    // 0.1 秒後に実行
                    window.setTimeout(() => {

                        // 他のタブから切り替えると一発でフォーカスが当たらないことがあるので、ちょっとだけ待ってから念押し
                        // $nextTick() だと上手くいかなかった…
                        tweet_form_element.focus();

                        // フォーカスを当てると画面全体が勝手に横方向にスクロールされてしまうので、元に戻す
                        route_container_element.scrollLeft = 0;

                    }, 0.1 * 1000);
                }

                // 既定のキーボードショートカットイベントをキャンセルして終了
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            // ＼(｜): 検索結果を更新
            // Document Picture-in-Picture 表示状態ではなく、パネルが表示されていて、
            // かつパネルで Twitter タブが表示されていて、Twitter タブ内でツイート検索タブが表示されているときのみ有効
            if ((event.code === 'IntlYen') &&
                (is_repeat === false) &&
                (is_ctrl_or_cmd_pressed === false) &&
                (is_shift_pressed === false) &&
                (is_alt_pressed === false) &&
                (player_store.is_document_pip === false) &&
                (player_store.is_panel_display === true) &&
                (panel_active_tab === 'Twitter') &&
                (player_store.twitter_active_tab === 'Search') &&
                (is_form_focused === false)) {

                // 検索結果更新ボタンのクリックイベントを発生させる
                search_update_button_element.click();
                return;
            }

            // ＼(｜): タイムラインを更新
            // Document Picture-in-Picture 表示状態ではなく、パネルが表示されていて、
            // かつパネルで Twitter タブが表示されていて、Twitter タブ内でタイムラインタブが表示されているときのみ有効
            if ((event.code === 'IntlYen') &&
                (is_repeat === false) &&
                (is_ctrl_or_cmd_pressed === false) &&
                (is_shift_pressed === false) &&
                (is_alt_pressed === false) &&
                (player_store.is_document_pip === false) &&
                (player_store.is_panel_display === true) &&
                (panel_active_tab === 'Twitter') &&
                (player_store.twitter_active_tab === 'Timeline') &&
                (is_form_focused === false)) {

                // タイムライン更新ボタンのクリックイベントを発生させる
                timeline_update_button_element.click();
                return;
            }

            // ***** 一般的なキーボードショートカットの処理 *****

            // フォーカスが input or textarea にあるとき、上記以外のキーボードショートカットを無効化
            if (is_form_focused === true) {
                return;
            }

            // キーボードショートカットの定義を走査して、該当するものがあれば実行
            for (const shortcut of shortcuts) {

                // 適用対象の再生モード が Both ではなく、初期化時の再生モードと一致しない
                if (shortcut.mode !== 'Both' && shortcut.mode !== this.playback_mode) {
                    continue;
                }
                // キーが一致しない
                if (shortcut.key !== event.code) {
                    continue;
                }
                // キーリピートを許可しない設定のショートカットで、キーリピート状態である
                // キーリピートを許可する設定のショートカットでは、キーリピート状態かに関わらず実行する
                if (shortcut.repeat === false && is_repeat === true) {
                    continue;
                }
                // Ctrl or Cmd (Mac) キーの同時押しが必要かどうかが一致しない
                if (shortcut.ctrl !== is_ctrl_or_cmd_pressed) {
                    continue;
                }
                // Shift キーの同時押しが必要かどうかが一致しない
                if (shortcut.shift !== is_shift_pressed) {
                    continue;
                }
                // Alt or Option キーの同時押しが必要かどうかが一致しない
                if (shortcut.alt !== is_alt_pressed) {
                    continue;
                }

                // キーボードショートカットの実行
                shortcut.handler();

                // 既定のキーボードショートカットイベントをキャンセル
                event.preventDefault();
                event.stopPropagation();

                // 実行条件に一致しキーボードショートカットを実行し終えた時点で、即座にループを抜けて終了する
                return;
            }

        }, { signal: this.abort_controller.signal });

        console.log('[KeyboardShortcutManager] Initialized.');
    }


    /**
     * キーボードショートカットイベントをブラウザから削除する
     */
    public async destroy(): Promise<void> {
        const player_store = usePlayerStore();

        // ライブ視聴: ザッピング中のみ、ザッピングが終わるだけ待ってから非同期でキーボードショートカットイベントをキャンセルする
        // 即座にキーボードショートカットイベントをキャンセルしてしまうと、ザッピングが終わるまでキーボードショートカットが効かなくなってしまう
        if (this.playback_mode === 'Live' && player_store.is_zapping === true) {

            // PlayerController が初期化されているかの状態が変更されたときに実行するイベントを設定
            // false から true に変わったときにザッピングが終わったとみなす
            const unwatch_zapping = watch(() => player_store.is_player_initialized, (new_value, old_value) => {
                if (old_value === false && new_value === true) {
                    // 設定したウォッチャーを両方削除
                    unwatch_zapping();
                    unwatch_watching();
                    // キーボードショートカットイベントをキャンセル
                    if (this.abort_controller !== null) {
                        this.abort_controller.abort();
                        this.abort_controller = null;
                    }
                    console.log('[KeyboardShortcutManager] Destroyed. (Zapping finished)');
                }
            });

            // ザッピング中に視聴画面を離れたときに実行するイベントを設定
            // 設定しておかないと視聴画面を離れてもキーボードショートカットイベントがキャンセルされない
            // true から false に変わったときにザッピングがキャンセルされたとみなす
            const unwatch_watching = watch(() => player_store.is_watching, (new_value, old_value) => {
                if (old_value === true && new_value === false) {
                    // 設定したウォッチャーを両方削除
                    unwatch_zapping();
                    unwatch_watching();
                    // キーボードショートカットイベントをキャンセル
                    if (this.abort_controller !== null) {
                        this.abort_controller.abort();
                        this.abort_controller = null;
                    }
                    console.log('[KeyboardShortcutManager] Destroyed. (Zapping canceled)');
                }
            });

        // ザッピング中でなければ、即座にキーボードショートカットイベントをキャンセル
        } else {
            if (this.abort_controller !== null) {
                this.abort_controller.abort();
                this.abort_controller = null;
            }
            console.log('[KeyboardShortcutManager] Destroyed.');
        }
    }
}

export default KeyboardShortcutManager;
