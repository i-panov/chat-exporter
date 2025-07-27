// Этот скрипт выполняется на странице сайта

function cleanTextForJSON(text) {
    if (typeof text !== 'string') return '';
    
    return text
        // Заменяем все двойные кавычки на одинарные
        .replace(/"/g, "'")
        // Удаляем непечатаемые символы
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
        // Заменяем проблемные Unicode символы
        .replace(/[\u2028\u2029]/g, ' ')
        // Экранируем обратные слеши (первым!)
        .replace(/\\/g, '\\\\')
        // Нормализуем пробелы
        .replace(/\s+/g, ' ')
        .trim();
}

function parseDeepSeek() {
    const result = [];
    const messages = document.querySelectorAll('.scrollable:last-child > div:first-child > div:first-child > div');

    for (const m of messages) {
        if (m.classList.length === 1) {
            const text = m.textContent.trim();

            if (text) {
                result.push({
                    role: 'user',
                    text: cleanTextForJSON(text),
                });
            }
        } else {
            const answer = m.querySelector('.ds-markdown');

            if (!answer) continue;

            const answerText = answer.textContent.trim();

            if (!answerText) continue;

            const msg = {
                role: 'assistant',
            };

            const thought = m.querySelector('[class]:not([class*=" "])');

            if (thought && thought.children.length > 1) {
                msg.thoughtTime = cleanTextForJSON(thought.children[0].textContent.trim());
                msg.thoughtText = cleanTextForJSON(thought.children[1].textContent.trim());
            }

            msg.text = cleanTextForJSON(answerText);
            result.push(msg);
        }
    }

    return result;
}

function parsePage() {
  try {
    const url = window.location.href;
    const siteName = getSiteName(url);
    
    // Проверка на поддержку сайта
    if (siteName === 'unknown') {
      return {
        siteName: 'unknown',
        url: url,
        exportedAt: new Date().toISOString(),
        messages: [],
        messageCount: 0
      };
    }
    
    let messages = [];
    
    switch (siteName) {
      case 'deepseek':
        messages = parseDeepSeek();
        break;
      // Здесь можно добавить case для других ботов
      default:
        // Этот случай не должен сработать из-за проверки выше, но на всякий случай
        messages = [];
        break;
    }
    
    return {
      siteName: siteName,
      url: url,
      exportedAt: new Date().toISOString(),
      messages: messages,
      messageCount: messages.length
    };
  } catch (error) {
    console.error('Ошибка парсинга:', error);
    return {
      siteName: getSiteName(window.location.href),
      url: window.location.href,
      exportedAt: new Date().toISOString(),
      messages: [],
      messageCount: 0,
      error: error.message
    };
  }
}

function getSiteName(url) {
  if (url.includes('chatgpt.com')) return 'chatgpt';
  if (url.includes('claude.ai')) return 'claude';
  if (url.includes('gemini.google.com')) return 'gemini';
  if (url.includes('deepseek.com')) return 'deepseek';
  if (url.includes('you.com')) return 'you.com';
  return 'unknown';
}

// Выполняем парсинг и возвращаем результат
parsePage();
