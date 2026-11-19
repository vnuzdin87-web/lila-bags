/**
 * LILA — мастерская кожи
 * Приём заявок с лендинга и запись их в Google Таблицу.
 *
 * Куда это вставлять — см. README-google-sheets.md (5 минут, бесплатно).
 * Вручную запускается только функция setup() — один раз после установки.
 *
 * ВАЖНО: в этом файле нет строчных комментариев (//), только блочные (/* *\/).
 * Поэтому даже если при вставке потеряются переносы строк, код останется рабочим.
 */

/* ===== НАСТРОЙКИ — меняйте только то, что ниже ===== */

/* Имя листа внутри таблицы (создастся автоматически) */
var SHEET_NAME = 'Заявки';

/* Куда присылать письмо о новой заявке. Оставьте '' — уведомления не отправляются. */
var NOTIFY_EMAIL = '';

/* Название проекта — попадает в письмо и в ответ скрипта */
var PROJECT = 'LILA';

var HEADERS = ['Дата и время', 'Имя', 'Контакт', 'Пожелание', 'Источник', 'Страница', 'Статус'];

/* ===== РАЗОВАЯ НАСТРОЙКА ЛИСТА (выполнить один раз) ===== */

function setup() {
  var sheet = getSheet();
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setValues([HEADERS])
    .setFontWeight('bold')
    .setBackground('#ede7fb');
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, HEADERS.length, 180);
  sheet.setColumnWidth(4, 320);
  sheet.getRange('A2:A').setNumberFormat('dd.MM.yyyy HH:mm');
  return 'Готово: лист «' + SHEET_NAME + '» настроен.';
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Скрипт не привязан к таблице. Создайте его через Расширения → Apps Script.');
  }
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setValues([HEADERS])
      .setFontWeight('bold')
      .setBackground('#ede7fb');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/* ===== ПРИЁМ ЗАЯВКИ =====
 * Сайт отправляет заявку тегом <script> (JSONP), поэтому основной вход — doGet.
 * Ответ оборачивается в callback(...), иначе браузер не смог бы прочитать результат.
 */

function doGet(e) {
  var p = readParams(e);
  var callback = clean(p.callback);

  if (callback) {
    return jsonp(callback, withLock(function () {
      return saveLead(p);
    }));
  }

  /* Проверка работоспособности: ссылку /exec открыли в браузере */
  return reply({
    ok: true,
    service: PROJECT + ' leads',
    sheet: SHEET_NAME,
    time: new Date().toISOString()
  });
}

/* POST оставлен для гибкости: если форма когда-нибудь начнёт отправлять JSON */

function doPost(e) {
  var p = readParams(e);
  var callback = clean(p.callback);
  var result = withLock(function () {
    return saveLead(p);
  });

  if (callback) return jsonp(callback, result);
  return reply(result);
}

function saveLead(p) {
  /* Поле-ловушка: заполнено — значит пишет бот. Отвечаем «ок», но ничего не сохраняем. */
  if (p.company) return { ok: true, skipped: 'spam' };

  var name = clean(p.name);
  var contact = clean(p.contact);
  if (!name || !contact) return { ok: false, error: 'name_and_contact_required' };

  var row = [
    new Date(),
    name.slice(0, 80),
    contact.slice(0, 80),
    clean(p.wish).slice(0, 500),
    clean(p.source) || '—',
    clean(p.page).slice(0, 300),
    'новая'
  ];

  getSheet().appendRow(row);
  notify(row);

  return { ok: true };
}

function withLock(fn) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (err) {
    return { ok: false, error: 'busy' };
  }
  try {
    return fn();
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

/* ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===== */

function readParams(e) {
  var p = {};
  if (e && e.parameter) {
    for (var k in e.parameter) p[k] = e.parameter[k];
  }
  /* Поддержка JSON-тела (для POST) */
  if (e && e.postData && e.postData.contents) {
    var text = e.postData.contents;
    if (text.charAt(0) === '{') {
      try {
        var json = JSON.parse(text);
        for (var j in json) {
          if (!p[j]) p[j] = json[j];
        }
      } catch (err) {}
    }
  }
  return p;
}

function clean(v) {
  return (v === undefined || v === null) ? '' : String(v).trim();
}

function notify(row) {
  var to = clean(NOTIFY_EMAIL);
  if (!to) return;
  try {
    MailApp.sendEmail({
      to: to,
      subject: PROJECT + ': новая заявка — ' + row[1],
      body: 'Имя: ' + row[1] +
        '\nКонтакт: ' + row[2] +
        '\nПожелание: ' + (row[3] || '—') +
        '\nИсточник: ' + row[4] +
        '\nСтраница: ' + row[5] +
        '\nВремя: ' + row[0]
    });
  } catch (err) {}
}

/* Ответ браузеру для JSONP: callback({...}); */

function jsonp(callback, obj) {
  var safe = String(callback).replace(/[^A-Za-z0-9_$.]/g, '');
  return ContentService
    .createTextOutput(safe + '(' + JSON.stringify(obj) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/* Обычный JSON-ответ (проверка в браузере и POST) */

function reply(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
