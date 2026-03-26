(function () {
  'use strict';

  var API          = 'https://micheck.offici5l.workers.dev';
  var allCodenames = [];
  var selected     = '';
  var loaded       = false;

  var iconCheck = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>';
  var iconAlert = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
  var iconError = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>';

  function loadCodenames() {
    if (loaded) return;
    fetch(API + '/codenames')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var raw = data.codenames || data.devices || [];
        allCodenames = [];
        for (var i = 0; i < raw.length; i++) {
          var c = typeof raw[i] === 'object' ? raw[i].codename : raw[i];
          if (typeof c === 'string' && c.length > 0) allCodenames.push(c);
        }
        loaded = true;
        onCodeNamesReady();
      })
      .catch(function (err) {
        document.getElementById('sheet-list').innerHTML =
          '<div class="list-msg">Failed to load (' + String(err.message) + ')</div>';
      });
  }

  function onCodeNamesReady() {
    document.getElementById('sheet-title').textContent = 'Select Device';
    renderItems(allCodenames, '');
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function highlight(str, q) {
    if (!q) return esc(str);
    var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return esc(str).replace(re, '<mark>$1</mark>');
  }

  function renderItems(items, q) {
    var list = document.getElementById('sheet-list');
    if (!items.length) {
      list.innerHTML = '<div class="list-msg">No results found.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var c = items[i];
      html += '<div class="list-item' + (c === selected ? ' active' : '') + '"'
            + ' role="option" aria-selected="' + (c === selected) + '"'
            + ' onclick="pick(\'' + esc(c) + '\')">'
            + highlight(c, q)
            + '</div>';
    }
    list.innerHTML = html;
  }

  function filterList(q) {
    var trimmed = q.trim();
    var lower   = trimmed.toLowerCase();
    var items   = !lower
      ? allCodenames
      : allCodenames.filter(function (c) { return c.toLowerCase().indexOf(lower) !== -1; });
    renderItems(items, trimmed);
  }

  function openSheet() {
    var overlay = document.getElementById('overlay');
    var btn     = document.getElementById('select-btn');
    overlay.style.display = 'flex';
    void overlay.offsetWidth;
    overlay.classList.add('open');
    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    document.getElementById('sheet-search').value = '';
    if (!loaded) {
      loadCodenames();
    } else {
      renderItems(allCodenames, '');
    }
    setTimeout(function () {
      document.getElementById('sheet-search').focus();
    }, 300);
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    var overlay = document.getElementById('overlay');
    overlay.classList.remove('open');
    var btn = document.getElementById('select-btn');
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(function () {
      overlay.style.display = 'none';
    }, 400);
  }

  function onBackdropClick(e) {
    if (e.target === document.getElementById('overlay')) closeSheet();
  }

  function pick(codename) {
    selected = codename;
    var label = document.getElementById('select-label');
    label.className   = 'val';
    label.textContent = codename;
    document.getElementById('select-btn').classList.add('selected');
    closeSheet();
  }

  function verify() {
    var rawCpuid = document.getElementById('cpuid').value.trim();
    var cpuid    = rawCpuid.replace(/^0x/i, '');
    var btn      = document.getElementById('verify-btn');

    if (!selected || !cpuid) {
      showResult('error', 'Missing Fields', [], iconError);
      return;
    }

    btn.disabled  = true;
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Verifying…';
    document.getElementById('result').className = 'result';

    fetch(API + '?product=' + encodeURIComponent(selected) + '&cpuid=' + encodeURIComponent(cpuid))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.region === 'global') {
          showResult('global', 'Official Global Version', [['Codename', selected], ['CPU ID', rawCpuid]], iconCheck);
        } else if (data.region === 'regional' || data.region === 'china') {
          showResult('regional', 'Not an Official Global Version', [['Codename', selected], ['CPU ID', rawCpuid]], iconAlert);
        } else {
          showResult('error', 'Unable to Verify', [['CPU ID', rawCpuid]], iconError);
        }
      })
      .catch(function () {
        showResult('error', 'Network Error', [], iconError);
      })
      .finally(function () {
        btn.disabled  = false;
        btn.innerHTML = 'Verify Device';
      });
  }

  function showResult(type, title, rows, icon) {
    document.getElementById('res-icon').innerHTML  = icon;
    document.getElementById('res-title').textContent = title;
    var metaHtml = '';
    if (rows.length > 0) {
      for (var i = 0; i < rows.length; i++) {
        metaHtml += '<div class="result-row">'
                 + '<span class="rk">' + esc(rows[i][0]) + '</span>'
                 + '<span class="rv">' + esc(rows[i][1]) + '</span>'
                 + '</div>';
      }
      document.getElementById('res-meta').innerHTML     = metaHtml;
      document.getElementById('res-meta').style.display = 'flex';
    } else {
      document.getElementById('res-meta').style.display = 'none';
    }
    var resultBox = document.getElementById('result');
    resultBox.className = 'result';
    void resultBox.offsetWidth;
    resultBox.className = 'result ' + type + ' show';
  }

  function guardPrefix(input) {
    var v = input.value;
    if (v.toLowerCase().indexOf('0x') !== 0) {
      input.value = '0x' + v.replace(/^0x*/i, '');
    }
  }

  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.keyCode === 27) &&
        document.getElementById('overlay').classList.contains('open')) {
      closeSheet();
    }
  });

  window.openSheet       = openSheet;
  window.closeSheet      = closeSheet;
  window.onBackdropClick = onBackdropClick;
  window.pick            = pick;
  window.verify          = verify;
  window.filterList      = filterList;
  window.guardPrefix     = guardPrefix;
})();
