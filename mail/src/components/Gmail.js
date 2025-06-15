import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, User, Calendar, AlertCircle } from 'lucide-react';

const Gmail = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState('');

  // Gmail API設定（実際の使用時は環境変数で管理することが推奨されます）
  const CLIENT_ID = '963214323104-7plnpamhvqmbvj33glerdi1tgl38c25o.apps.googleusercontent.com';
  const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

  console.log('使用中のクライアントID:', CLIENT_ID);

  const initializeGIS = () => {
    try {
      if (window.google && window.google.accounts) {
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

  const handleSignIn = () => {
    try {
      if (window.tokenClient) {
        window.tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        setError('認証クライアントが初期化されていません');
      }
    } catch (err) {
      console.error('サインインエラー:', err);
      setError('サインインに失敗しました');
    }
  };
  
  const resetAuthentication = () => {
    try {
      const startNewAuthFlow = () => {
        console.log('新しい認証フローを開始...');
        if (window.tokenClient) {
          window.tokenClient.requestAccessToken({ prompt: 'consent' });
        }
      };
      
      const currentToken = accessToken;
      setAccessToken('');
      setIsAuthenticated(false);
      setEmails([]);
      setError('');
      
      if (window.google && window.google.accounts.oauth2 && currentToken) {
        window.google.accounts.oauth2.revoke(currentToken, () => {
          console.log('トークンが無効化されました。');
          startNewAuthFlow();
        });
      } else {
        startNewAuthFlow();
      }
    } catch (err) {
      console.error('認証リセットエラー:', err);
      setError('認証のリセットに失敗しました');
    }
  };

  const handleSignOut = () => {
    try {
      if (accessToken) {
        window.google.accounts.oauth2.revoke(accessToken, () => {
          console.log('トークンが無効化されました');
          setAccessToken('');
          setIsAuthenticated(false);
          setEmails([]);
          setError('');
        });
      } else {
        setAccessToken('');
        setIsAuthenticated(false);
        setEmails([]);
        setError('');
      }
    } catch (err) {
      console.error('サインアウトエラー:', err);
      setError('サインアウトに失敗しました');
    }
  };

  // API接続テスト
  const testApiConnection = async () => {
    // ★★★ このデバッグ用console.logを追加 ★★★
    console.log('API接続テスト実行時のアクセストークン:', accessToken);

    if (!isAuthenticated || !accessToken) {
      setError('先に認証を行ってください');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await response.json();
      if (response.ok) {
        console.log('API接続テスト成功:', data);
        setError(`✅ API接続テスト成功！ (Email: ${data.emailAddress})`);
      } else {
        console.error('API接続テストエラー:', data);
        setError(`❌ API接続テスト失敗: ${data.error?.message || response.statusText}`);
      }
    } catch (err) {
      console.error('API接続テスト例外:', err);
      setError('❌ API接続テストに失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmails = async () => {
    if (!isAuthenticated || !accessToken) {
      setError('先に認証を行ってください');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const listResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=in:inbox', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        throw new Error(`メッセージリストの取得に失敗 (${listResponse.status}): ${errorText}`);
      }
      const listData = await listResponse.json();
      const messages = listData.messages || [];

      if (messages.length === 0) {
        setEmails([]);
        setError('メールボックスにメッセージがありません');
        setLoading(false);
        return;
      }

      const emailPromises = messages.map(async (message) => {
        try {
          const detailResponse = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=Subject,From,Date`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (!detailResponse.ok) return null;
          
          const detail = await detailResponse.json();
          const headers = detail.payload.headers || [];
          const subject = headers.find(h => h.name === 'Subject')?.value || '件名なし';
          const from = headers.find(h => h.name === 'From')?.value || '送信者不明';
          const date = headers.find(h => h.name === 'Date')?.value || '';

          return {
            id: detail.id,
            subject,
            from,
            date: date ? new Date(date).toLocaleString('ja-JP') : '日時不明',
            snippet: detail.snippet || '内容のプレビューがありません'
          };
        } catch (err) {
          console.error(`メッセージ(id: ${message.id})の詳細取得エラー:`, err);
          return null;
        }
      });
      
      const resolvedEmails = (await Promise.all(emailPromises)).filter(Boolean);
      setEmails(resolvedEmails);
      setError(`✅ ${resolvedEmails.length}件のメールを取得しました！`);

    } catch (err) {
      console.error('メール取得エラー:', err);
      setError('メールの取得に失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMockEmails = () => {
    setLoading(true);
    setError('');
    setTimeout(() => {
      const mockEmails = [
        { id: '1', subject: 'プロジェクトの進捗について', from: 'yamada@example.com', date: '2024/06/15 14:30:00', snippet: 'プロジェクトの進捗についてご報告いたします。現在の進捗率は80%となっており...' },
        { id: '2', subject: '会議の件', from: 'tanaka@example.com', date: '2024/06/15 13:15:00', snippet: '明日の会議についてお知らせします。時間は午後2時からとなります。' },
        { id: '3', subject: 'システムメンテナンスのお知らせ', from: 'admin@example.com', date: '2024/06/15 10:00:00', snippet: 'システムメンテナンスを実施いたします。メンテナンス時間中はサービスをご利用いただけません...' }
      ];
      setEmails(mockEmails);
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    const initializeAPIs = async () => {
      const waitForGIS = () => new Promise((resolve, reject) => {
        let attempts = 0;
        const interval = setInterval(() => {
          if (window.google && window.google.accounts) {
            clearInterval(interval);
            resolve();
          } else if (++attempts > 50) {
            clearInterval(interval);
            reject(new Error('Google Identity Servicesの読み込みがタイムアウトしました。'));
          }
        }, 100);
      });

      try {
        await waitForGIS();
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
          Gmail取得システム (デバッグ版)
        </h1>
        <p className="text-gray-600">Gmail APIを使用してメールを取得・表示します</p>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 text-orange-800">🔧 重要：問題解決方法</h3>
        <p className="text-gray-700">Gmail APIを利用するには、Google Cloudプロジェクトで課金が有効になっている必要があります。（無料枠内で利用可能です）</p>
        <a href="https://console.cloud.google.com/billing" target="_blank" rel="noopener noreferrer" className="inline-block mt-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
          課金設定ページを開く
        </a>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">設定確認</h3>
        <div className="text-sm space-y-1">
          <p><strong>クライアントID:</strong> {CLIENT_ID ? '✅ 設定済み' : '❌ 未設定'}</p>
          <p><strong>現在のドメイン:</strong> {typeof window !== 'undefined' ? window.location.origin : 'N/A'}</p>
          <p><strong>Google Identity Services:</strong> {window.google?.accounts ? '✅ 読み込み済み' : '❌ 未読み込み'}</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">認証</h2>
        {!isAuthenticated ? (
          <div className="space-y-4">
            <div className="flex space-x-4">
              <button onClick={handleSignIn} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors">
                Googleでサインイン
              </button>
              <button onClick={resetAuthentication} className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors">
                🔄 認証をリセット
              </button>
            </div>
            <div className="border-t pt-4">
              <button onClick={fetchMockEmails} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400">
                {loading ? 'データ読み込み中...' : 'モックデータで試す'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center text-green-600"><User className="mr-2" size={20} />認証済み</div>
            <p className="text-sm text-gray-600">アクセストークン: {accessToken ? '取得済み' : '未取得'}</p>
            <button onClick={handleSignOut} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
              サインアウト
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className={`border rounded-lg p-4 mb-6 flex items-start ${error.includes('✅') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <AlertCircle className={`mr-3 flex-shrink-0 mt-1 ${error.includes('✅') ? 'text-green-500' : 'text-red-500'}`} size={20} />
          <p>{error}</p>
        </div>
      )}

      {isAuthenticated && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-4">
            <button onClick={testApiConnection} disabled={loading} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center">
              <AlertCircle className={`mr-2 ${loading ? 'animate-spin' : ''}`} size={20} />
              {loading ? 'テスト中...' : 'API接続テスト'}
            </button>
            <button onClick={fetchEmails} disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center">
              <RefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} size={20} />
              {loading ? 'メール取得中...' : 'メールを取得'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">メール一覧 ({emails.length}件)</h2>
        {loading && <p className="text-gray-500 text-center py-8">読み込み中...</p>}
        {emails.length === 0 && !loading && <p className="text-gray-500 text-center py-8">メールがありません</p>}
        {emails.map((email) => (
          <div key={email.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg text-gray-800 flex-1">{email.subject}</h3>
              <div className="flex items-center text-gray-500 text-sm ml-4 whitespace-nowrap">
                <Calendar size={16} className="mr-1" />{email.date}
              </div>
            </div>
            <div className="flex items-center text-gray-600 text-sm mb-2">
              <User size={16} className="mr-1" />{email.from}
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">{email.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gmail;