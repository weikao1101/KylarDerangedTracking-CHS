// KylarDerangedTracking (CHS variant) - fixes a vanilla layout bug in the NPC relationship
// stat box. Vanilla CSS only ever draws a divider line below the FIRST row of stats
// (".relation-stat-list > :nth-child(-n + 2) { border-bottom: ... }"), because vanilla
// never expected an "important" NPC to show more than ~4 stats at once. Our mod adds a
// 5th stat ("deranged") for Kylar, which creates a 3rd row with no divider above it.
// This script recomputes which stat blocks are NOT in the final (possibly incomplete)
// row of the 2-column grid, and gives those a border-bottom to match vanilla's own style.
;(function () {
    function fixRelationStatDividers() {
        document.querySelectorAll('.relation-stat-list:not(.quick-stats)').forEach(function (list) {
            var items = Array.prototype.filter.call(list.children, function (el) {
                return el.nodeType === 1;
            });
            var total = items.length;
            if (total < 3) return;
            var lastRowSize = (total % 2 === 0) ? 2 : 1;
            var boundary = total - lastRowSize;
            items.forEach(function (el, i) {
                el.style.borderBottom = (i < boundary) ? 'solid 1px var(--750)' : '';
            });
        });
    }

    // The "deranged" stat reuses vanilla's own love-heart icon files (guaranteed to load,
    // unlike a brand new custom PNG we tried earlier which silently failed in-game) and
    // gets its distinct purple color from a CSS filter applied here, keyed off its
    // Chinese label so it doesn't affect the real "love" stat's own red heart.
    // (CHS variant: label text is Simplified Chinese "病态", matching Patch 7's
    // build_patches_chs.py output - must stay in sync with that file's name field.)
    function tintDerangedIcon() {
        document.querySelectorAll('.relation-stat-block').forEach(function (block) {
            var label = block.querySelector('label');
            if (!label || label.textContent.trim() !== '病态') return;
            var activeImg = block.querySelector('.active-icon-img');
            if (activeImg) activeImg.style.filter = 'hue-rotate(280deg) saturate(1.3)';
        });
    }

    // Vanilla caps how many past moments SugarCube keeps around (Config.history.maxStates,
    // default 5 - see "game/01-config/sugarcubeConfig.js"), which is fine for normal play
    // but our forced Kylar encounter (goto-based, no way to decline at the first step) can
    // easily eat through 5 moments before the player gets a chance to want to back out,
    // permanently losing the "before this all started" moment. This just raises the floor
    // so there's enough headroom to still rewind past the whole encounter; DoL's own
    // cheats menu already allows the player to set this as high as 20, so 15 stays well
    // within a range the game itself considers safe.
    function ensureHistoryDepth() {
        if (typeof Config !== 'undefined' && Config.history && Config.history.maxStates < 15) {
            Config.history.maxStates = 15;
        }
    }

    // Belt-and-suspenders: vanilla's UI bar recomputes whether the backward button is
    // disabled via a ":historyupdate.ui-bar" jQuery event handler. If that ever doesn't
    // fire after one of our forced <<goto>> transitions (goto's Wikifier.stopWikify=2
    // interrupts the normal rendering pipeline), the button can be left stuck showing
    // whatever disabled state it had from before - clickable-looking but doing nothing.
    // This recomputes the same condition vanilla uses and re-applies it directly.
    function fixHistoryBackwardButton() {
        if (typeof State === 'undefined' || typeof Config === 'undefined') return;
        var btn = document.getElementById('history-backward');
        if (!btn) return;
        var prev = State.length >= 2 ? State.peek(1) : null;
        var disableBack = State.length < 2 || (prev && prev.title === Config.passages.start);
        btn.setAttribute('aria-disabled', disableBack ? 'true' : 'false');
    }

    function fixKylarStatUi() {
        try {
            fixRelationStatDividers();
            tintDerangedIcon();
            ensureHistoryDepth();
            fixHistoryBackwardButton();
        } catch (e) {
            // Never let a DOM-shape surprise here throw out of the observer callback and
            // spam errors on every passage change.
            console.error('[KylarDerangedTracking-CHS] fixKylarStatUi() error:', e);
        }
    }

    // NOTE (2.0.11): originally hooked SugarCube's ":passageend" event via
    // jQuery(document).on(...), but that threw "$(...).on(...) is not a function" in the
    // live game - whatever exposes jQuery/$ isn't reliably available to a scriptFileList
    // file at the point it runs. Using a plain MutationObserver instead avoids depending
    // on jQuery entirely: it re-runs our fix any time the passage content changes.
    // The leading ";" above and the try/catch here are defensive: this file may get
    // concatenated with other mods' scripts into one combined <script>, so this guards
    // against a missing semicolon in whatever runs immediately before us, and stops any
    // error in here from being blamed on / breaking whatever runs immediately after us.
    try {
        ensureHistoryDepth();
        fixKylarStatUi();
        var _kylarUiObserver = new MutationObserver(function () {
            fixKylarStatUi();
        });
        var _kylarUiTarget = document.getElementById('story') || document.body;
        if (_kylarUiTarget) {
            _kylarUiObserver.observe(_kylarUiTarget, { childList: true, subtree: true });
        }
    } catch (e) {
        console.error('[KylarDerangedTracking-CHS] setup error:', e);
    }
})();
