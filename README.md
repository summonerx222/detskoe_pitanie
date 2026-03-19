# Сайт для базы знаний по детскому питанию

Внутри:
- `index.html` — разметка сайта
- `assets/styles.css` — стили
- `assets/app.js` — клиентская логика

## Что нужно заменить перед публикацией

Внизу `index.html` есть блок:

```html
<script>
  window.APP_CONFIG = {
    LOGIN_WEBHOOK: "https://example.com/webhook/det/login",
    ASK_WEBHOOK: "https://example.com/webhook/det/ask",
    FEEDBACK_WEBHOOK: "https://example.com/webhook/det/feedback",
    UPDATE_BASE_WEBHOOK: "https://example.com/webhook/det/update_base",
    DEFAULT_ROOT_PATH: "app:/Детское питание",
    APP_TITLE: "База знаний по детскому питанию"
  };
</script>
```

Подставьте реальные URL ваших webhook из n8n.

## Как развернуть на Cloudflare Pages

Поскольку это статический сайт, сборка не нужна.

При создании проекта в Cloudflare Pages используйте:
- Framework preset: `None`
- Build command: оставить пустым
- Build output directory: оставить пустым или `/`

## Что уже работает
- вход через `det/login`
- чат через `det/ask`
- отправка обратной связи через `det/feedback`
- кнопка `Обновить базу данных` пока показывает `Функция в разработке`

## Что важно
Если ваш n8n находится на другом домене, на стороне n8n или прокси нужно разрешить CORS-запросы от домена сайта.
