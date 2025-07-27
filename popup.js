document.addEventListener('DOMContentLoaded', async function() {
  const scanBtn = document.getElementById('scanBtn');
  const optionsDiv = document.getElementById('options');
  const statusDiv = document.getElementById('status');
  const siteName = document.getElementById('siteName');
  const instructions = document.getElementById('instructions');
  const includeThoughtTime = document.getElementById('includeThoughtTime');
  const includeThoughtText = document.getElementById('includeThoughtText');
  const exportJSON = document.getElementById('exportJSON');
  const exportMarkdown = document.getElementById('exportMarkdown');
  const copyPromptBtn = document.getElementById('copyPromptBtn');
  const universalPrompt = document.getElementById('universalPrompt');
  
  let chatData = null;
  
  // Получаем информацию о текущей вкладке
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  const url = new URL(tab.url);
  siteName.textContent = `Сайт: ${url.hostname}`;
  
  // Показываем опции сразу
  optionsDiv.classList.remove('hidden');
  instructions.classList.remove('hidden');
  
  // Обработчик кнопки копирования промпта
  copyPromptBtn.addEventListener('click', () => {
    const promptText = universalPrompt.textContent;
    navigator.clipboard.writeText(promptText).then(() => {
      const originalText = copyPromptBtn.textContent;
      copyPromptBtn.textContent = 'Скопировано!';
      setTimeout(() => {
        copyPromptBtn.textContent = originalText;
      }, 2000);
    }).catch(err => {
      console.error('Ошибка копирования промпта:', err);
      showStatus('Ошибка копирования промпта', 'error');
    });
  });
  
  scanBtn.addEventListener('click', async () => {
    showStatus('Сканирование...', 'info');
    scanBtn.disabled = true;
    
    try {
      const results = await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        files: ['content.js']
      });
      
      const result = results[0].result;
      
      // Проверка на поддержку сайта
      if (result.siteName === 'unknown') {
        showStatus('Сайт не поддерживается', 'error');
        return;
      }
      
      // Проверка на ошибки парсинга
      if (result.error) {
        showStatus('Ошибка парсинга (подробности в консоли)', 'error');
        console.error('Ошибка парсинга:', result.error);
        return;
      }
      
      chatData = result;
      
      if (chatData && chatData.messages && chatData.messages.length > 0) {
        showStatus(`Найдено ${chatData.messages.length} сообщений.`, 'success');
        
        // Экспорт
        setTimeout(() => {
          const formats = [];
          if (exportJSON.checked) formats.push('json');
          if (exportMarkdown.checked) formats.push('md');
          
          const includeThoughts = {
            time: includeThoughtTime.checked,
            text: includeThoughtText.checked
          };
          
          if (formats.length > 0) {
            formats.forEach(format => {
              exportChat(chatData, format, includeThoughts);
            });
            showStatus(`Экспорт завершен (${formats.join(', ')})`, 'success');
          } else {
            showStatus('Выберите формат для экспорта', 'info');
          }
        }, 500);
      } else {
        showStatus('Сообщения не найдены', 'error');
      }
    } catch (error) {
      console.error('Ошибка сканирования:', error);
      showStatus('Ошибка сканирования', 'error');
    } finally {
      scanBtn.disabled = false;
    }
  });
  
  function showStatus(message, type = '') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
  }
  
  function exportChat(data, format, includeThoughts) {
    let content, filename, mimeType;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    
    // Фильтруем данные в зависимости от настройки
    const filteredData = filterChatData(data, includeThoughts);
    
    switch (format) {
      case 'json':
        // Только массив сообщений, без дополнительных полей
        content = JSON.stringify(filteredData.messages, null, 0); // Без форматирования
        filename = `chat-export-${timestamp}.json`;
        mimeType = 'application/json';
        break;
        
      case 'md':
        content = formatAsMarkdown(filteredData);
        filename = `chat-export-${timestamp}.md`;
        mimeType = 'text/markdown';
        break;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });
  }
  
  function filterChatData(data, includeThoughts) {
    // Фильтруем сообщения, сохраняя правильный порядок полей
    const filteredMessages = data.messages.map(msg => {
      const filteredMsg = {};
      
      // Всегда добавляем role первым
      filteredMsg.role = msg.role;
      
      // Добавляем thoughtTime и thoughtText, если они включены
      if (includeThoughts.time && msg.thoughtTime !== undefined) {
        filteredMsg.thoughtTime = msg.thoughtTime;
      }
      if (includeThoughts.text && msg.thoughtText !== undefined) {
        filteredMsg.thoughtText = msg.thoughtText;
      }
      
      // Добавляем text последним
      if (msg.text !== undefined) {
        filteredMsg.text = msg.text;
      }
      
      return filteredMsg;
    });
    
    return {
      messages: filteredMessages
    };
  }
  
  function formatAsMarkdown(data) {
    let md = `# Диалог\n\n`;
    md += `**Экспортировано:** ${new Date().toLocaleString('ru-RU')}\n\n`;
    
    data.messages.forEach((msg) => {
      const role = msg.role === 'user' ? 'Вы' : 'Бот';
      md += `## ${role}\n\n`;
      
      // Выводим поля в правильном порядке
      if (msg.thoughtTime) md += `**Время размышлений:** ${msg.thoughtTime}\n\n`;
      if (msg.thoughtText) md += `**Размышления:**\n\n${msg.thoughtText}\n\n`;
      if (msg.text) md += `${msg.text}\n\n`;
      
      md += '---\n\n';
    });
    
    return md;
  }
});
