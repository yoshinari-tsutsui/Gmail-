import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, User, Calendar, AlertCircle } from 'lucide-react';

const EmailFetcher = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Gmail API設定（実際の使用時は環境変数で管理）
  const CLIENT_ID = '963214323104-l7c17f6qgv0l3oemi4hf9ssfeu1ktjeo.apps.googleusercontent.com';
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';
  const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

  // Google API初期化
  const initializeGapi = async () => {
    try {
      if (window.gapi) {
        await window.gapi.load('client:auth2', async () => {
          await window.gapi.client.init({
            clientId: CLIENT_ID,
            discoveryDocs: [DISCOVERY_DOC],
            scope: SCOPES
          });
          
          const authInstance = window.gapi.auth2.getAuthInstance();
          setIsAuthenticated(authInstance.isSignedIn.get());
        });
      }
    } catch (err) {
      setError('Google API の初期化に失敗しました');
    }
  };

  // 認証処理
  const handleSignIn = async () => {
    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      await authInstance.signIn();
      setIsAuthenticated(true);
      setError('');
    } catch (err) {
      setError('認証に失敗しました');
    }
  };

  const handleSignOut = async () => {
    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      setIsAuthenticated(false);
      setEmails([]);
    } catch (err) {
      setError('サインアウトに失敗しました');
    }
  };

  // メール一覧取得
  const fetchEmails = async () => {
    if (!isAuthenticated) {
      setError('先に認証を行ってください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // メッセージリスト取得
      const response = await window.gapi.client.gmail.users.messages.list({
        userId: 'me',
        maxResults: 10,
        q: 'in:inbox' // 受信箱のメールのみ
      });

      const messages = response.result.messages || [];
      const emailDetails = [];

      // 各メールの詳細取得
      for (const message of messages) {
        const detail = await window.gapi.client.gmail.users.messages.get({
          userId: 'me',
          id: message.id
        });

        const headers = detail.result.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || '件名なし';
        const from = headers.find(h => h.name === 'From')?.value || '送信者不明';
        const date = headers.find(h => h.name === 'Date')?.value || '';

        // メール本文取得
        let body = '';
        if (detail.result.payload.body.data) {
          body = atob(detail.result.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } else if (detail.result.payload.parts) {
          const textPart = detail.result.payload.parts.find(part => 
            part.mimeType === 'text/plain' || part.mimeType === 'text/html'
          );
          if (textPart && textPart.body.data) {
            body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
        }

        emailDetails.push({
          id: message.id,
          subject,
          from,
          date: new Date(date).toLocaleString('ja-JP'),
          body: body.substring(0, 200) + (body.length > 200 ? '...' : ''),
          snippet: detail.result.snippet
        });
      }

      setEmails(emailDetails);
    } catch (err) {
      setError('メールの取得に失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // モックデータでのデモ（API未設定時）
  const fetchMockEmails = () => {
    setLoading(true);
    setTimeout(() => {
      const mockEmails = [
        {
          id: '1',
          subject: 'プロジェクトの進捗について',
          from: 'yamada@example.com',
          date: '2024/06/12 14:30:00',
          body: 'お疲れ様です。プロジェクトの進捗についてご報告いたします。現在の進捗率は80%となっており...',
          snippet: 'プロジェクトの進捗についてご報告いたします。'
        },
        {
          id: '2',
          subject: '会議の件',
          from: 'tanaka@example.com',
          date: '2024/06/12 13:15:00',
          body: '明日の会議についてお知らせします。時間は午後2時からとなります。議題は以下の通りです...',
          snippet: '明日の会議についてお知らせします。'
        },
        {
          id: '3',
          subject: 'システムメンテナンスのお知らせ',
          from: 'admin@example.com',
          date: '2024/06/12 10:00:00',
          body: 'システムメンテナンスを実施いたします。メンテナンス時間中はサービスをご利用いただけません...',
          snippet: 'システムメンテナンスを実施いたします。'
        }
      ];
      setEmails(mockEmails);
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    // Google API スクリプトの動的読み込み
    if (!window.gapi) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = initializeGapi;
      document.body.appendChild(script);
    } else {
      initializeGapi();
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
          <Mail className="mr-3 text-blue-600" />
          メール取得システム
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

      {/* 使用方法 */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2">使用方法</h3>
        <ol className="text-sm text-gray-700 space-y-1">
          <li>1. Google Cloud Consoleでプロジェクトを作成し、Gmail APIを有効化</li>
          <li>2. OAuth 2.0クライアントID（CLIENT_ID）を取得してコードに設定</li>
          <li>3. OAuth同意画面を設定（スコープ: gmail.readonly）</li>
          <li>4. 「Googleでサインイン」ボタンで認証</li>
          <li>5. 「メールを取得」ボタンでメールデータを取得</li>
        </ol>
        <p className="text-xs text-gray-500 mt-2">
          ※ Gmail APIはOAuth 2.0認証のみを使用し、APIキーは不要です
        </p>
      </div>
    </div>
  );
};

export default EmailFetcher;