// ==UserScript==
// @name         Augments Translator
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  Translate Augments and Tooltips on MetaSrc
// @author       You
// @match        https://www.metasrc.com/lol/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const ZH_DATA_URL = 'https://raw.communitydragon.org/latest/cdragon/arena/zh_cn.json';
    const EN_DATA_URL = 'https://raw.communitydragon.org/latest/cdragon/arena/en_us.json';
    const ITEM_EN_URL = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/items.json';
    const ITEM_ZH_URL = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/zh_cn/v1/items.json';
    const FILTER_GAMES_THRESHOLD = 100;
    const MUTATION_DEBOUNCE_MS = 50;

    const NORMALIZE_RE = /[\s+'-/!:_]/g;
    const ICON_RE = /%i:[^%]+%/g;
    const AT_PLACEHOLDER_RE = /@([^@]+)@/g;
    const MUSTACHE_PLACEHOLDER_RE = /\{\{\s*([^}\s]+)\s*\}\}/g;
    const PLACEHOLDER_SPLIT_RE = /@([^@]+)@|\{\{\s*([^}\s]+)\s*\}\}/;
    const REGEX_ESCAPE_RE = /[.*+?^${}()|[\]\\]/g;
    const WS_RE = /\s+/g;
    const AUGMENT_ID_RE = /^augment-(\d+)$/;
    const ITEM_ID_RE = /^item-(\d+)$/;
    const RUNTIME_TRACKER_RE = /(?:<br>\s*){1,2}[^<]*@f\d+@(?:\s*<br>\s*[^<]*@f\d+@)*\s*$/;
    const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);

    // Surfaces that may show untranslated augment text:
    //   .tooltip / .tippy-content / .select2-results__option — legacy/generic
    //   .hyper-tooltip / .hyper-tooltip-content — MetaSrc's HTMX-swapped Stimulus tooltip
    //   .search-results / [data-search-results] — MetaSrc's search & filter dropdowns
    const TRANSLATION_SURFACE_SELECTOR =
        '.tooltip, .tippy-content, .select2-results__option, .hyper-tooltip, .hyper-tooltip-content, .search-results, [data-search-results]';

    const CJK_RE = /[一-鿿]/;
    const PINYIN_PRO_URL = 'https://cdn.jsdelivr.net/gh/zh-lx/pinyin-pro@3.26.0/dist/pinyin-pro.js';
    const PINYIN_RETRY_LIMIT = 20;
    const PINYIN_RETRY_MS = 500;

    const translationMap = new Map();
    // id -> { enDesc, zhDesc, enTooltip, zhTooltip, descAnchor, tooltipAnchor }.
    // *Anchor slots are lazily built { regex, placeholders } | null;
    // `undefined` means not built yet, `null` means template has no anchors.
    const descMap = new Map();

    function normalizeText(text) {
        return text.replace(NORMALIZE_RE, '').toLowerCase();
    }

    // Strip trailing runtime tracker block (e.g. "<br><br>Damage Dealt
    // This Round: @f1@<br>Damage Dealt Total: @f2@"). MetaSrc never
    // renders these on build pages, so requiring them in the regex
    // anchors fails any template that has them.
    function stripRuntimeTrackers(tpl) {
        return tpl.replace(RUNTIME_TRACKER_RE, '');
    }

    function initializeMaps(zhData, enData, enItems, zhItems) {
        for (const aug of zhData.augments) {
            translationMap.set(normalizeText(aug.apiName), aug.name);
        }
        const enById = new Map(enData.augments.map(a => [a.id, a]));
        for (const z of zhData.augments) {
            const e = enById.get(z.id);
            if (!e) continue;
            descMap.set(z.id, {
                enDesc: e.desc || '',
                zhDesc: z.desc || '',
                enTooltip: stripRuntimeTrackers(e.tooltip || ''),
                zhTooltip: stripRuntimeTrackers(z.tooltip || ''),
                descAnchor: undefined,
                tooltipAnchor: undefined,
            });
        }

        const zhItemById = new Map(zhItems.map(it => [it.id, it]));
        for (const e of enItems) {
            const z = zhItemById.get(e.id);
            if (!z) continue;
            if (z.name !== e.name) {
                translationMap.set(normalizeText(e.name), z.name);
            }
            if (!e.description) continue;
            descMap.set('item-' + e.id, {
                enDesc: e.description,
                zhDesc: z.description || '',
                enTooltip: '',
                zhTooltip: '',
                descAnchor: undefined,
                tooltipAnchor: undefined,
            });
        }
    }

    // Build a regex from an EN template by splitting at @…@ and {{…}} markers.
    // Literal segments are escaped and given whitespace tolerance; placeholders
    // become non-greedy captures. Returns { regex, placeholders } or null if
    // the template has no usable content. Strips %i:…% icon directives first.
    function buildAnchorRegex(enTpl) {
        const stripped = enTpl.replace(ICON_RE, '');
        const parts = stripped.split(PLACEHOLDER_SPLIT_RE);
        if (parts.length === 1 && !parts[0].trim()) return null;
        const placeholders = [];
        let regexStr = '';
        for (let i = 0; i < parts.length; i++) {
            const slot = i % 3;
            if (slot === 0) {
                regexStr += parts[i]
                    .replace(REGEX_ESCAPE_RE, '\\$&')
                    .replace(WS_RE, '\\s*');
            } else if (parts[i] !== undefined) {
                placeholders.push({ kind: slot === 1 ? 'at' : 'mustache', name: parts[i] });
                regexStr += '(.+?)';
            }
        }
        return { regex: new RegExp(regexStr, 'is'), placeholders };
    }

    // Lazily build & cache the desc/tooltip regex; cards that never get a
    // tooltip on screen pay nothing for their regex.
    function getAnchor(data, which) {
        const cacheKey = which === 'desc' ? 'descAnchor' : 'tooltipAnchor';
        if (data[cacheKey] === undefined) {
            const src = which === 'desc' ? data.enDesc : data.enTooltip;
            data[cacheKey] = src ? buildAnchorRegex(src) : null;
        }
        return data[cacheKey];
    }

    // Try EN template against rendered text. If matched, substitute captures
    // into the ZH template's @…@ and {{…}} slots. Returns the rendered ZH
    // HTML, or null on no match.
    function anchorTranslate(data, which, renderedText) {
        const zhTpl = which === 'desc' ? data.zhDesc : data.zhTooltip;
        if (!zhTpl) return null;
        const built = getAnchor(data, which);
        if (!built) return null;
        const m = built.regex.exec(renderedText);
        if (!m) return null;
        const atVals = Object.create(null);
        const mustacheVals = Object.create(null);
        for (let i = 0; i < built.placeholders.length; i++) {
            const p = built.placeholders[i];
            (p.kind === 'at' ? atVals : mustacheVals)[p.name] = m[i + 1];
        }
        return zhTpl
            .replace(ICON_RE, '')
            .replace(AT_PLACEHOLDER_RE, (_, e) => atVals[e] !== undefined ? atVals[e] : `@${e}@`)
            .replace(MUSTACHE_PLACEHOLDER_RE, (_, k) => mustacheVals[k] !== undefined ? mustacheVals[k] : `{{ ${k} }}`);
    }

    // Decide once per card. Until window.Tooltips publishes a numeric `games`
    // count we keep checking; after that we lock in the decision.
    function maybeFilterAugment(el, id) {
        if (el.dataset.filterChecked === '1') return;
        const games = window.Tooltips?.tooltips?.[`augment-${id}`]?.vars?.games;
        if (typeof games !== 'number') return;
        if (games < FILTER_GAMES_THRESHOLD) {
            el.style.display = 'none';
            console.log(`Filtered out augment-${id} (games: ${games})`);
        }
        el.dataset.filterChecked = '1';
    }

    // Translate the description body (siblings after <hr>) inside an augment
    // card. Leaves English alone when no template anchors match.
    function maybeTranslateDesc(el, id) {
        if (el.dataset.translated === '1') return;
        const data = descMap.get(id);
        if (!data) return;
        const hr = el.querySelector('hr');
        if (!hr) return;

        let html = '';
        for (let n = hr.nextSibling; n; n = n.nextSibling) {
            if (n.nodeType === Node.TEXT_NODE) html += n.textContent;
            else if (n.nodeType === Node.ELEMENT_NODE) html += n.outerHTML;
        }
        const rendered = html.replace(WS_RE, ' ').trim();
        if (!rendered) return;

        let zh = anchorTranslate(data, 'desc', rendered);
        if (zh === null) zh = anchorTranslate(data, 'tooltip', rendered);
        if (zh === null) return;

        while (hr.nextSibling) hr.nextSibling.remove();
        const tmpl = document.createElement('template');
        tmpl.innerHTML = ' ' + zh;
        el.appendChild(tmpl.content);
        el.dataset.translated = '1';
    }

    function processAugmentElement(el) {
        const m = AUGMENT_ID_RE.exec(el.id);
        if (!m) return;
        const id = Number(m[1]);
        maybeFilterAugment(el, id);
        maybeTranslateDesc(el, id);
    }

    function processItemElement(el) {
        const m = ITEM_ID_RE.exec(el.id);
        if (!m) return;
        maybeTranslateDesc(el, 'item-' + m[1]);
    }

    function processAugmentsIn(scope) {
        if (scope.nodeType === Node.ELEMENT_NODE && AUGMENT_ID_RE.test(scope.id)) {
            processAugmentElement(scope);
        }
        const found = scope.querySelectorAll?.('[id^="augment-"]');
        if (found) {
            for (const el of found) processAugmentElement(el);
        }
    }

    function processItemsIn(scope) {
        if (scope.nodeType === Node.ELEMENT_NODE && ITEM_ID_RE.test(scope.id)) {
            processItemElement(scope);
        }
        const found = scope.querySelectorAll?.('[id^="item-"]');
        if (found) {
            for (const el of found) processItemElement(el);
        }
    }

    function translateTextNode(node) {
        const text = node.textContent;
        if (!text) return;
        const translation = translationMap.get(normalizeText(text));
        if (translation && translation !== text) {
            node.textContent = translation;
        }
    }

    function translateTextsIn(root) {
        if (root.nodeType === Node.TEXT_NODE) {
            const parent = root.parentNode;
            if (!parent || !SKIP_TAGS.has(parent.nodeName)) translateTextNode(root);
            return;
        }
        if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walker.nextNode())) {
            const parent = n.parentNode;
            if (parent && SKIP_TAGS.has(parent.nodeName)) continue;
            translateTextNode(n);
        }
    }

    function filterDropdownByChinese(scope) {
        const sr = scope?.nodeType === Node.ELEMENT_NODE
            && (scope.matches?.('.search-results, [data-search-results]')
                ? scope
                : scope.closest?.('.search-results, [data-search-results]'));
        if (!sr) return;
        const input = document.querySelector('[data-client-table-view-target="input"]');
        const query = input?.value?.trim();
        if (!query || !CJK_RE.test(query)) return;
        for (const item of sr.querySelectorAll('[data-client-table-view-target="result"]')) {
            const text = item.textContent?.trim() || '';
            item.style.display = text.includes(query) ? '' : 'none';
        }
    }

    let zhFilterTimer = 0;

    function patchSearchInput() {
        const input = document.querySelector('[data-client-table-view-target="input"]');
        if (!input || input.dataset.zhPatched) return;
        input.dataset.zhPatched = '1';
        input.addEventListener('input', () => {
            clearTimeout(zhFilterTimer);
            const query = input.value.trim();
            if (!query || !CJK_RE.test(query)) return;
            zhFilterTimer = setTimeout(() => {
                const sr = document.querySelector('.search-results, [data-search-results]');
                if (sr) filterDropdownByChinese(sr);
            }, MUTATION_DEBOUNCE_MS + 50);
        });
    }

    function runTranslation(scope) {
        try {
            const root = scope || document.body;
            processAugmentsIn(root);
            processItemsIn(root);
            translateTextsIn(root);
            filterDropdownByChinese(root);
        } catch (error) {
            console.error('Error in runTranslation:', error);
        }
    }

    let pendingScopes = new Set();
    let mutationTimer = 0;

    function flushScopes() {
        mutationTimer = 0;
        const scopes = pendingScopes;
        pendingScopes = new Set();
        for (const scope of scopes) {
            if (scope.isConnected) runTranslation(scope);
        }
    }

    // Translate-by-scope instead of re-walking document.body on every tooltip
    // mutation. We collect the smallest enclosing surface (or inserted subtree)
    // for each relevant mutation and translate only inside that.
    function collectScopes(mutations) {
        for (const mutation of mutations) {
            const target = mutation.target;
            const targetSurface = target?.nodeType === Node.ELEMENT_NODE
                ? target.closest?.(TRANSLATION_SURFACE_SELECTOR)
                : null;

            let sawAdded = false;
            for (const node of mutation.addedNodes) {
                sawAdded = true;
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.matches?.(TRANSLATION_SURFACE_SELECTOR)) {
                        pendingScopes.add(node);
                        continue;
                    }
                    const inner = node.querySelectorAll?.(TRANSLATION_SURFACE_SELECTOR);
                    if (inner && inner.length) {
                        for (const s of inner) pendingScopes.add(s);
                    } else if (targetSurface) {
                        pendingScopes.add(node);
                    }
                } else if (node.nodeType === Node.TEXT_NODE && targetSurface) {
                    pendingScopes.add(node);
                }
            }

            // Mutation inside a surface with no additions (e.g. items removed
            // without replacement) — keep parity with the original "target in
            // surface => translate" branch by re-checking the surface itself.
            if (!sawAdded && targetSurface) {
                pendingScopes.add(targetSurface);
            }
        }
    }

    function handleTooltips(mutations) {
        try {
            collectScopes(mutations);
            if (pendingScopes.size > 0) {
                clearTimeout(mutationTimer);
                mutationTimer = setTimeout(flushScopes, MUTATION_DEBOUNCE_MS);
            }
        } catch (error) {
            console.error('Error in handleTooltips:', error);
        }
    }

    function loadPinyinPro() {
        return new Promise((resolve, reject) => {
            if (window.pinyinPro) { resolve(window.pinyinPro.pinyin); return; }
            const s = document.createElement('script');
            s.src = PINYIN_PRO_URL;
            s.onload = () => resolve(window.pinyinPro?.pinyin);
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    function injectPinyinIntoTable(pinyinFn) {
        const table = document.querySelector(
            '[data-client-table-view-table-selector-value] ~ * [data-controller~="client-table"],' +
            '[data-controller~="client-table"]'
        ) || document.querySelector('table');
        if (!table) return;
        const rows = table.querySelectorAll('[data-client-table-target="row"]');
        let patched = 0;
        for (const row of rows) {
            const cell = row.querySelector('[data-key="name"]');
            if (!cell || cell.dataset.pinyinPatched) continue;
            const zhText = cell.querySelector('span')?.textContent || '';
            if (!zhText || !CJK_RE.test(zhText)) continue;
            const py = pinyinFn(zhText, { toneType: 'none', nonZh: 'removed' }).replace(/\s+/g, '');
            cell.dataset.value = cell.dataset.value + ' ' + py;
            cell.dataset.pinyinPatched = '1';
            patched++;
        }
        if (!patched) return;
        const tbody = rows[0]?.parentNode;
        if (!tbody) return;
        // Transient row forces the Stimulus client-table-view controller to
        // detect a row-count change in its #w() guard and rebuild searchText cache.
        const dummy = document.createElement('tr');
        dummy.setAttribute('data-client-table-target', 'row');
        dummy.style.display = 'none';
        tbody.appendChild(dummy);
        setTimeout(() => dummy.remove(), 200);
    }

    function fetchAugmentData() {
        Promise.all([
            fetch(ZH_DATA_URL).then(r => r.json()),
            fetch(EN_DATA_URL).then(r => r.json()),
            fetch(ITEM_EN_URL).then(r => r.json()),
            fetch(ITEM_ZH_URL).then(r => r.json()),
        ])
            .then(([zhData, enData, enItems, zhItems]) => {
                initializeMaps(zhData, enData, enItems, zhItems);
                if (document.readyState === 'complete') {
                    runTranslation();
                } else {
                    window.addEventListener('load', () => runTranslation(), { once: true });
                }

                const observer = new MutationObserver(handleTooltips);
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
                patchSearchInput();

                loadPinyinPro()
                    .then(pinyinFn => {
                        if (!pinyinFn) return;
                        let retries = 0;
                        const tryInject = () => {
                            const rows = document.querySelectorAll('[data-client-table-target="row"]');
                            const hasZh = rows.length > 0 &&
                                [...rows].some(r => CJK_RE.test(r.querySelector('[data-key="name"] span')?.textContent || ''));
                            if (hasZh) {
                                injectPinyinIntoTable(pinyinFn);
                            } else if (++retries < PINYIN_RETRY_LIMIT) {
                                setTimeout(tryInject, PINYIN_RETRY_MS);
                            }
                        };
                        if (document.readyState === 'complete') tryInject();
                        else window.addEventListener('load', tryInject, { once: true });
                    })
                    .catch(e => console.warn('pinyin-pro load failed:', e));
            })
            .catch(error => {
                console.error('Error fetching augmentTranslations:', error);
            });
    }

    fetchAugmentData();
    console.log('running augments translator');
})();
