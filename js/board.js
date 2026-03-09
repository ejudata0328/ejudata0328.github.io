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

    function getFirebaseViews(boardName, postId, callback) {
        if (!db) return callback(null);
        db.ref('views/' + boardName + '/' + postId).once('value', function (snap) {
            callback(snap.val());
        });
    }

    function incrementViews(boardName, postId, callback) {
        if (!db) return callback(null);
        var ref = db.ref('views/' + boardName + '/' + postId);
        ref.transaction(function (current) {
            return (current || 0) + 1;
        }, function (error, committed, snapshot) {
            if (!error && committed) {
                callback(snapshot.val());
            }
        });
    }

    function initFirebaseViews(boardName, posts) {
        if (!db) return;
        posts.forEach(function (post) {
            var ref = db.ref('views/' + boardName + '/' + post.id);
            ref.once('value', function (snap) {
                if (snap.val() === null) {
                    ref.set(post.views || 0);
                }
            });
        });
    }

    function loadBoard(boardName) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:40px 0;"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</p>';
        var jsonPath = 'data/' + boardName + '.json';

        fetch(jsonPath)
            .then(function (res) { return res.json(); })
            .then(function (posts) {
                initFirebaseViews(boardName, posts);
                renderBoard(boardName, posts);
            })
            .catch(function () {
                container.innerHTML = '<p style="color:#999;text-align:center;padding:40px 0;">게시글을 불러올 수 없습니다.</p>';
            });
    }

    function renderBoard(boardName, posts) {
        var html = '<table class="board-table">';
        html += '<thead><tr><th>번호</th><th>제목</th><th>첨부</th><th>작성일</th><th>조회수</th></tr></thead>';
        html += '<tbody>';
        posts.forEach(function (post) {
            var hasFile = post.attachments && post.attachments.length > 0;
            html += '<tr data-id="' + post.id + '">';
            html += '<td>' + post.id + '</td>';
            html += '<td><a href="#">' + escapeHtml(post.title) + '</a></td>';
            html += '<td class="td-attach">' + (hasFile ? '<i class="fas fa-paperclip" aria-hidden="true"></i>' : '') + '</td>';
            html += '<td>' + post.date + '</td>';
            html += '<td class="td-views">' + post.views.toLocaleString() + '</td>';
            html += '</tr>';
        });
        html += '</tbody></table>';

        html += '<div class="board-overlay" id="boardOverlay">';
        html += '  <div class="board-modal">';
        html += '    <div class="board-modal-header">';
        html += '      <h4><i class="fas fa-' + boardIcon + '" aria-hidden="true"></i> ' + escapeHtml(boardLabel) + '</h4>';
        html += '      <button class="board-modal-close" id="btnCloseModal"><i class="fas fa-times" aria-hidden="true"></i></button>';
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

        // Firebase 조회수를 테이블에 반영
        posts.forEach(function (post) {
            getFirebaseViews(boardName, post.id, function (fbViews) {
                if (fbViews !== null) {
                    var row = container.querySelector('tr[data-id="' + post.id + '"]');
                    if (row) {
                        row.querySelector('.td-views').textContent = fbViews.toLocaleString();
                    }
                }
            });
        });

        var overlay = document.getElementById('boardOverlay');

        document.getElementById('btnCloseModal').addEventListener('click', closeModal);
        document.getElementById('btnListModal').addEventListener('click', closeModal);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

        container.querySelectorAll('.board-table tbody tr').forEach(function (row) {
            row.addEventListener('click', function (e) {
                e.preventDefault();
                var id = parseInt(row.dataset.id, 10);
                var post = posts.find(function (p) { return p.id === id; });
                if (post) openModal(post, row);
            });
        });

        function openModal(post, row) {
            document.getElementById('modalTitle').textContent = post.title;
            document.getElementById('modalDate').textContent = post.date;
            document.getElementById('modalContent').innerHTML = post.content;

            // Firebase 조회수 +1 증가
            incrementViews(boardName, post.id, function (newCount) {
                if (newCount !== null) {
                    document.getElementById('modalViews').textContent = newCount.toLocaleString();
                    if (row) {
                        row.querySelector('.td-views').textContent = newCount.toLocaleString();
                    }
                } else {
                    document.getElementById('modalViews').textContent = post.views.toLocaleString();
                }
            });

            // Firebase 없을 경우 fallback
            if (!db) {
                document.getElementById('modalViews').textContent = post.views.toLocaleString();
            }

            var attachEl = document.getElementById('modalAttachments');
            if (post.attachments && post.attachments.length > 0) {
                var attachHtml = '<div class="attach-section">';
                attachHtml += '<h5><i class="fas fa-paperclip" aria-hidden="true"></i> 첨부파일</h5>';
                attachHtml += '<ul class="attach-list">';
                post.attachments.forEach(function (file) {
                    attachHtml += '<li>';
                    attachHtml += '<a href="' + file.url + '" target="_blank" rel="noopener noreferrer" download>';
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

            overlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            overlay.classList.remove('show');
            document.body.style.overflow = '';
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
})();
