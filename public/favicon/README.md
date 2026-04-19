# Favicon directory

Положи сюда файлы фавикона. Next.js автоматически подхватит то, что лежит в `public/`,
но конкретные имена с особым поведением:

| Файл                      | Куда положить                | Что использует браузер |
|---------------------------|------------------------------|------------------------|
| `favicon.ico`             | `src/app/favicon.ico`        | стандартная иконка вкладки (16/32 px) |
| `icon.png` или `icon.svg` | `src/app/icon.png` (или svg) | современный fallback (Next.js metadata) |
| `apple-icon.png`          | `src/app/apple-icon.png`     | иконка на iOS home screen (180×180) |

App Router сам обрабатывает файлы в `src/app/` с именами `favicon`, `icon`,
`apple-icon` (см. https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons).

## Как добавить
1. Скинь свой `.ico` / `.png` / `.svg` сюда (`public/favicon/`).
2. Скопируй или переименуй в `src/app/favicon.ico` (или `icon.png` / `icon.svg`).
3. Hot-reload подхватит — обнови вкладку браузера, иконка сменится.

`public/favicon/` существует как «склад исходников» — туда можно положить
несколько вариантов (svg + png + 512×512 для PWA), а в `src/app/` ставить
только тот, что нужен сейчас.
