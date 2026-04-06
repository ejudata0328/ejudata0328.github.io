/**
 * EJUDATA Board Loader
 * JSON 데이터 기반 게시판 렌더링 모듈 + Firebase 조회수 연동
 */
(function () {
    var container = document.getElementById('boardContainer');
    if (!container) return;

    var boardIcon = container.dataset.icon || 'folder-open';
    var boardLabel = container.dataset.label || '게시판';
    var db = typeof ejuFirebaseDB !== 'undefined' ? ejuFirebaseDB : null;
    var lastFocusedRow = null;

    // localStorage 백업 (Firebase 쓰기가 차단된 경로를 위한 fallback)
    function getLocalViews(boardName, postId) {
        try {
            var key = 'views_' + boardName + '_' + postId;
            var v = localStorage.getItem(key);
            return v ? parseInt(v, 10) : null;
        } catch (e) { return null; }
    }
    function setLocalViews(boardName, postId, value) {
        try {
            localStorage.setItem('views_' + boardName + '_' + postId, String(value));
        } catch (e) {}
    }

    function getFirebaseViews(boardName, postId, callback) {
        if (!db) return callback(null);
        try {
            db.ref('views/' + boardName + '/' + postId).once('value', function (snap) {
                callback(snap.val());
            }, function () { callback(null); });
        } catch (e) { callback(null); }
    }

    function incrementViews(boardName, postId, baseViews, callback) {
        if (!db) {
            // Firebase 없음 → localStorage fallback
            var local = getLocalViews(boardName, postId);
            var next = (local !== null ? local : (baseViews || 0)) + 1;
            setLocalViews(boardName, postId, next);
            return callback(next);
        }
        var ref = db.ref('views/' + boardName + '/' + postId);
        var called = false;
        ref.transaction(function (current) {
            return (current || 0) + 1;
        }, function (error, committed, snapshot) {
            if (called) return;
            called = true;
            if (!error && committed && snapshot) {
                callback(snapshot.val());
            } else {
                // Firebase 쓰기 실패 → localStorage fallback
                var local = getLocalViews(boardName, postId);
                var next = (local !== null ? local : (baseViews || 0)) + 1;
                setLocalViews(boardName, postId, next);
                callback(next);
            }
        });
    }

    function initFirebaseViews(boardName, posts) {
        if (!db) return;
        posts.forEach(function (post) {
            try {
                var ref = db.ref('views/' + boardName + '/' + post.id);
                ref.once('value', function (snap) {
                    if (snap.val() === null) {
                        ref.set(post.views || 0);
                    }
                }, function () {});
            } catch (e) {}
        });
    }

    function loadBoard(boardName) {
        container.setAttribute('aria-busy', 'true');
        container.innerHTML = '<p class="board-loading"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i> 불러오는 중...</p>';
        var jsonPath = 'data/' + boardName + '.json';

        fetch(jsonPath)
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (posts) {
                initFirebaseViews(boardName, posts);
                renderBoard(boardName, posts);
            })
            .catch(function () {
                container.innerHTML = '<p class="board-loading"><i class="fas fa-exclamation-circle" aria-hidden="true"></i> 게시글을 불러올 수 없습니다. <button class="btn-retry" onclick="location.reload()">다시 시도</button></p>';
            })
            .finally(function () {
                container.setAttribute('aria-busy', 'false');
            });
    }

    function renderBoard(boardName, posts) {
        // Empty state
        if (!posts || posts.length === 0) {
            container.innerHTML = '<div class="board-empty"><i class="fas fa-inbox" aria-hidden="true"></i><p>등록된 게시글이 없습니다.</p></div>';
            return;
        }

        var html = '<div class="board-search">';
        html += '  <div class="board-search-input-wrap">';
        html += '    <i class="fas fa-search board-search-icon" aria-hidden="true"></i>';
        html += '    <input type="text" id="boardSearchInput" class="board-search-input" placeholder="제목 또는 내용으로 검색..." aria-label="게시판 검색">';
        html += '    <button type="button" id="boardSearchClear" class="board-search-clear" aria-label="검색어 지우기" style="display:none;"><i class="fas fa-times" aria-hidden="true"></i></button>';
        html += '  </div>';
        html += '  <div class="board-search-result" id="boardSearchResult" aria-live="polite"></div>';
        html += '</div>';

        html += '<table class="board-table">';
        html += '<caption class="sr-only">' + escapeHtml(boardLabel) + ' 게시판 목록</caption>';
        html += '<thead><tr><th scope="col">번호</th><th scope="col">제목</th><th scope="col">첨부</th><th scope="col">작성일</th><th scope="col">조회수</th></tr></thead>';
        html += '<tbody id="boardTbody">';
        posts.forEach(function (post) {
            var hasFile = post.attachments && post.attachments.length > 0;
            html += '<tr data-id="' + post.id + '" data-title="' + escapeHtml(post.title).toLowerCase() + '" data-content="' + escapeHtml(stripHtml(post.content || '')).toLowerCase() + '" tabindex="0" role="button" aria-label="' + escapeHtml(post.title) + ' 상세보기">';
            html += '<td>' + post.id + '</td>';
            html += '<td><a href="#">' + escapeHtml(post.title) + '</a></td>';
            html += '<td class="td-attach">' + (hasFile ? '<i class="fas fa-paperclip" aria-hidden="true"></i><span class="sr-only">첨부파일 있음</span>' : '') + '</td>';
            html += '<td>' + post.date + '</td>';
            html += '<td class="td-views">' + post.views.toLocaleString() + '</td>';
            html += '</tr>';
        });
        html += '</tbody></table>';
        html += '<div class="board-no-result" id="boardNoResult" style="display:none;"><i class="fas fa-search" aria-hidden="true"></i><p>검색 결과가 없습니다.</p></div>';

        html += '<div class="board-overlay" id="boardOverlay" role="dialog" aria-modal="true" aria-labelledby="modalTitle">';
        html += '  <div class="board-modal">';
        html += '    <div class="board-modal-header">';
        html += '      <h4><i class="fas fa-' + boardIcon + '" aria-hidden="true"></i> ' + escapeHtml(boardLabel) + '</h4>';
        html += '      <button class="board-modal-close" id="btnCloseModal" aria-label="모달 닫기"><i class="fas fa-times" aria-hidden="true"></i></button>';
        html += '    </div>';
        html += '    <div class="board-modal-body">';
        html += '      <div class="board-detail-title" id="modalTitle"></div>';
        html += '      <div class="board-detail-meta">';
        html += '        <span><i class="fas fa-calendar-alt" aria-hidden="true"></i> <span id="modalDate"></span></span>';
        html += '        <span><i class="fas fa-eye" aria-hidden="true"></i> 조회 <span id="modalViews"></span></span>';
        html += '      </div>';
        html += '      <div class="board-detail-content" id="modalContent"></div>';
        html += '      <div class="board-detail-attachments" id="modalAttachments"></div>';
        html += '    </div>';
        html += '    <div class="board-modal-footer">';
        html += '      <button class="btn-list" id="btnListModal"><i class="fas fa-list" aria-hidden="true"></i> 목록으로</button>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';

        container.innerHTML = html;

        // Firebase/localStorage 조회수를 테이블에 반영
        posts.forEach(function (post) {
            getFirebaseViews(boardName, post.id, function (fbViews) {
                var views = fbViews;
                if (views === null) {
                    // Firebase 값 없음 → localStorage 확인
                    var local = getLocalViews(boardName, post.id);
                    if (local !== null) views = local;
                }
                if (views !== null) {
                    var row = container.querySelector('tr[data-id="' + post.id + '"]');
                    if (row) {
                        row.querySelector('.td-views').textContent = views.toLocaleString();
                    }
                }
            });
        });

        var overlay = document.getElementById('boardOverlay');

        document.getElementById('btnCloseModal').addEventListener('click', closeModal);
        document.getElementById('btnListModal').addEventListener('click', closeModal);

        // Overlay click to close
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal();
        });

        // 검색 기능
        var searchInput = document.getElementById('boardSearchInput');
        var searchClear = document.getElementById('boardSearchClear');
        var searchResult = document.getElementById('boardSearchResult');
        var noResult = document.getElementById('boardNoResult');
        var tbody = document.getElementById('boardTbody');
        var totalCount = posts.length;

        function runSearch() {
            var query = searchInput.value.trim().toLowerCase();
            var rows = tbody.querySelectorAll('tr');
            var matchCount = 0;
            rows.forEach(function (row) {
                if (!query) {
                    row.style.display = '';
                    matchCount++;
                } else {
                    var title = row.dataset.title || '';
                    var content = row.dataset.content || '';
                    if (title.indexOf(query) !== -1 || content.indexOf(query) !== -1) {
                        row.style.display = '';
                        matchCount++;
                    } else {
                        row.style.display = 'none';
                    }
                }
            });
            // UI 업데이트
            searchClear.style.display = query ? 'flex' : 'none';
            if (query) {
                searchResult.textContent = '검색 결과: ' + matchCount + '건 / 전체 ' + totalCount + '건';
                searchResult.style.display = 'block';
            } else {
                searchResult.textContent = '';
                searchResult.style.display = 'none';
            }
            noResult.style.display = (query && matchCount === 0) ? 'block' : 'none';
        }

        searchInput.addEventListener('input', runSearch);
        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                searchInput.value = '';
                runSearch();
            }
        });
        searchClear.addEventListener('click', function () {
            searchInput.value = '';
            runSearch();
            searchInput.focus();
        });

        container.querySelectorAll('.board-table tbody tr').forEach(function (row) {
            function handleOpen(e) {
                e.preventDefault();
                var id = parseInt(row.dataset.id, 10);
                var post = posts.find(function (p) { return p.id === id; });
                if (post) {
                    lastFocusedRow = row;
                    openModal(post, row);
                }
            }
            row.addEventListener('click', handleOpen);
            row.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpen(e);
                }
            });
        });

        function openModal(post, row) {
            document.getElementById('modalTitle').textContent = post.title;
            document.getElementById('modalDate').textContent = post.date;
            document.getElementById('modalContent').innerHTML = post.content;

            // 조회수 +1 증가 (Firebase 실패 시 localStorage fallback)
            incrementViews(boardName, post.id, post.views || 0, function (newCount) {
                if (newCount !== null) {
                    document.getElementById('modalViews').textContent = newCount.toLocaleString();
                    if (row) {
                        row.querySelector('.td-views').textContent = newCount.toLocaleString();
                    }
                } else {
                    document.getElementById('modalViews').textContent = (post.views || 0).toLocaleString();
                }
            });

            var attachEl = document.getElementById('modalAttachments');
            if (post.attachments && post.attachments.length > 0) {
                var attachHtml = '<div class="attach-section">';
                attachHtml += '<h5><i class="fas fa-paperclip" aria-hidden="true"></i> 첨부파일</h5>';
                attachHtml += '<ul class="attach-list">';
                post.attachments.forEach(function (file) {
                    attachHtml += '<li>';
                    attachHtml += '<a href="#" class="attach-download" data-url="' + file.url + '" data-name="' + escapeHtml(file.name) + '">';
                    attachHtml += '<i class="fas fa-file-download" aria-hidden="true"></i> ';
                    attachHtml += escapeHtml(file.name);
                    if (file.size) attachHtml += ' <span class="attach-size">(' + file.size + ')</span>';
                    attachHtml += '</a></li>';
                });
                attachHtml += '</ul></div>';
                attachEl.innerHTML = attachHtml;
            } else {
                attachEl.innerHTML = '';
            }

            // 첨부파일 다운로드 이벤트 (fetch + Blob으로 한글 파일명 다운로드)
            attachEl.querySelectorAll('.attach-download').forEach(function (link) {
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    var url = link.dataset.url;
                    var name = link.dataset.name;
                    if (!url || url === '#') return;

                    // 로컬 파일(same-origin): fetch + Blob으로 한글 파일명 다운로드
                    if (url.startsWith('downloads/')) {
                        link.classList.add('downloading');
                        link.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> 다운로드 중...';
                        fetch(url)
                            .then(function (res) {
                                if (!res.ok) throw new Error('HTTP ' + res.status);
                                return res.blob();
                            })
                            .then(function (blob) {
                                var a = document.createElement('a');
                                a.href = URL.createObjectURL(blob);
                                a.download = name;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(a.href);
                            })
                            .catch(function () {
                                alert('파일 다운로드에 실패했습니다. 잠시 후 다시 시도해 주세요.');
                            })
                            .finally(function () {
                                link.classList.remove('downloading');
                                link.innerHTML = '<i class="fas fa-file-download" aria-hidden="true"></i> ' + escapeHtml(name);
                            });
                    } else {
                        // 외부 URL(cross-origin): 기존 방식 fallback
                        var msg = '파일명: ' + name + '\n\n다운로드 후 위 파일명으로 저장해 주세요.\n다운로드를 진행하시겠습니까?';
                        if (confirm(msg)) {
                            window.location.href = url;
                        }
                    }
                });
            });

            overlay.classList.add('show');
            document.body.style.overflow = 'hidden';

            // Focus trap: move focus to close button
            var closeBtn = document.getElementById('btnCloseModal');
            closeBtn.focus();

            // ESC key handler
            document.addEventListener('keydown', handleEscKey);
        }

        function handleEscKey(e) {
            if (e.key === 'Escape') closeModal();
        }

        function closeModal() {
            overlay.classList.remove('show');
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleEscKey);
            // Restore focus to the row that opened the modal
            if (lastFocusedRow) {
                lastFocusedRow.focus();
                lastFocusedRow = null;
            }
        }
    }

    // Product tab switching
    var tabs = document.querySelectorAll('.product-tab');
    if (tabs.length > 0) {
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabs.forEach(function (t) { t.classList.remove('active'); });
                tab.classList.add('active');
                var newBoard = tab.dataset.board;
                container.dataset.board = newBoard;
                loadBoard(newBoard);
            });
        });
    }

    // Initial load
    loadBoard(container.dataset.board);

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function stripHtml(html) {
        var div = document.createElement('div');
        div.innerHTML = html;
        return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
    }
})();
