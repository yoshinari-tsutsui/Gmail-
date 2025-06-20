import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, User, Calendar, AlertCircle, CheckSquare, Clock, AlertTriangle, Search, X } from 'lucide-react';

const Gmail = () => {
  const [emails, setEmails] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [activeTab, setActiveTab] = useState('emails');
  
  // 検索機能用のstate
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmails, setFilteredEmails] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);

  // タスク抽出のキーワードパターン
  const taskKeywords = [
    // 直接的な依頼
    '対応してください', '対応をお願い', '確認してください', '確認をお願い', 'お願いします',
    '検討してください', '検討をお願い', '回答してください', '回答をお願い',
    '作成してください', '作成をお願い', '修正してください', '修正をお願い',
    '送付してください', '送付をお願い', '提出してください', '提出をお願い',
    
    // 期限を含む表現
    'までに', '期限', 'deadline', 'due', '〜日まで', '〜時まで',
    '今日中', '明日まで', '今週中', '来週まで', '月末まで',
    
    // 質問形式
    'いかがでしょうか', 'どうでしょうか', 'はいかがですか',
    '教えてください', '知らせてください', '連絡してください',
    
    // 緊急性
    '緊急', '急ぎ', '至急', 'urgent', 'asap', '早急',
    
    // 確認・承認
    '承認', '確認', 'approve', 'review', 'check',
    
    // アクション系
     'action', 'todo', 'task', 'タスク', '課題', '宿題'
  ];

  // タスクの緊急度を判定
  const getTaskPriority = (subject, snippet) => {
    const text = (subject + ' ' + snippet).toLowerCase();
    const urgentKeywords = ['緊急', '急ぎ', '至急', 'urgent', 'asap', '早急', '今日中'];
    const mediumKeywords = ['明日まで', '今週中', '期限', 'deadline', 'due'];
    
    if (urgentKeywords.some(keyword => text.includes(keyword))) {
      return { level: 'high', label: '緊急', color: 'text-red-600 bg-red-50' };
    } else if (mediumKeywords.some(keyword => text.includes(keyword))) {
      return { level: 'medium', label: '中', color: 'text-yellow-600 bg-yellow-50' };
    }
    return { level: 'low', label: '通常', color: 'text-blue-600 bg-blue-50' };
  };

  // メールからタスクを抽出
  const extractTasks = (emails) => {
    const extractedTasks = emails.filter(email => {
      const searchText = (email.subject + ' ' + email.snippet).toLowerCase();
      return taskKeywords.some(keyword => searchText.includes(keyword));
    }).map(email => {
      const priority = getTaskPriority(email.subject, email.snippet);
      return {
        ...email,
        priority,
        extractedAt: new Date().toISOString()
      };
    });

    // 緊急度順にソート
    extractedTasks.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority.level] - priorityOrder[a.priority.level];
    });

    return extractedTasks;
  };

  // 検索フィルタリング関数
  const filterItems = (items, query) => {
    if (!query.trim()) return items;
    
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return items.filter(item => {
      const searchableText = `${item.subject} ${item.from} ${item.snippet}`.toLowerCase();
      return searchTerms.every(term => searchableText.includes(term));
    });
  };

  // 検索ハイライト関数
  const highlightText = (text, query) => {
    if (!query.trim()) return text;
    
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    let highlightedText = text;
    
    searchTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
    });
    
    return highlightedText;
  };

  // 検索処理
  useEffect(() => {
    setFilteredEmails(filterItems(emails, searchQuery));
    setFilteredTasks(filterItems(tasks, searchQuery));
  }, [emails, tasks, searchQuery]);

  // 検索クリア
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Gmail API設定
  const CLIENT_ID = '429790609827-0l8355kbpj6jfk49p2jsk16dchqr854j.apps.googleusercontent.com';
  const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

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
            } else {
              setError('認証に失敗しました');
            }
          },
          error_callback: (error) => {
            setError('認証エラー: ' + error.message);
          }
        });
      } else {
        setError('Google Identity Services が読み込まれていません');
      }
    } catch (err) {
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
      setError('サインインに失敗しました');
    }
  };

  const handleSignOut = () => {
    try {
      if (accessToken) {
        window.google.accounts.oauth2.revoke(accessToken, () => {
          setAccessToken('');
          setIsAuthenticated(false);
          setEmails([]);
          setTasks([]);
          setError('');
          setSearchQuery(''); // 検索もクリア
        });
      } else {
        setAccessToken('');
        setIsAuthenticated(false);
        setEmails([]);
        setTasks([]);
        setError('');
        setSearchQuery(''); // 検索もクリア
      }
    } catch (err) {
      setError('サインアウトに失敗しました');
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
          // より詳細な情報を取得するためにformatを変更
          const detailResponse = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (!detailResponse.ok) return null;
          
          const detail = await detailResponse.json();
          
          // ヘッダー情報を抽出する関数
          const getHeaderValue = (headers, name) => {
            const header = headers.find(h => 
              h.name && h.name.toLowerCase() === name.toLowerCase()
            );
            return header ? header.value : null;
          };
          
          const headers = detail.payload.headers || [];
          
          // 各ヘッダー情報を取得
          let subject = getHeaderValue(headers, 'Subject') || '件名なし';
          let from = getHeaderValue(headers, 'From') || '送信者不明';
          let date = getHeaderValue(headers, 'Date') || '';
          
          // Fromヘッダーから表示名を抽出（メールアドレスのみの場合もある）
          if (from && from.includes('<')) {
            // "Name <email@example.com>" 形式の場合
            const nameMatch = from.match(/^(.*?)\s*<.*>$/);
            if (nameMatch) {
              from = nameMatch[1].replace(/['"]/g, '').trim() || from;
            }
          }
          
          // 日付をパース
          let formattedDate = '日時不明';
          if (date) {
            try {
              const parsedDate = new Date(date);
              if (!isNaN(parsedDate.getTime())) {
                formattedDate = parsedDate.toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              }
            } catch (dateErr) {
              console.error('日付パースエラー:', dateErr);
            }
          }

          return {
            id: detail.id,
            subject: subject,
            from: from,
            date: formattedDate,
            snippet: detail.snippet || '内容のプレビューがありません',
            rawHeaders: headers // デバッグ用に生ヘッダーも保存
          };
        } catch (err) {
          console.error(`メッセージ詳細取得エラー (id: ${message.id}):`, err);
          return null;
        }
      });
      
      const resolvedEmails = (await Promise.all(emailPromises)).filter(Boolean);
      setEmails(resolvedEmails);
      
      // タスクを抽出
      const extractedTasks = extractTasks(resolvedEmails);
      setTasks(extractedTasks);
      
      setError(`✅ ${resolvedEmails.length}件のメールを取得しました！ (タスク: ${extractedTasks.length}件)`);

    } catch (err) {
      setError('メールの取得に失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
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

      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">認証</h2>
        {!isAuthenticated ? (
          <button onClick={handleSignIn} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors">
            Googleでサインイン
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center text-green-600">
              <User className="mr-2" size={20} />
              認証済み
            </div>
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
        <div className="mb-6">
          <button onClick={fetchEmails} disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center">
            <RefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} size={20} />
            {loading ? 'メール取得中...' : 'メールを取得'}
          </button>
        </div>
      )}

      {/* 検索ボックス */}
      {(emails.length > 0 || tasks.length > 0) && (
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="メールとタスクを検索... (件名、送信者、内容)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-2 text-sm text-gray-600">
              検索結果: メール {filteredEmails.length}件, タスク {filteredTasks.length}件
            </div>
          )}
        </div>
      )}

      {/* タブ切り替え */}
      {(emails.length > 0 || tasks.length > 0) && (
        <div className="mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('emails')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'emails'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="inline mr-2" size={20} />
              全メール ({searchQuery ? filteredEmails.length : emails.length})
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'tasks'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CheckSquare className="inline mr-2" size={20} />
              タスク ({searchQuery ? filteredTasks.length : tasks.length})
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {activeTab === 'emails' && (
          <>
            <h2 className="text-xl font-semibold">
              メール一覧 ({searchQuery ? filteredEmails.length : emails.length}件)
              {searchQuery && (
                <span className="text-sm text-gray-500 ml-2">
                  「{searchQuery}」の検索結果
                </span>
              )}
            </h2>
            {loading && <p className="text-gray-500 text-center py-8">読み込み中...</p>}
            {filteredEmails.length === 0 && !loading && emails.length > 0 && searchQuery && (
              <div className="text-center py-8">
                <Search className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-500">「{searchQuery}」に一致するメールが見つかりませんでした</p>
              </div>
            )}
            {filteredEmails.length === 0 && !loading && emails.length === 0 && !searchQuery && (
              <p className="text-gray-500 text-center py-8">メールがありません</p>
            )}
            {filteredEmails.map((email) => (
              <div key={email.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h3 
                    className="font-semibold text-lg text-gray-800 flex-1"
                    dangerouslySetInnerHTML={{ __html: highlightText(email.subject, searchQuery) }}
                  />
                  <div className="flex items-center text-gray-500 text-sm ml-4 whitespace-nowrap">
                    <Calendar size={16} className="mr-1" />{email.date}
                  </div>
                </div>
                <div className="flex items-center text-gray-600 text-sm mb-2">
                  <User size={16} className="mr-1" />
                  <span dangerouslySetInnerHTML={{ __html: highlightText(email.from, searchQuery) }} />
                </div>
                <p 
                  className="text-gray-700 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: highlightText(email.snippet, searchQuery) }}
                />
              </div>
            ))}
          </>
        )}

        {activeTab === 'tasks' && (
          <>
            <h2 className="text-xl font-semibold flex items-center">
              <CheckSquare className="mr-2" />
              対応が必要なタスク ({searchQuery ? filteredTasks.length : tasks.length}件)
              {searchQuery && (
                <span className="text-sm text-gray-500 ml-2">
                  「{searchQuery}」の検索結果
                </span>
              )}
            </h2>
            {loading && <p className="text-gray-500 text-center py-8">読み込み中...</p>}
            {filteredTasks.length === 0 && !loading && tasks.length > 0 && searchQuery && (
              <div className="text-center py-8">
                <Search className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-500">「{searchQuery}」に一致するタスクが見つかりませんでした</p>
              </div>
            )}
            {filteredTasks.length === 0 && !loading && tasks.length === 0 && emails.length > 0 && !searchQuery && (
              <div className="text-center py-8">
                <CheckSquare className="mx-auto mb-4 text-green-500" size={48} />
                <p className="text-gray-500">対応が必要なタスクはありません！</p>
              </div>
            )}
            {filteredTasks.length === 0 && !loading && emails.length === 0 && (
              <p className="text-gray-500 text-center py-8">まずメールを取得してください</p>
            )}
            {filteredTasks.map((task) => (
              <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-3 ${task.priority.color}`}>
                        {task.priority.level === 'high' && <AlertTriangle size={12} className="mr-1" />}
                        {task.priority.level === 'medium' && <Clock size={12} className="mr-1" />}
                        {task.priority.level === 'low' && <CheckSquare size={12} className="mr-1" />}
                        {task.priority.label}
                      </span>
                      <h3 
                        className="font-semibold text-lg text-gray-800"
                        dangerouslySetInnerHTML={{ __html: highlightText(task.subject, searchQuery) }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center text-gray-500 text-sm ml-4 whitespace-nowrap">
                    <Calendar size={16} className="mr-1" />{task.date}
                  </div>
                </div>
                <div className="flex items-center text-gray-600 text-sm mb-2">
                  <User size={16} className="mr-1" />
                  <span dangerouslySetInnerHTML={{ __html: highlightText(task.from, searchQuery) }} />
                </div>
                <p 
                  className="text-gray-700 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: highlightText(task.snippet, searchQuery) }}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default Gmail;