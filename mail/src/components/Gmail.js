import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, User, Calendar, AlertCircle } from 'lucide-react';

const Gmail = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState('');

  // Gmail API設定（実際の使用時は環境変数で管理）
  const CLIENT_ID = '963214323104-l7c17f6qgv0l3oemi4hf9ssfeu1ktjeo.apps.googleusercontent.com';
  const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

  // Google Identity Services初期化
  const initializeGIS = () => {
    try {
      if (window.google && window.google.accounts) {
        // OAuth2トークンクライアント初期化
        window.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (response) => {
            if (response.access_token) {
              setAccessToken(response.access_token);
              setIsAuthenticated(true);
              setError('');
              console.log('認証成功:', response);
            } else {
              setError('認証に失敗しました');
              console.error('認証エラー:', response);
            }
          },
          error_callback: (error) => {
            setError('認証エラー: ' + error.message);
            console.error('認証エラー:', error);
          }
        });

        console.log('Google Identity Services 初期化完了');
      } else {
        setError('Google Identity Services が読み込まれていません');
      }
    } catch (err) {
      console.error('GIS初期化エラー:', err);
      setError('Google Identity Services の初期化に失敗しました');
    }
  };

  // GAPI初期化（Gmail API用）
  const initializeGapi = async () => {
    try {
      if (window.gapi) {
        await new Promise((resolve) => {
          window.gapi.load('client', resolve);
        });
        
        await window.gapi.client.init({
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest']
        });
        
        console.log('GAPI 初期化完了');
      }
    } catch (err) {
      console.error('GAPI初期化エラー:', err);
      setError('Gmail API の初期化に失敗しました');
    }
  };

  // 認証処理
  const handleSignIn = () => {
    try {
      if (window.tokenClient) {
        window.tokenClient.requestAccessToken();
      } else {
        setError('認証クライアントが初期化されていません');
      }
    } catch (err) {
      console.error('サインインエラー:', err);
      setError('サインインに失敗しました');
    }
  };

  const handleSignOut = () => {
    try {
      if (accessToken) {
        // トークンを無効化
        window.google.accounts.oauth2.revoke(accessToken, () => {
          console.log('トークンが無効化されました');
        });
      }
      setAccessToken('');
      setIsAuthenticated(false);
      setEmails([]);
      setError('');
    } catch (err) {
      console.error('サインアウトエラー:', err);
      setError('サインアウトに失敗しました');
    }
  };

  // メール一覧取得
  const fetchEmails = async () => {
    if (!isAuthenticated || !accessToken) {
      setError('先に認証を行ってください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // アクセストークンを設定
      window.gapi.client.setToken({
        access_token: accessToken
      });

      // メッセージリスト取得
      const response = await window.gapi.client.gmail.users.messages.list({
        userId: 'me',
        maxResults: 10,
        q: 'in:inbox'
      });

      const messages = response.result.messages || [];
      const emailDetails = [];

      // 各メールの詳細取得
      for (const message of messages) {
        try {
          const detail = await window.gapi.client.gmail.users.messages.get({
            userId: 'me',
            id: message.id
          });

          const headers = detail.result.payload.headers || [];
          const subject = headers.find(h => h.name === 'Subject')?.value || '件名なし';
          const from = headers.find(h => h.name === 'From')?.value || '送信者不明';
          const date = headers.find(h => h.name === 'Date')?.value || '';

          // メール本文取得
          let body = '';
          try {
            if (detail.result.payload.body && detail.result.payload.body.data) {
              body = atob(detail.result.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            } else if (detail.result.payload.parts) {
              const textPart = detail.result.payload.parts.find(part => 
                part.mimeType === 'text/plain' || part.mimeType === 'text/html'
              );
              if (textPart && textPart.body && textPart.body.data) {
                body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
              }
            }
          } catch (decodeError) {
            console.warn('メール本文のデコードに失敗:', decodeError);
            body = 'メール本文を取得できませんでした';
          }

          emailDetails.push({
            id: message.id,
            subject,
            from,
            date: date ? new Date(date).toLocaleString('ja-JP') : '日時不明',
            body: body.substring(0, 200) + (body.length > 200 ? '...' : ''),
            snippet: detail.result.snippet || ''
          });
        } catch (messageError) {
          console.error('メッセージ取得エラー:', messageError);
        }
      }

      setEmails(emailDetails);
    } catch (err) {
      console.error('メール取得エラー:', err);
      setError('メールの取得に失敗しました: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  // モックデータでのデモ
  const fetchMockEmails = () => {
    setLoading(true);
    setError('');
    
    setTimeout(() => {
      const mockEmails = [
        {
          id: '1',
          subject: 'プロジェクトの進捗について',
          from: 'yamada@example.com',
          date: '2024/06/13 14:30:00',
          body: 'お疲れ様です。プロジェクトの進捗についてご報告いたします。現在の進捗率は80%となっており...',
          snippet: 'プロジェクトの進捗についてご報告いたします。'
        },
        {
          id: '2',
          subject: '会議の件',
          from: 'tanaka@example.com',
          date: '2024/06/13 13:15:00',
          body: '明日の会議についてお知らせします。時間は午後2時からとなります。議題は以下の通りです...',
          snippet: '明日の会議についてお知らせします。'
        },
        {
          id: '3',
          subject: 'システムメンテナンスのお知らせ',
          from: 'admin@example.com',
          date: '2024/06/13 10:00:00',
          body: 'システムメンテナンスを実施いたします。メンテナンス時間中はサービスをご利用いただけません...',
          snippet: 'システムメンテナンスを実施いたします。'
        }
      ];
      setEmails(mockEmails);
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    const initializeAPIs = async () => {
      // GAPI初期化を待つ
      const waitForGapi = () => {
        return new Promise((resolve) => {
          if (window.gapi) {
            resolve();
          } else {
            setTimeout(() => waitForGapi().then(resolve), 100);
          }
        });
      };

      // Google Identity Services初期化を待つ
      const waitForGIS = () => {
        return new Promise((resolve) => {
          if (window.google && window.google.accounts) {
            resolve();
          } else {
            setTimeout(() => waitForGIS().then(resolve), 100);
          }
        });
      };

      try {
        await Promise.all([waitForGapi(), waitForGIS()]);
        await initializeGapi();
        initializeGIS();
      } catch (err) {
        console.error('API初期化エラー:', err);
        setError('Google APIの初期化に失敗しました');
      }
    };

    initializeAPIs();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
          <Mail className="mr-3 text-blue-600" />
          Gmail取得システム
        </h1>
        <p className="text-gray-600">Gmail APIを使用してメールを取得・表示します</p>
      </div>

      {/* 認証セクション */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">認証</h2>
        {!isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-gray-600">Gmailにアクセスするには認証が必要です</p>
            <button
              onClick={handleSignIn}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Googleでサインイン
            </button>
            <div className="border-t pt-4">
              <p className="text-sm text-gray-500 mb-2">または、デモ用のモックデータを表示:</p>
              <button
                onClick={fetchMockEmails}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? 'データ読み込み中...' : 'モックデータで試す'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center text-green-600">
              <User className="mr-2" size={20} />
              認証済み
            </div>
            <button
              onClick={handleSignOut}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              サインアウト
            </button>
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
          <AlertCircle className="text-red-500 mr-2" size={20} />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* メール取得ボタン */}
      {isAuthenticated && (
        <div className="mb-6">
          <button
            onClick={fetchEmails}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center"
          >
            <RefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} size={20} />
            {loading ? 'メール取得中...' : 'メールを取得'}
          </button>
        </div>
      )}

      {/* メール一覧 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">メール一覧 ({emails.length}件)</h2>
        
        {emails.length === 0 && !loading && (
          <p className="text-gray-500 text-center py-8">メールがありません</p>
        )}

        {emails.map((email) => (
          <div key={email.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg text-gray-800 flex-1">{email.subject}</h3>
              <div className="flex items-center text-gray-500 text-sm ml-4">
                <Calendar size={16} className="mr-1" />
                {email.date}
              </div>
            </div>
            
            <div className="flex items-center text-gray-600 text-sm mb-2">
              <User size={16} className="mr-1" />
              {email.from}
            </div>
            
            <p className="text-gray-700 text-sm leading-relaxed">
              {email.snippet || email.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gmail;