// 稍后阅读 · 前端交互
(function () {
  'use strict';

  // ---------- 添加表单 ----------
  var addBtn = document.getElementById('addBtn');
  var addForm = document.getElementById('addForm');
  if (addBtn && addForm) {
    addBtn.addEventListener('click', function () {
      var hidden = addForm.classList.toggle('hidden');
      addBtn.textContent = hidden ? '＋ 添加链接' : '取消';
      if (!hidden) document.getElementById('urlInput').focus();
    });
  }

  // ---------- 列表操作（事件委托） ----------
  var list = document.querySelector('.list');
  if (list) {
    list.addEventListener('click', async function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var item = btn.closest('.item');
      if (!item) return;
      var id = item.dataset.id;
      var act = btn.dataset.act;

      try {
        if (act === 'toggle-read') {
          var isRead = !item.classList.contains('read');
          var r = await fetch('/api/bookmarks/' + id + '/read', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: isRead }),
          });
          if (r.ok) {
            item.classList.toggle('read', isRead);
            refreshStats();
          }
        } else if (act === 'delete') {
          if (!window.confirm('删除这条链接？')) return;
          var r2 = await fetch('/api/bookmarks/' + id, { method: 'DELETE' });
          if (r2.ok) {
            item.remove();
            refreshStats();
            maybeShowEmpty();
          }
        }
      } catch (err) {
        window.alert('操作失败，请重试');
      }
    });
  }

  // ---------- 时间相对化 ----------
  function fmtTime(ts) {
    if (!ts) return '';
    var t = new Date(String(ts).replace(' ', 'T'));
    if (isNaN(t.getTime())) return ts;
    var now = new Date();
    var startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var startOfDay = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    var diffDays = Math.round((startOfToday - startOfDay) / 86400000);
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var hm = pad(t.getHours()) + ':' + pad(t.getMinutes());
    if (diffDays === 0) return hm;
    if (diffDays === 1) return '昨天 ' + hm;
    if (diffDays < 7) return diffDays + ' 天前';
    if (t.getFullYear() === now.getFullYear()) return (t.getMonth() + 1) + '月' + t.getDate() + '日';
    return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
  }
  document.querySelectorAll('.time[data-time]').forEach(function (el) {
    el.textContent = fmtTime(el.dataset.time);
  });

  // ---------- 统计刷新 ----------
  async function refreshStats() {
    try {
      var r = await fetch('/api/stats');
      if (!r.ok) return;
      var c = await r.json();
      var tabs = document.querySelectorAll('.tabs .tab .count');
      if (tabs.length === 3) {
        tabs[0].textContent = c.all;
        tabs[1].textContent = c.unread;
        tabs[2].textContent = c.read;
      }
    } catch (err) { /* 忽略 */ }
  }

  function maybeShowEmpty() {
    if (!list || list.children.length > 0) return;
    var main = list.closest('main');
    if (main) {
      var empty = document.querySelector('.empty');
      if (empty) empty.classList.remove('hidden');
      else {
        var div = document.createElement('div');
        div.className = 'empty';
        div.innerHTML = '<p class="empty-icon">🗂️</p><p class="empty-text">当前列表已清空</p>';
        main.appendChild(div);
      }
      list.remove();
    }
  }

  // ---------- 分享本站（手机/支持 navigator.share 的浏览器） ----------
  var shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async function () {
      var url = window.location.origin;
      var data = { title: '稍后阅读', text: '我的稍后阅读清单', url: url };
      try {
        if (navigator.share) {
          await navigator.share(data);
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          window.alert('本站地址已复制到剪贴板：' + url);
        } else {
          window.prompt('复制本站地址：', url);
        }
      } catch (err) { /* 用户取消分享 */ }
    });
  }

  // ---------- Service Worker（PWA 可安装 + 离线壳） ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () { /* 忽略 */ });
    });
  }
})();
