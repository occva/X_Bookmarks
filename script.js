// 格式化时间
function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days}天前`;
    } else if (hours > 0) {
        return `${hours}小时前`;
    } else if (minutes > 0) {
        return `${minutes}分钟前`;
    } else {
        return '刚刚';
    }
}

// 格式化数字
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// 创建媒体元素
function createMediaElement(media, tweetId) {
    if (!media || media.length === 0) return '';
    
    // 过滤掉无效的媒体
    const validMedia = media.filter(m => (m.original || m.thumbnail) && (m.original || m.thumbnail).trim() !== '');
    if (validMedia.length === 0) return '';
    
    if (validMedia.length === 1) {
        const imgUrl = validMedia[0].original || validMedia[0].thumbnail;
        if (!imgUrl) return '';
        // 单图：使用 onload 检测图片尺寸，判断是否为长图
        return `
            <div class="tweet-media" data-tweet-id="${tweetId}" data-image-index="0">
                <img src="${imgUrl}" alt="推文图片" loading="lazy" data-original="${imgUrl}" 
                     onload="handleImageLoad(this)" onerror="this.style.display='none'" />
            </div>
        `;
    }
    
    const gridClass = validMedia.length === 2 ? 'two-images' : 
                     validMedia.length === 3 ? 'three-images' : 'four-images';
    
    const images = validMedia.map((m, index) => {
        const imgUrl = m.original || m.thumbnail;
        if (!imgUrl) return '';
        return `<img src="${imgUrl}" alt="推文图片" loading="lazy" data-original="${imgUrl}" 
                     data-tweet-id="${tweetId}" data-image-index="${index}"
                     onload="handleImageLoad(this)" onerror="this.style.display='none'" />`;
    }).filter(img => img !== '').join('');
    
    if (!images) return '';
    
    return `
        <div class="tweet-media-grid ${gridClass}" data-tweet-id="${tweetId}">
            ${images}
        </div>
    `;
}

// 处理图片加载，根据宽高比添加相应类（全局函数，供 onload 调用）
window.handleImageLoad = function(img) {
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    if (!naturalWidth || !naturalHeight) return;
    
    const aspectRatio = naturalWidth / naturalHeight;
    const container = img.closest('.tweet-media');
    
    if (container) {
        // 单图处理
        if (aspectRatio < 0.7) {
            // 竖图（长图）- 高度大于宽度很多
            container.classList.add('tall-image');
        } else if (aspectRatio > 1.5) {
            // 横图（宽图）- 宽度大于高度很多
            container.classList.add('wide-image');
        }
    }
};

// 创建引用推文卡片
function createQuotedTweet(quotedTweet) {
    if (!quotedTweet) return '';
    
    // 尝试多种路径获取数据，确保能获取到内容
    const quotedText = quotedTweet.legacy?.full_text || quotedTweet.note_tweet?.note_tweet_results?.result?.text || '';
    const quotedMedia = quotedTweet.legacy?.extended_entities?.media || quotedTweet.legacy?.entities?.media || [];
    const quotedUser = quotedTweet.core?.user_results?.result || quotedTweet.user;
    const quotedName = quotedUser?.legacy?.name || quotedUser?.core?.name || quotedUser?.name || '未知用户';
    const quotedScreenName = quotedUser?.legacy?.screen_name || quotedUser?.core?.screen_name || quotedUser?.screen_name || '';
    const quotedAvatar = quotedUser?.avatar?.image_url || quotedUser?.legacy?.profile_image_url_https || quotedUser?.profile_image_url || '';
    const quotedTime = quotedTweet.legacy?.created_at ? formatTime(quotedTweet.legacy.created_at) : '';
    const quotedId = quotedTweet.rest_id || quotedTweet.id || '';
    const quotedUrl = quotedScreenName && quotedId ? `https://twitter.com/${quotedScreenName}/status/${quotedId}` : '#';
    
    // 处理引用推文的媒体 - 确保所有媒体都能渲染
    let quotedMediaHtml = '';
    if (quotedMedia && quotedMedia.length > 0) {
        const mediaArray = quotedMedia.map(m => ({
            original: m.media_url_https || m.url || m.original || '',
            thumbnail: m.media_url_https || m.url || m.thumbnail || ''
        })).filter(m => m.original || m.thumbnail); // 过滤掉无效的媒体
        if (mediaArray.length > 0) {
            quotedMediaHtml = createMediaElement(mediaArray, `quoted-${quotedId}`);
        }
    }
    
    // 创建引用推文对象用于格式化文本
    const quotedTweetObj = {
        metadata: {
            legacy: {
                entities: quotedTweet.legacy?.entities || {}
            }
        }
    };
    const quotedTextHtml = quotedText ? formatTweetText(quotedText, quotedTweetObj) : '';
    
    // 确保至少有一些内容才渲染
    if (!quotedText && !quotedMediaHtml) return '';
    
    return `
        <div class="quoted-tweet" data-quoted-id="${quotedId}">
            <div class="quoted-tweet-header">
                <a href="${quotedUrl}" target="_blank" rel="noopener noreferrer" class="quoted-tweet-avatar-link">
                    <img src="${quotedAvatar || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\'%3E%3Crect width=\'20\' height=\'20\' fill=\'%23333\'/%3E%3C/svg%3E'}" alt="${quotedName}" class="quoted-tweet-avatar" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\'%3E%3Crect width=\'20\' height=\'20\' fill=\'%23333\'/%3E%3C/svg%3E'" />
                </a>
                <div class="quoted-tweet-user-info">
                    <span class="quoted-tweet-name">${escapeHtml(quotedName)}</span>
                    ${quotedScreenName ? `<span class="quoted-tweet-handle">@${escapeHtml(quotedScreenName)}</span>` : ''}
                    ${quotedTime ? `<span class="quoted-tweet-time">${quotedTime}</span>` : ''}
                </div>
            </div>
            ${quotedTextHtml ? `<div class="quoted-tweet-text">${quotedTextHtml}</div>` : ''}
            ${quotedMediaHtml}
        </div>
    `;
}

// 创建推文卡片
function createTweetCard(tweet) {
    // 确保所有数据都能获取到，使用多种路径尝试
    const mediaHtml = createMediaElement(tweet.media || [], tweet.id);
    const timeAgo = formatTime(tweet.created_at);
    
    // 处理文本展开/收起 - 尝试多种路径获取文本
    const fullText = tweet.full_text || 
                     tweet.metadata?.note_tweet?.note_tweet_results?.result?.text || 
                     tweet.metadata?.legacy?.full_text || 
                     '';
    const isLongText = fullText.length > 280;
    
    // 为长文本创建唯一ID
    const textId = `tweet-text-${tweet.id}`;
    let textHtml = '';
    
    if (fullText) {
        if (isLongText) {
            // 智能截断：尽量在单词边界截断，避免截断URL
            let truncatedText = fullText.substring(0, 280);
            // 如果截断位置在URL中间，向前找到URL开始位置
            const urlMatch = truncatedText.match(/https?:\/\/[^\s]*$/);
            if (urlMatch) {
                // 如果截断了URL，截断到URL之前
                truncatedText = truncatedText.substring(0, truncatedText.length - urlMatch[0].length).trim();
            } else {
                // 尝试在空格处截断
                const lastSpace = truncatedText.lastIndexOf(' ');
                if (lastSpace > 200) {
                    truncatedText = truncatedText.substring(0, lastSpace);
                }
            }
            truncatedText += '...';
            
            const fullTextHtml = formatTweetText(fullText, tweet);
            const truncatedTextHtml = formatTweetText(truncatedText, tweet);
            
            textHtml = `
                <div class="tweet-text-wrapper">
                    <div class="tweet-text tweet-text-truncated" id="${textId}-truncated">${truncatedTextHtml}</div>
                    <div class="tweet-text tweet-text-full" id="${textId}-full" style="display: none;">${fullTextHtml}</div>
                    <button class="tweet-expand-btn" data-text-id="${textId}">展开</button>
                </div>
            `;
        } else {
            const fullTextHtml = formatTweetText(fullText, tweet);
            textHtml = `<div class="tweet-text">${fullTextHtml}</div>`;
        }
    }
    
    // 处理引用推文 - 尝试多种路径
    let quotedTweetHtml = '';
    if (tweet.metadata?.quoted_status_result?.result) {
        quotedTweetHtml = createQuotedTweet(tweet.metadata.quoted_status_result.result);
    } else if (tweet.quoted_status) {
        // 如果 quoted_status 是 ID，尝试从其他地方获取
        quotedTweetHtml = '';
    }
    
    // 确保用户信息存在
    const userName = tweet.name || '未知用户';
    const userScreenName = tweet.screen_name || '';
    const userAvatar = tweet.profile_image_url || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%23333\'/%3E%3C/svg%3E';
    const tweetUrl = tweet.url || '#';
    
    return `
        <article class="tweet-card" data-id="${tweet.id}">
            <div class="tweet-header">
                <a href="${tweetUrl}" target="_blank" rel="noopener noreferrer" class="tweet-avatar-link">
                    <img src="${userAvatar}" alt="${userName}" class="tweet-avatar" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%23333\'/%3E%3C/svg%3E'" />
                </a>
                <div class="tweet-content">
                    <div class="tweet-user-info">
                        <span class="tweet-user-name">${escapeHtml(userName)}</span>
                        ${userScreenName ? `<span class="tweet-user-handle">@${escapeHtml(userScreenName)}</span>` : ''}
                        <span class="tweet-time">${timeAgo}</span>
                    </div>
                    ${textHtml}
                    ${mediaHtml}
                    ${quotedTweetHtml}
                    <div class="tweet-actions">
                        <button class="tweet-action reply" title="回复">
                            <svg viewBox="0 0 24 24">
                                <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.47-4 6.92l-2.619 1.377L11.35 19l-4.005-2.114c-1.66.87-3.594 1.114-5.594.514v-7.4z"/>
                            </svg>
                            <span class="tweet-action-count">${formatNumber(tweet.reply_count || 0)}</span>
                        </button>
                        <button class="tweet-action retweet" title="转推">
                            <svg viewBox="0 0 24 24">
                                <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.791-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.791 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
                            </svg>
                            <span class="tweet-action-count">${formatNumber(tweet.retweet_count || 0)}</span>
                        </button>
                        <button class="tweet-action like ${tweet.favorited ? 'active' : ''}" title="喜欢">
                            <svg viewBox="0 0 24 24">
                                <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"/>
                            </svg>
                            <span class="tweet-action-count">${formatNumber(tweet.favorite_count || 0)}</span>
                        </button>
                        <button class="tweet-action bookmark ${tweet.bookmarked ? 'active' : ''}" title="书签">
                            <svg viewBox="0 0 24 24">
                                <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z"/>
                            </svg>
                            <span class="tweet-action-count">${formatNumber(tweet.bookmark_count || 0)}</span>
                        </button>
                    </div>
                </div>
            </div>
        </article>
    `;
}

// HTML 转义
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 切换推文文本展开/收起
function toggleTweetText(button) {
    const textId = button.dataset.textId;
    if (!textId) return;
    
    const truncatedDiv = document.getElementById(textId + '-truncated');
    const fullDiv = document.getElementById(textId + '-full');
    
    if (!truncatedDiv || !fullDiv) return;
    
    if (truncatedDiv.style.display === 'none') {
        // 收起
        truncatedDiv.style.display = 'block';
        fullDiv.style.display = 'none';
        button.textContent = '展开';
    } else {
        // 展开
        truncatedDiv.style.display = 'none';
        fullDiv.style.display = 'block';
        button.textContent = '收起';
    }
}

// 格式化推文文本（处理链接）
function formatTweetText(text, tweet) {
    if (!text) return '';
    
    // 获取推文中的 URL 映射（短链接 -> 展开链接和显示链接）
    const urlMap = {};
    const displayUrlMap = {};
    // 尝试多种路径获取 URLs
    const urls = tweet?.metadata?.legacy?.entities?.urls || 
                 tweet?.metadata?.legacy?.extended_entities?.urls ||
                 tweet?.entities?.urls || 
                 [];
    
    if (urls && urls.length > 0) {
        urls.forEach(urlEntity => {
            if (urlEntity.url && urlEntity.expanded_url) {
                urlMap[urlEntity.url] = urlEntity.expanded_url;
                // 优先使用 display_url，如果没有则使用 expanded_url
                displayUrlMap[urlEntity.url] = urlEntity.display_url || urlEntity.expanded_url;
            }
        });
    }
    
    // 先转义 HTML，避免 XSS
    let formatted = escapeHtml(text);
    
    // 使用临时标记来避免在已处理的链接内再次处理
    const PLACEHOLDER_PREFIX = '___LINK_PLACEHOLDER_';
    const placeholders = [];
    let placeholderIndex = 0;
    
    // 第一步：处理 URL，用占位符替换，并使用展开的 URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formatted = formatted.replace(urlRegex, function(shortUrl) {
        const placeholder = PLACEHOLDER_PREFIX + placeholderIndex;
        // 使用展开的 URL 作为跳转链接
        const expandedUrl = urlMap[shortUrl] || shortUrl;
        
        // 判断是否为 t.co 短链接
        const isTcoLink = /t\.co/.test(shortUrl);
        
        // 如果是 t.co 链接且有展开链接，显示原始链接；否则显示短链接
        let displayUrl;
        if (isTcoLink && displayUrlMap[shortUrl]) {
            displayUrl = displayUrlMap[shortUrl];
        } else if (isTcoLink && expandedUrl && expandedUrl !== shortUrl) {
            displayUrl = expandedUrl;
        } else {
            displayUrl = shortUrl;
        }
        
        placeholders[placeholderIndex] = '<a href="' + expandedUrl.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener noreferrer" class="tweet-link" style="color: #1d9bf0; text-decoration: none;">' + displayUrl + '</a>';
        placeholderIndex++;
        return placeholder;
    });
    
    // 第二步：处理 @用户名
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    formatted = formatted.replace(mentionRegex, function(match, username) {
        return '<a href="https://twitter.com/' + username + '" target="_blank" rel="noopener noreferrer" class="tweet-link" style="color: #1d9bf0; text-decoration: none;">@' + username + '</a>';
    });
    
    // 第三步：处理 #话题
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
    formatted = formatted.replace(hashtagRegex, function(match, hashtag) {
        return '<a href="https://twitter.com/hashtag/' + hashtag + '" target="_blank" rel="noopener noreferrer" class="tweet-link" style="color: #1d9bf0; text-decoration: none;">#' + hashtag + '</a>';
    });
    
    // 第四步：恢复 URL 占位符
    for (let i = 0; i < placeholderIndex; i++) {
        const placeholder = PLACEHOLDER_PREFIX + i;
        formatted = formatted.replace(placeholder, placeholders[i]);
    }
    
    return formatted;
}

// 存储推文数据
let tweetsData = [];

// 渲染推文
function renderTweets(tweets) {
    const container = document.getElementById('tweets-container');
    const totalTweetsEl = document.getElementById('total-tweets');
    
    if (!tweets || tweets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                </svg>
                <p>暂无书签</p>
            </div>
        `;
        return;
    }
    
    // 按时间倒序排列（最新的在前）
    tweets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // 更新统计信息
    totalTweetsEl.textContent = tweets.length;
    
    // 渲染推文
    container.innerHTML = tweets.map(tweet => createTweetCard(tweet)).join('');
    
    // 添加展开/收起按钮事件
    container.querySelectorAll('.tweet-expand-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡，避免触发推文跳转
            toggleTweetText(btn);
        });
    });
    
    // 添加链接点击事件，阻止冒泡
    container.addEventListener('click', (e) => {
        // 如果点击的是链接，阻止事件冒泡，让链接正常跳转
        if (e.target.tagName === 'A' || e.target.closest('a.tweet-link')) {
            e.stopPropagation();
            return;
        }
    });
    
    // 添加推文卡片点击事件 - 点击其他位置展开/收起内容
    container.addEventListener('click', (e) => {
        // 如果点击的是头像链接，跳转到原推文
        if (e.target.closest('a.tweet-avatar-link') || e.target.closest('a.quoted-tweet-avatar-link')) {
            return; // 让链接正常跳转
        }
        
        // 如果点击的是图片，不触发展开/收起
        if (e.target.tagName === 'IMG' && (e.target.closest('.tweet-media') || e.target.closest('.tweet-media-grid'))) {
            return;
        }
        
        // 如果点击的是展开按钮，不触发展开/收起（按钮自己处理）
        if (e.target.classList.contains('tweet-expand-btn')) {
            return;
        }
        
        // 如果点击的是链接，不触发展开/收起
        if (e.target.tagName === 'A' || e.target.closest('a.tweet-link')) {
            return;
        }
        
        // 如果点击的是操作按钮，不触发展开/收起
        if (e.target.closest('.tweet-actions')) {
            return;
        }
        
        // 点击推文其他位置，展开/收起内容
        const tweetCard = e.target.closest('.tweet-card');
        if (tweetCard) {
            const textId = `tweet-text-${tweetCard.dataset.id}`;
            const truncatedDiv = document.getElementById(textId + '-truncated');
            const fullDiv = document.getElementById(textId + '-full');
            const expandBtn = tweetCard.querySelector('.tweet-expand-btn');
            
            if (truncatedDiv && fullDiv && expandBtn) {
                // 切换展开/收起
                if (truncatedDiv.style.display === 'none') {
                    // 收起
                    truncatedDiv.style.display = 'block';
                    fullDiv.style.display = 'none';
                    expandBtn.textContent = '展开';
                } else {
                    // 展开
                    truncatedDiv.style.display = 'none';
                    fullDiv.style.display = 'block';
                    expandBtn.textContent = '收起';
                }
            }
        }
    });
    
    // 添加图片点击放大功能
    setupImageModal(tweets);
}

// 从文件加载推文
function loadTweetsFromFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const tweets = JSON.parse(e.target.result);
            tweetsData = tweets;
            renderTweets(tweets);
            
            // 显示文件名
            const fileNameEl = document.getElementById('file-name');
            fileNameEl.textContent = `已加载: ${file.name}`;
            fileNameEl.style.color = '#1d9bf0';
        } catch (error) {
            console.error('解析 JSON 失败:', error);
            document.getElementById('tweets-container').innerHTML = `
                <div class="empty-state">
                    <p style="color: #f4212e;">JSON 文件格式错误，请检查文件内容</p>
                </div>
            `;
        }
    };
    
    reader.onerror = function() {
        document.getElementById('tweets-container').innerHTML = `
            <div class="empty-state">
                <p style="color: #f4212e;">读取文件失败</p>
            </div>
        `;
    };
    
    reader.readAsText(file);
}

// 尝试从 URL 加载（如果使用本地服务器）
async function loadTweetsFromURL() {
    try {
        const response = await fetch('twitter-书签-1764420077117.json');
        if (response.ok) {
            const tweets = await response.json();
            tweetsData = tweets;
            renderTweets(tweets);
            
            // 隐藏文件选择按钮
            document.querySelector('.file-upload-area').style.display = 'none';
            return true;
        }
    } catch (error) {
        // 如果无法从 URL 加载，显示文件选择器
        console.log('无法从 URL 加载，请使用文件选择器');
    }
    return false;
}

// 图片放大模态框功能
let currentImageIndex = 0;
let currentImages = [];

function setupImageModal(tweets) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const modalClose = document.getElementById('modal-close');
    const modalPrev = document.getElementById('modal-prev');
    const modalNext = document.getElementById('modal-next');
    const modalCounter = document.getElementById('modal-counter');
    
    // 收集所有图片
    const allImages = [];
    tweets.forEach(tweet => {
        if (tweet.media && tweet.media.length > 0) {
            tweet.media.forEach((media, index) => {
                allImages.push({
                    url: media.original || media.thumbnail,
                    tweetId: tweet.id,
                    index: index
                });
            });
        }
    });
    
    // 图片点击事件
    document.querySelectorAll('.tweet-media img, .tweet-media-grid img').forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            const imgUrl = img.dataset.original || img.src;
            
            // 找到当前图片在所有图片中的索引
            currentImageIndex = allImages.findIndex(img => img.url === imgUrl);
            if (currentImageIndex === -1) {
                currentImageIndex = 0;
            }
            
            currentImages = allImages;
            showImageModal(currentImageIndex);
        });
    });
    
    // 显示图片模态框
    function showImageModal(index) {
        if (currentImages.length === 0) return;
        
        if (index < 0) index = currentImages.length - 1;
        if (index >= currentImages.length) index = 0;
        
        currentImageIndex = index;
        const image = currentImages[currentImageIndex];
        modalImage.src = image.url;
        modal.classList.add('active');
        
        // 更新计数器
        if (currentImages.length > 1) {
            modalCounter.textContent = `${currentImageIndex + 1} / ${currentImages.length}`;
            modalCounter.style.display = 'block';
        } else {
            modalCounter.style.display = 'none';
        }
        
        // 显示/隐藏导航按钮
        if (currentImages.length > 1) {
            modalPrev.style.display = 'flex';
            modalNext.style.display = 'flex';
        } else {
            modalPrev.style.display = 'none';
            modalNext.style.display = 'none';
        }
        
        document.body.style.overflow = 'hidden';
    }
    
    // 关闭模态框
    function closeImageModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // 上一张
    function prevImage() {
        showImageModal(currentImageIndex - 1);
    }
    
    // 下一张
    function nextImage() {
        showImageModal(currentImageIndex + 1);
    }
    
    // 事件绑定
    modalClose.addEventListener('click', closeImageModal);
    modalPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        prevImage();
    });
    modalNext.addEventListener('click', (e) => {
        e.stopPropagation();
        nextImage();
    });
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeImageModal();
        }
    });
    
    // 键盘导航
    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('active')) return;
        
        if (e.key === 'Escape') {
            closeImageModal();
        } else if (e.key === 'ArrowLeft') {
            prevImage();
        } else if (e.key === 'ArrowRight') {
            nextImage();
        }
    });
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 先尝试从 URL 加载（如果使用本地服务器）
    loadTweetsFromURL();
    
    // 设置文件选择器
    const fileInput = document.getElementById('json-file-input');
    const loadBtn = document.getElementById('load-file-btn');
    
    loadBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            loadTweetsFromFile(file);
        }
    });
});

